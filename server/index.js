const dotenv = require('dotenv')
dotenv.config()

const express = require('express')
const cors = require('cors')
const http = require('http')
const crypto = require('crypto')
const { Server } = require('socket.io')
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod')
const { z } = require('zod')

const ALLOWED_ORIGIN = process.env.CLIENT_URL || "http://localhost:3000"

const supabaseAdmin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null

const PAYWAY_MERCHANT_ID = process.env.PAYWAY_MERCHANT_ID
const PAYWAY_API_KEY = process.env.PAYWAY_API_KEY
const PAYWAY_BASE_URL = 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments'
const PAYWAY_IS_SANDBOX = PAYWAY_BASE_URL.includes('sandbox')

const anthropic =
  process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here'
    ? new Anthropic()
    : null

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(cors({ origin: ALLOWED_ORIGIN }))
app.use(express.json({ limit: '10mb' }))
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Luvibooth server is running!! 🎉' })
})

// Real vision-based photo analysis for frame recommendations. The API key
// must stay server-side, so the client sends up to a couple of captured
// photos here and gets back a structured mood/occasion classification —
// replacing the old client-side pixel-color-averaging heuristic, which had
// no actual understanding of photo content (couldn't tell "cute" from
// "moody", let alone notice something like a Christmas sweater in frame).
const PhotoAnalysisSchema = z.object({
  mood: z
    .enum(['cute', 'cool', 'warm-bright', 'warm-moody', 'monochrome', 'pastel', 'neutral'])
    .describe('The single best-matching overall aesthetic/vibe of the photo(s).'),
  occasion: z
    .enum(['christmas', 'none'])
    .describe('A specific seasonal/holiday theme visibly present in the photo (e.g. Christmas decorations, santa hats, ugly sweaters, candy canes), or "none" if nothing like that is visible.'),
})

const dataUrlToImageBlock = (dataUrl) => {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } }
}

app.post('/analyze-photo', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({ error: 'Photo analysis is not configured on this server yet.' })
  }

  const { photos } = req.body
  if (!Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: 'No photos provided.' })
  }

  const imageBlocks = photos.slice(0, 2).map(dataUrlToImageBlock).filter(Boolean)
  if (imageBlocks.length === 0) {
    return res.status(400).json({ error: 'Could not read the provided photos.' })
  }

  try {
    const response = await anthropic.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: 'Classify the overall mood and any holiday occasion visible in this photo booth picture.',
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(PhotoAnalysisSchema) },
    })

    if (!response.parsed_output) {
      return res.status(502).json({ error: 'Could not analyze the photo.' })
    }
    console.log('Photo analysis result:', response.parsed_output)
    res.json(response.parsed_output)
  } catch (err) {
    console.error('Photo analysis error:', err.message)
    res.status(500).json({ error: 'Could not analyze the photo.' })
  }
})

// ABA PayWay (sandbox) KHQR checkout. amountUsd/description/kind/planName/
// coinAmount are trusted from the client here since these are fixed catalog
// items (coin packs, subscription plans), not arbitrary user-entered amounts
// — same trust boundary the old Stripe endpoint used. The actual crediting
// (coins/plan) only happens later, server-side, once PayWay confirms the
// payment in /payway-transaction-status/:tranId — never on the client's say-so.
const paywayReqTime = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  )
}

const genTranId = () =>
  `LB${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()

const creditCoins = async (userId, amount, title) => {
  if (!amount) return
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('coins')
    .eq('id', userId)
    .single()
  if (fetchError) throw fetchError

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ coins: (profile?.coins || 0) + amount })
    .eq('id', userId)
  if (updateError) throw updateError

  const { error: txError } = await supabaseAdmin
    .from('coin_transactions')
    .insert({ user_id: userId, title, amount })
  if (txError) throw txError
}

// Records the pending transaction so /payway-transaction-status/:tranId can
// later credit the user once PayWay confirms payment.
const insertPendingTransaction = async ({ tranId, userId, kind, planName, coinAmount, amountUsd, description }) => {
  const { error: insertError } = await supabaseAdmin.from('payway_transactions').insert({
    tran_id: tranId,
    user_id: userId,
    kind,
    plan_name: kind === 'plan' ? planName : null,
    coin_amount: coinAmount || 0,
    amount_usd: amountUsd,
    description: description || null,
    status: 'pending',
  })
  if (insertError) throw insertError
}

// Credits whatever a pending transaction paid for (plan and/or coins) and
// marks it completed. Only ever called once PayWay has confirmed payment, or
// from the sandbox-only KHQR simulation below.
const completeTransaction = async (txRow) => {
  if (txRow.kind === 'plan') {
    const renewDate = new Date()
    renewDate.setMonth(renewDate.getMonth() + 1)
    const { error: planError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: txRow.plan_name,
        plan_renew_date: renewDate.toISOString().slice(0, 10),
        plan_cancelled: false,
      })
      .eq('id', txRow.user_id)
    if (planError) throw planError
    if (txRow.coin_amount > 0) {
      await creditCoins(txRow.user_id, txRow.coin_amount, `${txRow.plan_name} subscription bonus`)
    }
  } else {
    await creditCoins(txRow.user_id, txRow.coin_amount, txRow.description || 'Bought coins')
  }

  await supabaseAdmin
    .from('payway_transactions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('tran_id', txRow.tran_id)
}

// Builds the signed field set for a Purchase API request (card flow). The
// client POSTs these fields directly into an iframe, since PayWay responds
// with an HTML checkout page, not JSON.
const buildPaywayPurchaseFields = async ({ userId, amountUsd, description, kind, planName, coinAmount, paymentOption }) => {
  const reqTime = paywayReqTime()
  const tranId = genTranId()
  const amount = amountUsd.toFixed(2)
  const items = Buffer.from(
    JSON.stringify([{ name: description || kind, quantity: 1, price: Number(amount) }])
  ).toString('base64')
  const returnUrl = Buffer.from(`${ALLOWED_ORIGIN}/pricing`).toString('base64')
  const type = 'purchase'
  const currency = 'USD'
  const lifetime = '30' // minutes the checkout stays valid for

  const b4hash =
    reqTime + PAYWAY_MERCHANT_ID + tranId + amount + items + '' + '' + '' + '' + '' +
    type + paymentOption + returnUrl + '' + '' + '' + currency + '' + '' + '' + lifetime + '' + '' + ''
  const hash = crypto.createHmac('sha512', PAYWAY_API_KEY).update(b4hash).digest('base64')

  await insertPendingTransaction({ tranId, userId, kind, planName, coinAmount, amountUsd: Number(amount), description })

  return {
    tranId,
    fields: {
      req_time: reqTime,
      merchant_id: PAYWAY_MERCHANT_ID,
      tran_id: tranId,
      amount,
      items,
      type,
      payment_option: paymentOption,
      return_url: returnUrl,
      currency,
      lifetime,
      // Not part of the hash. Without this, PayWay silently falls back to
      // returning the KHQR JSON response even when payment_option is
      // 'cards' — confirmed by testing directly against the sandbox.
      ...(paymentOption === 'cards' ? { payment_gate: '0' } : {}),
      hash,
    },
  }
}

const validatePaymentBody = (body) => {
  const { userId, amountUsd, kind } = body
  return userId && Number.isFinite(amountUsd) && amountUsd > 0 && ['plan', 'coins'].includes(kind)
}

app.post('/create-payway-payment', async (req, res) => {
  if (!PAYWAY_MERCHANT_ID || !PAYWAY_API_KEY || !supabaseAdmin) {
    return res.status(503).json({ error: 'Payments are not configured on this server yet.' })
  }
  if (!validatePaymentBody(req.body)) {
    return res.status(400).json({ error: 'Invalid payment request.' })
  }

  // PayWay QR API (/generate-qr): JSON in, JSON out. The hash covers every
  // field below in exactly this order, empty strings included.
  // https://developer.payway.com.kh/qr-api-14530840e0
  try {
    const { userId, amountUsd, description, kind, planName, coinAmount } = req.body
    const tranId = genTranId()
    const amount = Number(amountUsd.toFixed(2))
    const fields = {
      req_time: paywayReqTime(),
      merchant_id: PAYWAY_MERCHANT_ID,
      tran_id: tranId,
      amount,
      items: Buffer.from(JSON.stringify([{ name: description || kind, quantity: 1, price: amount }])).toString('base64'),
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      purchase_type: 'purchase',
      payment_option: 'abapay_khqr',
      callback_url: '',
      return_deeplink: '',
      currency: 'USD',
      custom_fields: '',
      return_params: '',
      payout: '',
      lifetime: 6, // minutes; PayWay's minimum is 3
      qr_image_template: 'template3_color',
    }
    const hash = crypto
      .createHmac('sha512', PAYWAY_API_KEY)
      .update(Object.values(fields).join(''))
      .digest('base64')

    await insertPendingTransaction({ tranId, userId, kind, planName, coinAmount, amountUsd: amount, description })

    const paywayRes = await fetch(`${PAYWAY_BASE_URL}/generate-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, hash }),
    })
    const paywayData = await paywayRes.json()

    if (String(paywayData?.status?.code) !== '0' || !paywayData.qrString) {
      console.error('PayWay generate-qr error:', paywayData)
      await supabaseAdmin.from('payway_transactions').delete().eq('tran_id', tranId)
      return res.status(502).json({ error: 'Payment provider rejected the request.' })
    }

    res.json({
      tranId,
      qrString: paywayData.qrString,
      amount: paywayData.amount,
      currency: paywayData.currency,
      lifetimeMinutes: fields.lifetime,
    })
  } catch (err) {
    console.error('PayWay error:', err.message)
    res.status(500).json({ error: 'Could not start payment.' })
  }
})

// Card payments get PayWay's own hosted checkout page back as raw HTML
// (not JSON), meant to be rendered in an iframe — so unlike the QR flow
// above, the browser must POST these signed fields directly to PayWay
// itself; this endpoint only prepares and signs them.
app.post('/create-payway-checkout-fields', async (req, res) => {
  if (!PAYWAY_MERCHANT_ID || !PAYWAY_API_KEY || !supabaseAdmin) {
    return res.status(503).json({ error: 'Payments are not configured on this server yet.' })
  }
  if (!validatePaymentBody(req.body)) {
    return res.status(400).json({ error: 'Invalid payment request.' })
  }

  try {
    const { tranId, fields } = await buildPaywayPurchaseFields({ ...req.body, paymentOption: 'cards' })
    res.json({ tranId, fields, purchaseUrl: `${PAYWAY_BASE_URL}/purchase` })
  } catch (err) {
    console.error('PayWay error:', err.message)
    res.status(500).json({ error: 'Could not start payment.' })
  }
})

app.get('/payway-transaction-status/:tranId', async (req, res) => {
  if (!PAYWAY_MERCHANT_ID || !PAYWAY_API_KEY || !supabaseAdmin) {
    return res.status(503).json({ error: 'Payments are not configured on this server yet.' })
  }

  const { tranId } = req.params

  try {
    const { data: txRow, error: fetchError } = await supabaseAdmin
      .from('payway_transactions')
      .select('*')
      .eq('tran_id', tranId)
      .single()
    if (fetchError || !txRow) return res.status(404).json({ error: 'Transaction not found.' })

    if (txRow.status !== 'pending') {
      return res.json({ status: txRow.status })
    }

    const reqTime = paywayReqTime()
    const b4hash = reqTime + PAYWAY_MERCHANT_ID + tranId
    const hash = crypto.createHmac('sha512', PAYWAY_API_KEY).update(b4hash).digest('base64')

    const checkRes = await fetch(`${PAYWAY_BASE_URL}/check-transaction-2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ req_time: reqTime, merchant_id: PAYWAY_MERCHANT_ID, tran_id: tranId, hash }),
    })
    const checkData = await checkRes.json()
    const paymentStatusCode = String(checkData?.data?.payment_status_code ?? checkData?.payment_status_code ?? '')

    if (paymentStatusCode === '0') {
      await completeTransaction(txRow)
      return res.json({ status: 'completed' })
    }

    if (['3', '7'].includes(paymentStatusCode)) {
      await supabaseAdmin.from('payway_transactions').update({ status: 'failed' }).eq('tran_id', tranId)
      return res.json({ status: 'failed' })
    }

    res.json({ status: 'pending' })
  } catch (err) {
    console.error('PayWay status check error:', err.message)
    res.status(500).json({ error: 'Could not check payment status.' })
  }
})

// Sandbox-only stand-in for a customer actually scanning the KHQR and paying
// in ABA Mobile, which isn't possible against PayWay's sandbox. The checkout
// modal calls this after its demo countdown. Hard-disabled once
// PAYWAY_BASE_URL points at production, since it credits without payment.
app.post('/payway-simulate-khqr-success/:tranId', async (req, res) => {
  if (!PAYWAY_IS_SANDBOX) return res.status(404).json({ error: 'Not found.' })
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Payments are not configured on this server yet.' })
  }

  const { tranId } = req.params

  try {
    const { data: txRow, error: fetchError } = await supabaseAdmin
      .from('payway_transactions')
      .select('*')
      .eq('tran_id', tranId)
      .single()
    if (fetchError || !txRow) return res.status(404).json({ error: 'Transaction not found.' })

    if (txRow.status === 'pending') await completeTransaction(txRow)
    res.json({ status: txRow.status === 'pending' ? 'completed' : txRow.status })
  } catch (err) {
    console.error('PayWay simulate error:', err.message)
    res.status(500).json({ error: 'Could not complete payment.' })
  }
})

// roomCode -> Map(socketId -> displayName)
const rooms = new Map()

const getRoomMembers = (roomCode) => {
  const room = rooms.get(roomCode)
  if (!room) return []
  return Array.from(room.entries()).map(([id, name]) => ({ id, name }))
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', ({ roomCode, name }) => {
    if (!roomCode) return

    if (!rooms.has(roomCode)) rooms.set(roomCode, new Map())
    const room = rooms.get(roomCode)

    if (room.size >= 2 && !room.has(socket.id)) {
      socket.emit('room-full')
      return
    }

    socket.join(roomCode)
    room.set(socket.id, name || 'Guest')
    socket.data.roomCode = roomCode

    io.to(roomCode).emit('room-users', getRoomMembers(roomCode))
  })

  socket.on('webrtc-signal', ({ roomCode, signal }) => {
    if (!roomCode) return
    socket.to(roomCode).emit('webrtc-signal', { signal, from: socket.id })
  })

  socket.on('capture-start', ({ roomCode, delay }) => {
    if (!roomCode) return
    socket.to(roomCode).emit('capture-start', { delay })
  })

  socket.on('frame-select', ({ roomCode, templateId, layoutId }) => {
    if (!roomCode) return
    socket.to(roomCode).emit('frame-select', { templateId, layoutId })
  })

  const leaveCurrentRoom = () => {
    const roomCode = socket.data.roomCode
    if (!roomCode || !rooms.has(roomCode)) return
    const room = rooms.get(roomCode)
    room.delete(socket.id)
    if (room.size === 0) {
      rooms.delete(roomCode)
    } else {
      io.to(roomCode).emit('room-users', getRoomMembers(roomCode))
    }
    socket.data.roomCode = null
  }

  socket.on('leave-room', leaveCurrentRoom)

  socket.on('disconnect', () => {
    leaveCurrentRoom()
    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`)
})
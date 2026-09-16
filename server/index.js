const dotenv = require('dotenv')
dotenv.config()

const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const Stripe = require('stripe')

const ALLOWED_ORIGIN = process.env.CLIENT_URL || "http://localhost:3000"
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

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

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Luvibooth server is running!! 🎉' })
})

// Stripe test-mode checkout. amountCents/currency/description are trusted
// from the client here since these are fixed catalog items (coin packs,
// subscription plans), not arbitrary user-entered amounts.
app.post('/create-payment-intent', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payments are not configured on this server yet.' })
  }

  const { amountCents, currency = 'usd', description } = req.body
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return res.status(400).json({ error: 'Invalid amount.' })
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      description,
      automatic_payment_methods: { enabled: true },
    })
    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('Stripe error:', err.message)
    res.status(500).json({ error: 'Could not start payment.' })
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
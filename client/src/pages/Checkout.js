import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ChevronLeft, Lock, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import khqrIcon from '../assets/payment-icons/khqr-icon.svg'
import abaPayLogo from '../assets/payment-icons/aba-pay-logo.svg'
import khqrWordmark from '../assets/payment-icons/khqr-wordmark.svg'
import bakongLogo from '../assets/payment-icons/bakong-logo.svg'
import visaIcon from '../assets/payment-icons/visa-icon.svg'
import mastercardIcon from '../assets/payment-icons/mastercard-icon.svg'
import jcbIcon from '../assets/payment-icons/jcb-icon.svg'

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'

// PayWay's sandbox can't actually be paid from ABA Mobile, so the KHQR modal
// auto-confirms after this many seconds to demo the full success flow.
const KHQR_SIMULATE_SECONDS = 8

function PaymentModal({ title, onClose, widthClass = 'max-w-md', children }) {
  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`relative w-full ${widthClass} max-h-[95dvh] overflow-y-auto rounded-2xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-dark">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-dark transition"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// A 1:1 rebuild of ABA's reference artwork (aba_resource/paywayqr.svg): the
// ABA PAY logo (196x31) above a 196px white card with a 37px red KHQR header
// and folded corner, merchant name + amount, a dashed divider, then the
// 144px QR with the Bakong mark in the centre and the scan hint below.
function KhqrCard({ qrString, amount }) {
  return (
    <div className="mx-auto w-[196px]">
      <img src={abaPayLogo} alt="ABA PAY" className="w-[196px] h-[31px]" />

      <div className="relative mt-8 overflow-hidden rounded-[17px] bg-white shadow-[0_0_11px_rgba(0,0,0,0.16)]">
        <div className="flex h-[37px] items-center justify-center bg-[#E21A1A]">
          <img src={khqrWordmark} alt="KHQR" className="w-12 h-3" />
        </div>
        <span
          aria-hidden="true"
          className="absolute right-0 top-[37px] h-[17px] w-[17px] bg-[#E21A1A]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
        />

        <div className="h-[68px] px-[26px] pt-[18px]">
          <p className="text-xs leading-[15px] text-black">Luvibooth</p>
          <p className="mt-1 text-xl leading-6 text-black">$ {Number(amount).toFixed(2)}</p>
        </div>

        <svg aria-hidden="true" className="block" width="196" height="1">
          <line x1="0" y1="0.5" x2="196" y2="0.5" stroke="black" strokeOpacity="0.5" strokeWidth="0.5" strokeDasharray="4.14 4.14" />
        </svg>

        <div className="relative flex justify-center py-[26px]">
          <QRCodeSVG value={qrString} size={144} level="H" />
          <img
            src={bakongLogo}
            alt=""
            className="absolute left-1/2 top-1/2 h-[41px] w-[41px] -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      </div>

      <p className="mt-6 text-center text-xs leading-[15px] text-gray-400">
        Scan with ABA Mobile or any KHQR supported banking app
      </p>
    </div>
  )
}

function KhqrPayment({ item, user, tranId, setTranId, setStatus, status, onClose }) {
  const [qr, setQr] = useState(null)
  const [error, setError] = useState(null)
  const [waking, setWaking] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(KHQR_SIMULATE_SECONDS)

  // The free-tier backend spins down after inactivity and can fail or hang
  // on its very first request for up to ~50s while it wakes back up. Retry
  // a few times with a short delay instead of surfacing a scary error on
  // the first attempt, which would otherwise happen on almost every cold
  // demo (e.g. an advisor opening the site fresh).
  useEffect(() => {
    let cancelled = false
    const maxAttempts = 8
    const retryDelayMs = 6000

    const createPayment = async (attempt) => {
      if (cancelled) return
      setWaking(attempt > 1)
      try {
        const res = await fetch(`${SERVER_URL}/create-payway-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            amountUsd: item.amount,
            description: item.description,
            kind: item.type,
            planName: item.planName || null,
            coinAmount: item.coinAmount || 0,
          }),
        })
        // Render's proxy answers with a 502/503 HTML page while the server is
        // still waking up, so treat that like a network failure and retry. Any
        // other non-JSON reply (e.g. an outdated server's "Cannot POST" page)
        // won't fix itself by retrying, so surface it instead of looping.
        const data = await res.json().catch(() => {
          if (res.status >= 500) throw new Error('Server waking up')
          return { error: 'The payment server gave an unexpected response.' }
        })
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          setStatus('error')
        } else {
          setQr(data.qrString)
          setTranId(data.tranId)
          setStatus('waiting')
        }
      } catch (err) {
        if (cancelled) return
        if (attempt < maxAttempts) {
          setTimeout(() => createPayment(attempt + 1), retryDelayMs)
        } else {
          setError('Could not reach the payment server. Please try again in a moment.')
          setStatus('error')
        }
      }
    }

    createPayment(1)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, user])

  // Demo countdown: starts once the QR is on screen, then asks the server to
  // mark this sandbox transaction paid (which credits the coins/plan).
  useEffect(() => {
    if (!qr || !tranId) return
    if (secondsLeft > 0) {
      const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
      return () => clearTimeout(t)
    }
    let cancelled = false
    fetch(`${SERVER_URL}/payway-simulate-khqr-success/${tranId}`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.status === 'completed') {
          setStatus('completed')
        } else {
          setError(data.error || 'Could not complete payment.')
          setStatus('error')
        }
      })
      .catch(() => {
        if (cancelled) return
        setError('Could not reach the payment server. Please try again in a moment.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr, tranId, secondsLeft])

  return (
    <div>
      <p className="text-sm text-gray-400">Waiting for your KHQR payment…</p>

      <PaymentModal title="ABA KHQR" onClose={onClose} widthClass="max-w-xs">
        <div className="px-5 py-6">
          {status === 'error' ? (
            <p className="text-center text-sm text-red-500">{error}</p>
          ) : !qr ? (
            <p className="py-24 text-center text-sm text-gray-400">
              {waking
                ? 'Waking up the payment server… this can take up to a minute after inactivity.'
                : 'Generating your KHQR code…'}
            </p>
          ) : (
            <>
              <KhqrCard qrString={qr} amount={item.amount} />
              <div className="mx-auto mt-6 w-[196px]">
                <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-pink-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${((KHQR_SIMULATE_SECONDS - secondsLeft) / KHQR_SIMULATE_SECONDS) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-gray-400">
                  {secondsLeft > 0
                    ? `Demo · auto-confirms in ${secondsLeft}s`
                    : 'Confirming payment…'}
                </p>
              </div>
            </>
          )}
        </div>
      </PaymentModal>
    </div>
  )
}

function CardPayment({ item, user, setTranId, setStatus, status, onClose }) {
  const [error, setError] = useState(null)
  const [checkoutFields, setCheckoutFields] = useState(null)
  const [frameLoaded, setFrameLoaded] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const createFields = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/create-payway-checkout-fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            amountUsd: item.amount,
            description: item.description,
            kind: item.type,
            planName: item.planName || null,
            coinAmount: item.coinAmount || 0,
          }),
        })
        const data = await res.json()
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          setStatus('error')
          return
        }
        setTranId(data.tranId)
        // PayWay answers this POST with its hosted card form as HTML (no
        // X-Frame-Options), so the hidden form below targets an iframe inside
        // a modal and the user never leaves this page. The parent keeps
        // polling the transaction status and swaps in the result when done.
        setCheckoutFields({ purchaseUrl: data.purchaseUrl, fields: data.fields })
        setStatus('waiting')
      } catch {
        if (cancelled) return
        setError('Could not reach the payment server. Please try again in a moment.')
        setStatus('error')
      }
    }

    createFields()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, user])

  useEffect(() => {
    if (checkoutFields) formRef.current?.submit()
  }, [checkoutFields])

  if (status === 'error') return <p className="text-sm text-red-500">{error}</p>

  return (
    <div>
      <p className="text-sm text-gray-400">Complete your card payment in the secure ABA PayWay window…</p>

      <PaymentModal
        title={
          <>
            <Lock size={14} /> Secure card payment
          </>
        }
        onClose={onClose}
      >
        <div className="relative h-[620px] max-h-[80dvh]">
          {!frameLoaded && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
              Loading ABA PayWay checkout…
            </p>
          )}
          <iframe
            name="payway_card_frame"
            title="ABA PayWay card checkout"
            className="w-full h-full border-0"
            onLoad={() => checkoutFields && setFrameLoaded(true)}
          />
        </div>

        {checkoutFields && (
          <form ref={formRef} action={checkoutFields.purchaseUrl} method="POST" target="payway_card_frame" hidden>
            {Object.entries(checkoutFields.fields).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        )}
      </PaymentModal>
    </div>
  )
}

function RadioMethodRow({ icons, title, subtitle, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? 'w-full flex items-center gap-3 rounded-xl border-2 border-pink-primary bg-pink-50/50 p-3 text-left transition'
          : 'w-full flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 transition'
      }
    >
      <div className="flex items-center gap-1 flex-shrink-0">
        {icons.map((icon, i) => (
          <img key={i} src={icon} alt="" className="h-5 w-auto" />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-dark text-sm">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <span
        className={
          selected
            ? 'w-4 h-4 rounded-full border-2 border-pink-primary flex items-center justify-center flex-shrink-0'
            : 'w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0'
        }
      >
        {selected && <span className="w-2 h-2 rounded-full bg-pink-primary" />}
      </span>
    </button>
  )
}

export default function Checkout() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const item = location.state?.item || null
  const [selectedMethod, setSelectedMethod] = useState('qr')
  const [paying, setPaying] = useState(false)
  const [tranId, setTranId] = useState(null)
  const [status, setStatus] = useState('loading') // loading | waiting | completed | failed | error
  const pollRef = useRef(null)

  useEffect(() => {
    if (!item) navigate('/pricing', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Closing the card modal abandons that attempt (the pending row simply
  // never completes) and lets the user pick a method and pay again.
  const cancelPayment = useCallback(() => {
    setPaying(false)
    setTranId(null)
    setStatus('loading')
  }, [])

  useEffect(() => {
    if (status !== 'waiting' || !tranId) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${SERVER_URL}/payway-transaction-status/${tranId}`)
        const data = await res.json()
        if (data.status === 'completed') {
          clearInterval(pollRef.current)
          setStatus('completed')
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current)
          setStatus('failed')
        }
      } catch {
        // transient network hiccup — keep polling
      }
    }, 3000)

    return () => clearInterval(pollRef.current)
  }, [status, tranId])

  if (!item) return null

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Navbar />

      <section className="flex-1 w-full max-w-4xl mx-auto px-6 py-12">
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          className="mb-6 inline-flex items-center gap-1 rounded-full bg-pink-primary text-white text-sm font-semibold px-4 py-2 hover:opacity-90 transition"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {status === 'completed' ? (
          <div className="max-w-md mx-auto rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-green-600 font-semibold text-lg">Payment successful!</p>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="mt-4 rounded-xl border-2 border-pink-primary text-pink-primary font-semibold px-6 py-2.5 hover:bg-pink-50 transition"
            >
              Back to Pricing
            </button>
          </div>
        ) : status === 'failed' ? (
          <div className="max-w-md mx-auto rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-red-500 font-semibold text-lg">Payment was not completed.</p>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="mt-4 rounded-xl border-2 border-pink-primary text-pink-primary font-semibold px-6 py-2.5 hover:bg-pink-50 transition"
            >
              Back to Pricing
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="rounded-2xl border border-gray-200 shadow-sm p-6">
              <h1 className="font-bold text-dark">Payment method</h1>
              <p className="text-sm text-gray-400 mt-1">Scan with KHQR, or pay by card through ABA PayWay.</p>

              <div className="mt-4 space-y-3">
                <RadioMethodRow
                  icons={[khqrIcon]}
                  title="ABA KHQR"
                  subtitle="Scan to pay with any banking app"
                  selected={selectedMethod === 'qr'}
                  onSelect={() => !paying && setSelectedMethod('qr')}
                />
                <RadioMethodRow
                  icons={[visaIcon, mastercardIcon, jcbIcon]}
                  title="Credit/Debit Card"
                  subtitle="Visa, Mastercard, JCB"
                  selected={selectedMethod === 'card'}
                  onSelect={() => !paying && setSelectedMethod('card')}
                />
              </div>

              {!paying && (
                <p className="mt-4 flex items-start gap-2 text-xs text-gray-400">
                  <Lock size={14} className="mt-0.5 flex-shrink-0" />
                  Your card form opens in a secure ABA PayWay window. Luvibooth never sees your card number.
                </p>
              )}

              {paying && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  {selectedMethod === 'qr' ? (
                    <KhqrPayment
                      item={item}
                      user={user}
                      tranId={tranId}
                      setTranId={setTranId}
                      setStatus={setStatus}
                      status={status}
                      onClose={cancelPayment}
                    />
                  ) : (
                    <CardPayment
                      item={item}
                      user={user}
                      setTranId={setTranId}
                      setStatus={setStatus}
                      status={status}
                      onClose={cancelPayment}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="font-bold text-pink-primary">Order Summary</p>
              <p className="mt-1 text-sm font-semibold text-dark">{item.label}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{item.priceLabel}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span>
                  <span>$0</span>
                </div>
                <div className="flex justify-between font-bold text-dark border-t border-gray-100 pt-2 mt-2">
                  <span>Due Today</span>
                  <span>{item.priceLabel}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={paying}
                onClick={() => setPaying(true)}
                className="mt-5 w-full rounded-xl bg-pink-primary text-white font-semibold py-3 hover:opacity-90 transition disabled:opacity-50"
              >
                {paying ? 'Processing…' : `Pay ${item.priceLabel}`}
              </button>
              <p className="mt-3 text-center text-xs text-gray-400">Secured by ABA PayWay</p>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  )
}

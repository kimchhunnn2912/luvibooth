import React, { useEffect, useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { X } from 'lucide-react'
import { stripePromise } from '../services/stripe'

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'

function CheckoutForm({ item, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message)
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ wallets: { link: 'never' } }} />
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="mt-5 w-full rounded-full bg-pink-primary text-white font-semibold py-3 hover:opacity-90 transition disabled:opacity-50"
      >
        {submitting ? 'Processing…' : `Pay ${item.priceLabel}`}
      </button>
      <p className="mt-3 text-center text-xs text-gray-400">
        Test mode — use card number 4242 4242 4242 4242, any future date, any CVC.
      </p>
    </form>
  )
}

export default function CheckoutModal({ item, onClose, onPaid }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [waking, setWaking] = useState(false)

  const handlePaymentSuccess = async () => {
    setSuccess(true)
    if (!onPaid) return
    try {
      await onPaid()
    } catch (err) {
      console.error('Payment succeeded but recording it failed:', err.message)
    }
  }

  // The free-tier backend spins down after inactivity and can fail or hang
  // on its very first request for up to ~50s while it wakes back up. Retry
  // a few times with a short delay instead of surfacing a scary error on
  // the first attempt, which would otherwise happen on almost every cold
  // demo (e.g. an advisor opening the site fresh).
  useEffect(() => {
    let cancelled = false
    const maxAttempts = 8
    const retryDelayMs = 6000

    const attemptFetch = async (attempt) => {
      if (cancelled) return
      setWaking(attempt > 1)
      try {
        const res = await fetch(`${SERVER_URL}/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountCents: item.amountCents, description: item.description }),
        })
        const data = await res.json()
        if (cancelled) return
        if (data.error) setError(data.error)
        else setClientSecret(data.clientSecret)
      } catch (err) {
        if (cancelled) return
        if (attempt < maxAttempts) {
          setTimeout(() => attemptFetch(attempt + 1), retryDelayMs)
        } else {
          setError('Could not reach the payment server. Please try again in a moment.')
        }
      }
    }

    attemptFetch(1)
    return () => {
      cancelled = true
    }
  }, [item])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="relative flex flex-col w-full max-w-sm max-h-full rounded-2xl bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-dark pr-6">{item.label}</h2>
          <p className="text-sm text-gray-500 mt-1">{item.priceLabel}</p>

          {success ? (
            <div className="mt-8 text-center">
              <p className="text-green-600 font-semibold">Payment successful (test mode)!</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-full border-2 border-pink-primary text-pink-primary font-semibold px-6 py-2.5 hover:bg-pink-50 transition"
              >
                Close
              </button>
            </div>
          ) : !stripePromise ? (
            <p className="mt-6 text-sm text-gray-500">
              Payments aren't configured yet — add a Stripe publishable key to get started.
            </p>
          ) : error && !clientSecret ? (
            <p className="mt-6 text-sm text-red-500">{error}</p>
          ) : !clientSecret ? (
            <p className="mt-6 text-sm text-gray-400">
              {waking
                ? "Waking up the payment server… this can take up to a minute after inactivity."
                : 'Loading payment form…'}
            </p>
          ) : (
            <div className="mt-6">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm item={item} onSuccess={handlePaymentSuccess} />
              </Elements>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

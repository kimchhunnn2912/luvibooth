import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import luviLogo from '../assets/luvilogo.png'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-pink-100 via-pink-50 to-white px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="flex flex-col items-center mb-10">
          <img src={luviLogo} alt="Luvibooth" className="h-20 w-auto" />
        </div>

        <h1 className="text-3xl font-extrabold text-dark mb-4">Forgot password?</h1>
        <p className="text-gray-500 mb-8">
          No worries! Enter the email address associated with your account and we'll send you a
          link to reset your password.
        </p>

        {sent ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-left">
            Check your inbox — if an account exists for {email}, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            {error && (
              <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-dark mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3.5 text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-pink-primary py-3.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="inline-block mt-8 text-pink-primary font-medium hover:underline"
        >
          ← Back to login
        </Link>

        <div className="h-px bg-gray-200 my-7" />

        <p className="text-gray-500">
          Don't have access anymore?{' '}
          <Link to="/login" className="text-pink-primary font-medium hover:underline">
            Try another method.
          </Link>
        </p>
      </div>
    </div>
  )
}

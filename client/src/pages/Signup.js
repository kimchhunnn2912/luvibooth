import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleIcon from '../components/GoogleIcon'
import EyeIcon from '../components/EyeIcon'
import luviLogo from '../assets/luvilogo.png'

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3.5 text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary'

export default function Signup() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await register({ firstName, lastName, username, email, password })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleClick = async () => {
    setError('')
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-pink-100 via-pink-50 to-white px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <img src={luviLogo} alt="Luvibooth" className="h-20 w-auto" />
        </div>

        <p className="text-right text-gray-500 mb-8">
          Already have one?{' '}
          <Link to="/login" className="text-pink-primary font-medium hover:underline">
            Log in
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-dark mb-1.5">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-dark mb-1.5">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-dark mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
              placeholder="@yourusername"
              required
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-dark mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-dark mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className={`${inputClasses} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-4 flex items-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-dark mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                minLength={8}
                className={`${inputClasses} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute inset-y-0 right-4 flex items-center"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-primary py-3.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-4 my-7">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-sm text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleClick}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3.5 font-medium text-dark hover:bg-gray-50"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="text-center text-gray-500 mt-8">
          By signing up, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-dark">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-dark">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

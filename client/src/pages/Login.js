import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleIcon from '../components/GoogleIcon'
import EyeIcon from '../components/EyeIcon'
import luviLogo from '../assets/luvilogo.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-pink-50 to-white px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <img src={luviLogo} alt="Luvibooth" className="h-20 w-auto" />
        </div>

        <h2 className="text-3xl font-extrabold text-dark mb-1">Welcome back</h2>
        <p className="text-gray-500 mb-8">
          No account?{' '}
          <Link to="/signup" className="text-pink-primary font-medium hover:underline">
            Sign up free
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

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
              className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3.5 text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-dark">
                Password
              </label>
              <Link to="/forgot-password" className="text-sm text-pink-primary font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3.5 pr-12 text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-primary py-3.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Log in'}
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
          New here?{' '}
          <Link to="/signup" className="text-pink-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { MessageCircleQuestion, Mail, Phone, Send } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { supabase } from '../services/supabaseClient'

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary'

export default function ContactUs() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: insertError } = await supabase.from('contact_messages').insert({
        first_name: firstName,
        last_name: lastName,
        email,
        subject: 'General inquiry',
        message,
      })
      if (insertError) throw insertError
      setSent(true)
      setFirstName('')
      setLastName('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="bg-pink-50 text-center py-16 px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white text-pink-primary text-sm font-medium px-4 py-1.5">
          <MessageCircleQuestion size={16} />
          We're here to help
        </span>
        <h1 className="mt-6 text-4xl md:text-5xl font-extrabold text-dark">
          Talk to our <span className="text-pink-primary">support team</span>
        </h1>
        <p className="mt-4 text-gray-500 max-w-xl mx-auto">
          Feel free to reach out for help or any questions about your photobooth experience.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 md:px-16 py-16">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 p-5">
            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-primary flex-shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email us at</p>
              <p className="font-semibold text-dark">luvibooth127@gmail.com</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 p-5">
            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-primary flex-shrink-0">
              <Phone size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Call us at</p>
              <p className="font-semibold text-dark">+855 123 456 789</p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-extrabold text-dark">Send us a message</h2>
          <p className="mt-1 text-gray-500">We'll get back to you as soon as possible!!</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {error && (
              <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                {error}
              </div>
            )}
            {sent && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2">
                Thanks! Your message has been sent — we'll get back to you soon.
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
              <label htmlFor="email" className="block text-sm font-semibold text-dark mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-dark mb-1.5">
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here..."
                required
                rows={7}
                className={`${inputClasses} resize-none`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 font-semibold text-dark hover:bg-gray-50 transition disabled:opacity-60"
            >
              <Send size={18} />
              {loading ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  )
}

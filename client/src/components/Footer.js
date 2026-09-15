import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-dark">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 py-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="text-lg font-extrabold text-pink-primary">Luvibooth</span>
          <span className="text-sm text-gray-500">© 2026 Luvibooth. Memories made digital.</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
          <Link to="/privacy" className="hover:text-white transition">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-white transition">
            Terms of Service
          </Link>
          <Link to="/help" className="hover:text-white transition">
            Help Center
          </Link>
        </div>
      </div>
    </footer>
  )
}

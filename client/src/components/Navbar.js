import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CircleUserRound, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import luviLogoIcon from '../assets/luvilogo_icon.png'
import coinIcon from '../assets/coin.png'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Frame', to: '/frame' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Contact Us', to: '/contact' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const initial = (
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    '?'
  )
    .charAt(0)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between px-6 md:px-16 py-4">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src={luviLogoIcon} alt="Luvibooth" className="h-7 sm:h-9 w-auto" />
          <span className="hidden sm:inline text-lg sm:text-xl font-extrabold whitespace-nowrap">
            <span className="text-pink-primary">Luvi</span>
            <span className="text-dark">booth</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = link.to === '/' ? pathname === '/' : pathname.startsWith(link.to)
            return (
              <Link
                key={link.to}
                to={link.to}
                className={
                  isActive
                    ? 'text-pink-primary font-semibold border-b-2 border-pink-primary pb-1'
                    : 'text-dark font-medium hover:text-pink-primary transition'
                }
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <Link
            to="/pricing#buy-coin"
            aria-label="Top up coins"
            title="Top up coins"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-amber-200 bg-amber-50 flex items-center justify-center hover:bg-amber-100 transition flex-shrink-0"
          >
            <img src={coinIcon} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
          <Link
            to={user ? '/profile' : '/login'}
            aria-label="Profile"
            title="Profile"
            className={
              user
                ? 'w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-pink-primary bg-pink-50 flex items-center justify-center text-pink-primary font-bold flex-shrink-0'
                : 'w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200 flex items-center justify-center text-dark hover:bg-gray-50 transition flex-shrink-0'
            }
          >
            {user ? initial : <CircleUserRound size={20} />}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200 flex items-center justify-center text-dark flex-shrink-0"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-gray-100 px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => {
            const isActive = link.to === '/' ? pathname === '/' : pathname.startsWith(link.to)
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={isActive ? 'text-pink-primary font-semibold' : 'text-dark font-medium'}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}

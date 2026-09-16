import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import coinIcon from '../assets/coin.png'

const PLANS = [
  {
    name: 'Free Plan',
    price: '$0',
    cta: 'Get Started',
    features: ['3 photos per day', 'Free frames only', 'Watermark on downloads'],
  },
  {
    name: 'Pro Plan',
    price: '$1.99',
    cta: 'Upgrade to Pro',
    features: [
      '10 photos per day',
      'No watermark',
      'Smart frame recommendation',
      '3 collab booth sessions / day',
      '70 coins / month',
    ],
  },
  {
    name: 'Pro Max Plan',
    price: '$3.99',
    cta: 'Upgrade to Pro Max',
    features: [
      '30 photos per day',
      'No watermark',
      'Smart frame recommendation',
      'Unlimited collab booth',
      'Early access to new frames',
      '160 coins / month',
    ],
  },
]

const COIN_PACKS = [
  { coins: 60, price: '$1.00' },
  { coins: 200, price: '$3.00' },
  { coins: 350, price: '$5.00' },
]
 
export default function Pricing() {
  const { hash } = useLocation()
  const [selectedPlan, setSelectedPlan] = useState(null)

  useEffect(() => {
    if (!hash) return
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="max-w-5xl mx-auto px-6 md:px-10 pt-16 pb-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-dark">Choose Your Perfect Plan</h1>
        <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
          Upgrade to enjoy ad-free photo booth experience and unlock premium features
        </p>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            onClick={() => setSelectedPlan(plan.name)}
            className={
              selectedPlan === plan.name
                ? 'h-full flex flex-col cursor-pointer rounded-2xl border border-pink-300 bg-pink-100 shadow-xl p-8 text-center transition'
                : 'h-full flex flex-col cursor-pointer rounded-2xl border border-pink-200 bg-white p-8 text-center transition'
            }
          >
            <h2 className="text-2xl font-extrabold text-dark">{plan.name}</h2>
            <p className="mt-1 text-sm text-gray-500">For personal use</p>

            <div className="mt-6 flex items-baseline justify-center gap-1">
              <span className="text-5xl font-extrabold text-dark">{plan.price}</span>
              <span className="text-gray-400">/month</span>
            </div>

            <Link
              to="/signup"
              onClick={(e) => e.stopPropagation()}
              className="mt-6 block rounded-full bg-pink-primary text-white font-semibold py-3 hover:opacity-90 transition"
            >
              {plan.cta}
            </Link>

            <ul className="mt-8 space-y-3 text-sm text-gray-600 text-left">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check size={16} className="text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <hr className="max-w-5xl mx-auto border-gray-200" />

      <section id="buy-coin" className="max-w-[1440px] mx-auto px-6 md:px-16 py-16">
        <div className="rounded-3xl bg-pink-100 p-8 md:p-12">
          <div className="flex items-center gap-3">
            <img src={coinIcon} alt="" className="w-10 h-10" />
            <h2 className="text-3xl font-extrabold text-dark">Buy coin</h2>
          </div>
          <p className="mt-2 text-gray-600">Use coin to unlock premium frame!</p>

          <div className="mt-8 grid sm:grid-cols-3 gap-6">
            {COIN_PACKS.map((pack) => (
              <div
                key={pack.coins}
                className="rounded-2xl bg-white shadow-md p-8 text-center hover:shadow-lg transition"
              >
                <img src={coinIcon} alt="" className="w-16 h-16 mx-auto" />
                <p className="mt-5 text-3xl font-extrabold text-dark">
                  {pack.coins}
                  <span className="text-sm font-medium text-gray-400 ml-1">coins</span>
                </p>
                <p className="mt-2 text-gray-500">{pack.price}</p>
                <button
                  type="button"
                  onClick={() => window.alert('Coin purchases are coming soon!')}
                  className="mt-5 w-full rounded-full bg-pink-primary text-white font-semibold py-2.5 hover:opacity-90 transition"
                >
                  Buy now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

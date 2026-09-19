import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { LAYOUTS } from '../constants/layouts'
import { FRAME_TEMPLATES } from '../constants/frameTemplates'
import { getFluentUrl, getTwemojiUrl } from '../utils/stickerIcons'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import { Check } from 'lucide-react'
import coinIcon from '../assets/coin.png'

const TEMPLATES = FRAME_TEMPLATES

const FILTERS = ['All', 'My Frames', 'Free', 'Premium', 'New', 'On trend']

const badgeClasses = {
  Free: 'bg-white text-dark',
  Premium: 'bg-amber-400 text-white',
  New: 'bg-pink-primary text-white',
  'On trend': 'bg-violet-500 text-white',
  Holiday: 'bg-red-500 text-white',
}

// Free frames stay free; every other badge tier costs coins to unlock once,
// permanently, per user (tracked in the unlocked_frames table).
const badgePrices = {
  Free: 0,
  New: 30,
  'On trend': 40,
  Holiday: 50,
  Premium: 70,
}

const pillClasses = (active) =>
  `rounded-full px-4 py-2 text-sm font-semibold border-2 transition ${
    active ? 'bg-pink-primary text-white border-pink-primary' : 'bg-white text-dark border-gray-200 hover:border-pink-200'
  }`

export default function BrowseFrames() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filter, setFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(null)
  const [coins, setCoins] = useState(0)
  const [unlockedIds, setUnlockedIds] = useState(new Set())
  const [unlocking, setUnlocking] = useState(false)

  useEffect(() => {
    if (!user) {
      setCoins(0)
      setUnlockedIds(new Set())
      return
    }
    supabase
      .from('profiles')
      .select('coins')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load coin balance:', error.message)
        } else {
          setCoins(data?.coins || 0)
        }
      })
    supabase
      .from('unlocked_frames')
      .select('frame_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load unlocked frames:', error.message)
        } else {
          setUnlockedIds(new Set((data || []).map((r) => r.frame_id)))
        }
      })
  }, [user])

  const priceFor = (t) => badgePrices[t.badge] ?? 0
  const isOwned = (t) => t.badge === 'Free' || unlockedIds.has(t.id)

  const visibleTemplates = TEMPLATES.filter((t) => {
    if (filter === 'All') return true
    if (filter === 'My Frames') return isOwned(t)
    return t.badge === filter
  }).sort((a, b) => (isOwned(a) === isOwned(b) ? 0 : isOwned(a) ? -1 : 1))
  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedId) || null

  const handleContinue = async () => {
    if (!selectedTemplate || unlocking) return

    if (isOwned(selectedTemplate)) {
      navigate('/photobooth', { state: { template: selectedTemplate } })
      return
    }

    if (!user) {
      window.alert('Please log in to unlock this frame.')
      navigate('/login')
      return
    }

    const price = priceFor(selectedTemplate)
    if (coins < price) {
      window.alert(
        `You need ${price} coins to unlock this frame, but you only have ${coins}. Let's get you more coins.`
      )
      navigate('/pricing#buy-coin')
      return
    }

    setUnlocking(true)
    try {
      const { error: unlockError } = await supabase
        .from('unlocked_frames')
        .insert({ user_id: user.id, frame_id: selectedTemplate.id })
      if (unlockError) throw unlockError

      const newCoins = coins - price
      const { error: coinsError } = await supabase
        .from('profiles')
        .update({ coins: newCoins })
        .eq('id', user.id)
      if (coinsError) throw coinsError

      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({ user_id: user.id, title: `Unlocked ${selectedTemplate.name} frame`, amount: -price })
      if (txError) throw txError

      setCoins(newCoins)
      setUnlockedIds((prev) => new Set(prev).add(selectedTemplate.id))
      navigate('/photobooth', { state: { template: selectedTemplate } })
    } catch (err) {
      console.error('Failed to unlock frame:', err.message)
      window.alert('Could not unlock this frame right now. Please try again.')
    } finally {
      setUnlocking(false)
    }
  }

  const continueLabel = () => {
    if (!selectedTemplate) return 'Select a frame to continue'
    if (unlocking) return 'Unlocking…'
    if (isOwned(selectedTemplate)) return `Continue with ${selectedTemplate.name}`
    return `Unlock for ${priceFor(selectedTemplate)} coins`
  }

  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="max-w-[1440px] mx-auto px-6 md:px-16 py-10 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-dark">
          Browse <span className="text-pink-primary">Frames</span>
        </h1>
        <p className="mt-3 text-gray-500">
          Explore free and premium frames designed by Luvibooth.
          <br />
          Unlock with coins or design your own!!
        </p>

        {user && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-500">
            <img src={coinIcon} alt="" className="w-4 h-4" />
            {coins} coins available
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={pillClasses(filter === f)}>
              {f}
            </button>
          ))}
        </div>

        {visibleTemplates.length === 0 && (
          <p className="mt-16 text-gray-400">
            {filter === 'My Frames'
              ? !user
                ? 'Log in to see the frames you\'ve unlocked.'
                : "You haven't unlocked any premium frames yet — free frames don't need unlocking."
              : 'No frames yet — check back soon!'}
          </p>
        )}

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {visibleTemplates.map((t) => {
            const layout = LAYOUTS.find((l) => l.id === t.layoutId) || LAYOUTS[0]
            const isSelected = selectedId === t.id
            const owned = isOwned(t)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className="text-left group w-full max-w-[170px] mx-auto"
              >
                {t.type === 'image' ? (
                  <div
                    className={`relative rounded-2xl overflow-hidden bg-gray-50 transition ${
                      isSelected ? 'ring-4 ring-pink-primary' : ''
                    }`}
                  >
                    {(!owned || t.badge === 'Free') && (
                      <span
                        className={`absolute top-1.5 left-1.5 z-10 rounded-full text-[10px] font-bold px-2 py-1 ${badgeClasses[t.badge]}`}
                      >
                        {t.badge}
                      </span>
                    )}
                    {!owned ? (
                      <span className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] font-bold px-2 py-1">
                        <img src={coinIcon} alt="" className="w-3 h-3" />
                        {priceFor(t)}
                      </span>
                    ) : (
                      t.badge !== 'Free' && (
                        <span className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-green-500 text-white text-[10px] font-bold px-2 py-1">
                          <Check size={10} strokeWidth={3} />
                          Owned
                        </span>
                      )
                    )}
                    <img
                      src={t.overlay}
                      alt=""
                      draggable={false}
                      className={`w-full h-auto transition group-hover:scale-105 ${!owned ? 'opacity-80' : ''}`}
                      style={{ aspectRatio: `${t.canvasWidth} / ${t.canvasHeight}` }}
                    />
                  </div>
                ) : (
                  <div
                    className={`relative rounded-2xl p-2 transition ${isSelected ? 'ring-4 ring-pink-primary' : ''}`}
                    style={{ backgroundColor: t.borderColor }}
                  >
                    {(!owned || t.badge === 'Free') && (
                      <span
                        className={`absolute top-1.5 left-1.5 z-10 rounded-full text-[10px] font-bold px-2 py-1 ${badgeClasses[t.badge]}`}
                      >
                        {t.badge}
                      </span>
                    )}
                    {!owned ? (
                      <span className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] font-bold px-2 py-1">
                        <img src={coinIcon} alt="" className="w-3 h-3" />
                        {priceFor(t)}
                      </span>
                    ) : (
                      t.badge !== 'Free' && (
                        <span className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-green-500 text-white text-[10px] font-bold px-2 py-1">
                          <Check size={10} strokeWidth={3} />
                          Owned
                        </span>
                      )
                    )}

                    {t.stickers.map((s, i) => (
                      <img
                        key={i}
                        src={getFluentUrl(s.slug)}
                        alt=""
                        draggable={false}
                        style={{ position: 'absolute', left: `${s.x}%`, top: s.y, width: s.size, height: s.size, transform: 'translateX(-50%)' }}
                        className="z-10 pointer-events-none"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = getTwemojiUrl(s.emoji)
                        }}
                      />
                    ))}

                    <div className={layout.cols === 2 ? 'grid grid-cols-2 gap-1.5' : 'flex flex-col gap-1.5'}>
                      {Array.from({ length: layout.boxes }).map((_, i) => (
                        <div key={i} className="aspect-[4/3] bg-white rounded-lg" />
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-2 text-sm font-bold text-dark">{t.name}</p>
                <p className="text-xs text-gray-500">
                  Layout {t.layoutId} · {layout.pose}
                </p>
              </button>
            )
          })}
        </div>

        <div
          className="sticky z-40 flex flex-col items-center gap-2 py-4"
          style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <button
            type="button"
            disabled={!selectedTemplate || unlocking}
            onClick={handleContinue}
            className="rounded-full bg-pink-primary text-white font-semibold px-8 py-3 shadow-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {continueLabel()}
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}

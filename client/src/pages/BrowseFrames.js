import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { LAYOUTS } from '../constants/layouts'
import { FRAME_TEMPLATES } from '../constants/frameTemplates'
import { getFluentUrl, getTwemojiUrl } from '../utils/stickerIcons'

const TEMPLATES = FRAME_TEMPLATES

const FILTERS = ['All', 'Free', 'Premium', 'New', 'On trend']

const badgeClasses = {
  Free: 'bg-white text-dark',
  Premium: 'bg-amber-400 text-white',
  New: 'bg-pink-primary text-white',
  'On trend': 'bg-violet-500 text-white',
}

const pillClasses = (active) =>
  `rounded-full px-4 py-2 text-sm font-semibold border-2 transition ${
    active ? 'bg-pink-primary text-white border-pink-primary' : 'bg-white text-dark border-gray-200 hover:border-pink-200'
  }`

export default function BrowseFrames() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(null)

  const visibleTemplates = TEMPLATES.filter((t) => filter === 'All' || t.badge === filter)
  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedId) || null

  const handleContinue = () => {
    if (!selectedTemplate) return
    navigate('/photobooth', { state: { template: selectedTemplate } })
  }

  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="max-w-[1440px] mx-auto px-6 md:px-16 py-10 pb-28 text-center">
        <h1 className="text-4xl font-extrabold text-dark">Browse Frames</h1>
        <p className="mt-3 text-gray-500">
          Explore free and premium frames designed by Luvibooth.
          <br />
          Unlock with coins or design your own!!
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={pillClasses(filter === f)}>
              {f}
            </button>
          ))}
        </div>

        {visibleTemplates.length === 0 && (
          <p className="mt-16 text-gray-400">No frames yet — check back soon!</p>
        )}

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {visibleTemplates.map((t) => {
            const layout = LAYOUTS.find((l) => l.id === t.layoutId) || LAYOUTS[0]
            const isSelected = selectedId === t.id
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
                    <span
                      className={`absolute top-1.5 left-1.5 z-10 rounded-full text-[10px] font-bold px-2 py-1 ${badgeClasses[t.badge]}`}
                    >
                      {t.badge}
                    </span>
                    <img
                      src={t.overlay}
                      alt=""
                      draggable={false}
                      className="w-full h-auto transition group-hover:scale-105"
                      style={{ aspectRatio: `${t.canvasWidth} / ${t.canvasHeight}` }}
                    />
                  </div>
                ) : (
                  <div
                    className={`relative rounded-2xl p-2 transition ${isSelected ? 'ring-4 ring-pink-primary' : ''}`}
                    style={{ backgroundColor: t.borderColor }}
                  >
                    <span
                      className={`absolute top-1.5 left-1.5 z-10 rounded-full text-[10px] font-bold px-2 py-1 ${badgeClasses[t.badge]}`}
                    >
                      {t.badge}
                    </span>

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

      </section>

      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 px-6 flex justify-center"
        style={{ paddingTop: '1rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          type="button"
          disabled={!selectedTemplate}
          onClick={handleContinue}
          className="w-full max-w-xs rounded-full bg-pink-primary text-white font-semibold px-8 py-3 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedTemplate ? `Continue with ${selectedTemplate.name}` : 'Select a frame to continue'}
        </button>
      </div>

      <Footer />
    </div>
  )
}

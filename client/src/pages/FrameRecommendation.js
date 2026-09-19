import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { FRAME_TEMPLATES } from '../constants/frameTemplates'
import { LAYOUTS } from '../constants/layouts'
import { analyzePhotos, describeMood, getRecommendedTemplates } from '../utils/photoAnalysis'
import coinIcon from '../assets/coin.png'

export default function FrameRecommendation() {
  const location = useLocation()
  const navigate = useNavigate()
  const photos = location.state?.photos || []
  const layoutId = location.state?.layoutId || 'A'
  const layout = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0]

  const [analyzing, setAnalyzing] = useState(true)
  const [mood, setMood] = useState('neutral')

  useEffect(() => {
    let cancelled = false
    if (photos.length === 0) {
      setAnalyzing(false)
      return
    }
    analyzePhotos(photos).then((result) => {
      if (!cancelled) {
        setMood(result.mood)
        setAnalyzing(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const compatible = FRAME_TEMPLATES.filter((t) => t.layoutId === layoutId)
  const recommended = getRecommendedTemplates(compatible, mood, 3)

  const handleSelectTemplate = (template) => {
    navigate('/photobooth/design', { state: { layoutId, photos, template } })
  }

  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="max-w-[1200px] mx-auto px-6 md:px-16 py-10 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-dark">
          Smart Frame <span className="text-pink-primary">Recommendation</span>
        </h1>
        <p className="mt-4 text-pink-700 text-lg max-w-xl mx-auto">
          We will analyzed your photo and found the best matching frames for you!
        </p>

        <h2 className="mt-14 text-2xl font-extrabold text-dark text-left">Recommended frames</h2>

        {analyzing ? (
          <p className="mt-8 text-gray-400">Analyzing your photos…</p>
        ) : recommended.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-pink-50 p-10">
            <p className="text-gray-500">
              No matching frames for a {layout.pose} layout yet — browse the full gallery instead.
            </p>
            <Link
              to="/frame"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-pink-primary text-white font-semibold px-6 py-3 hover:opacity-90 transition"
            >
              Browse all frames <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-400 text-left">
              Based on the {describeMood(mood)} in your photos.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {recommended.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTemplate(t)}
                  className="relative rounded-2xl border-2 border-pink-primary p-4 text-center hover:shadow-md transition"
                >
                  {i === 0 && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-pink-primary text-white text-xs font-bold px-4 py-1">
                      Top pick
                    </span>
                  )}
                  <img
                    src={t.overlay}
                    alt=""
                    draggable={false}
                    className="mx-auto rounded-xl bg-pink-50"
                    style={{ aspectRatio: `${t.canvasWidth} / ${t.canvasHeight}`, maxHeight: 340 }}
                  />
                  <p className="mt-4 font-bold text-dark">{t.name}</p>
                  <p className="mt-2 font-semibold">
                    {t.badge === 'Free' ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-500">
                        <img src={coinIcon} alt="" className="w-5 h-5" />
                        50 coins
                      </span>
                    )}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500">Don't like these? Browse all frames instead</p>
          <Link
            to="/frame"
            className="inline-flex items-center gap-2 rounded-full bg-pink-primary text-white font-semibold px-6 py-3 hover:opacity-90 transition"
          >
            Browse all frames <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

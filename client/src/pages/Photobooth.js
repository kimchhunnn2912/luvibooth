import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { LAYOUTS } from '../constants/layouts'

export default function Photobooth() {
  const location = useLocation()
  const template = location.state?.template || null
  const [selected, setSelected] = useState(template?.layoutId || null)
  const navigate = useNavigate()

  useEffect(() => {
    if (template) {
      navigate('/photobooth/capture', { state: { layoutId: template.layoutId, template }, replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (template) return null

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="max-w-[1440px] mx-auto px-6 md:px-16 py-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-dark">Choose your favorite layout</h1>
        <p className="mt-2 text-gray-500 max-w-2xl mx-auto">
          Select a layout for your photo session. You can choose from different styles.
        </p>
        {template && (
          <p className="mt-2 text-sm font-semibold text-pink-primary">Using template: {template.name}</p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {LAYOUTS.map((layout) => (
            <button key={layout.id} type="button" onClick={() => setSelected(layout.id)} className="text-center">
              <div
                className={[
                  layout.cols === 2 ? 'w-[184px]' : 'w-24',
                  'rounded-2xl bg-pink-100 p-2',
                  selected === layout.id ? 'ring-4 ring-pink-primary' : '',
                ].join(' ')}
              >
                <div className={layout.cols === 2 ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
                  {Array.from({ length: layout.boxes }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-white rounded-lg" />
                  ))}
                </div>
              </div>
              <p className="mt-2 text-sm font-bold text-dark">Layout {layout.id}</p>
              <p className="text-xs text-gray-500">{layout.pose}</p>
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && navigate('/photobooth/capture', { state: { layoutId: selected, template } })}
          className="mt-8 rounded-full bg-pink-primary text-white font-semibold px-8 py-3 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selected ? `Continue with layout ${selected}` : 'Select a layout to continue'}
        </button>
      </section>

      <Footer />
    </div>
  )
}
 
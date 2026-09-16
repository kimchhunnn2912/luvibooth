import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, ChevronDown, ArrowRight, Sparkles, Upload } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { LAYOUTS } from '../constants/layouts'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import { composeStripPreview, composeTemplatePreview } from '../utils/frameCanvas'

const DELAYS = [3, 5, 10]

const FILTERS = [
  { id: 'normal', label: 'Normal', css: 'none' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1) contrast(1.05)' },
  { id: 'blur', label: 'Blur', css: 'blur(2px)' },
  { id: 'cool', label: 'Cool', css: 'saturate(1.1) contrast(1.05) brightness(1.05) hue-rotate(-12deg)' },
  { id: 'dreamy', label: 'Dreamy', css: 'brightness(1.12) contrast(0.9) saturate(1.15) blur(0.5px)' },
  { id: 'fade', label: 'Fade', css: 'contrast(0.85) saturate(0.55) brightness(1.08)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.35) brightness(0.9)' },
  { id: 'sepia', label: 'Sepia', css: 'sepia(0.8) contrast(1.05) brightness(1.02)' },
  { id: 'sharp', label: 'Sharp', css: 'contrast(1.3) saturate(1.1)' },
  { id: 'soft', label: 'Soft', css: 'brightness(1.08) contrast(0.85) saturate(0.9)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.4) contrast(0.9) brightness(0.95) saturate(0.75)' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.6) contrast(1.15)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.3) saturate(1.3) brightness(1.05)' },
]

const pillBase = 'rounded-full px-4 py-2 font-semibold text-sm transition border-2 disabled:opacity-50 disabled:cursor-not-allowed'
const pillActive = 'bg-pink-primary text-white border-pink-primary'
const pillInactive = 'bg-white text-pink-primary border-pink-primary hover:bg-pink-50'

const selectClasses =
  'appearance-none rounded-full border-2 border-pink-primary bg-white text-pink-primary font-medium pl-4 pr-9 py-2 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const CROP_FRAME_W = 320
const CROP_FRAME_H = 240
const CROP_OUTPUT_W = 640
const CROP_OUTPUT_H = 480

const getCropBaseScale = (img) => Math.max(CROP_FRAME_W / img.width, CROP_FRAME_H / img.height)

const clampCropOffset = (img, zoom, x, y) => {
  const scale = getCropBaseScale(img) * zoom
  const drawnW = img.width * scale
  const drawnH = img.height * scale
  const maxX = Math.max(0, (drawnW - CROP_FRAME_W) / 2)
  const maxY = Math.max(0, (drawnH - CROP_FRAME_H) / 2)
  return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
}

export default function CameraCapture() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const initialLayoutId = location.state?.layoutId || 'A'
  const template = location.state?.template || null

  const [mode, setMode] = useState('capture')
  const [layoutId, setLayoutId] = useState(initialLayoutId)
  const [delay, setDelay] = useState(3)
  const [filter, setFilter] = useState(FILTERS[0])
  const [photos, setPhotos] = useState(location.state?.photos || [])
  const [countdown, setCountdown] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [streamReady, setStreamReady] = useState(false)
  const [retakeIndex, setRetakeIndex] = useState(null)
  const [replaceIndex, setReplaceIndex] = useState(null)
  const [cropQueue, setCropQueue] = useState([])
  const [cropImage, setCropImage] = useState(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const cancelRef = useRef(false)
  const cropDragRef = useRef(null)
  const savedStripRef = useRef(false)
  const stripIdRef = useRef(location.state?.stripId || null)

  const layout = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0]
  const done = photos.length >= layout.boxes
  const busy = capturing || retakeIndex !== null
  const showLiveView = !done || retakeIndex !== null

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setStreamReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStreamReady(true)
    } catch (err) {
      setCameraError('Could not access your camera. Please allow camera permission.')
    }
  }, [])

  useEffect(() => {
    if (mode === 'capture') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    return () => {
      cancelRef.current = true
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mode === 'capture' && done) {
      stopCamera()
    }
  }, [mode, done, stopCamera])

  useEffect(() => {
    if (!done) {
      savedStripRef.current = false
      return
    }
    if (savedStripRef.current) return
    savedStripRef.current = true
    if (!user) return
    const composePreview =
      template?.type === 'image' ? composeTemplatePreview({ template, photos }) : composeStripPreview({ layout, photos })
    composePreview
      .then((preview) => {
        if (stripIdRef.current) {
          return supabase
            .from('photo_strips')
            .update({ layout_id: layoutId, photos, preview })
            .eq('id', stripIdRef.current)
        }
        return supabase
          .from('photo_strips')
          .insert({ user_id: user.id, layout_id: layoutId, photos, preview })
          .select('id')
          .single()
          .then(({ data, error }) => {
            if (data) stripIdRef.current = data.id
            return { error }
          })
      })
      .then(({ error }) => {
        if (error) console.error('Failed to save photo strip:', error.message)
      })
      .catch((err) => console.error('Failed to compose photo strip preview:', err))
  }, [done, user, layoutId, photos, layout, template])

  useEffect(() => {
    if (cropQueue.length === 0) {
      setCropImage(null)
      return
    }
    let cancelled = false
    const url = URL.createObjectURL(cropQueue[0])
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      setCropImage(img)
      setCropZoom(1)
      setCropOffset({ x: 0, y: 0 })
    }
    img.src = url
    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
  }, [cropQueue])

  const handleModeChange = (m) => {
    if (m === mode || busy) return
    setPhotos([])
    setMode(m)
  }

  const handleLayoutChange = (id) => {
    if (busy) return
    setLayoutId(id)
    setPhotos([])
  }

  const captureFrame = () => {
    const video = videoRef.current
    if (!video) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.filter = filter.css
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.92)
  }

  const handleStartCapture = async () => {
    if (!streamReady || busy || done) return
    setCapturing(true)
    cancelRef.current = false
    const remaining = layout.boxes - photos.length

    for (let i = 0; i < remaining; i++) {
      for (let s = delay; s >= 1; s--) {
        if (cancelRef.current) {
          setCapturing(false)
          return
        }
        setCountdown(s)
        await sleep(1000)
      }
      if (cancelRef.current) {
        setCapturing(false)
        return
      }
      setCountdown(null)
      const dataUrl = captureFrame()
      if (dataUrl) {
        setPhotos((prev) => [...prev, dataUrl])
      }
      await sleep(400)
    }
    setCapturing(false)
  }

  const handleUploadBoxClick = () => {
    if (done) return
    fileInputRef.current?.click()
  }

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''

    if (replaceIndex !== null) {
      if (files[0]) setCropQueue([files[0]])
      return
    }

    const remaining = layout.boxes - photos.length
    const toQueue = files.slice(0, remaining)
    if (toQueue.length > 0) setCropQueue(toQueue)
  }

  const handleCropPointerDown = (e) => {
    cropDragRef.current = { startX: e.clientX, startY: e.clientY, offsetX: cropOffset.x, offsetY: cropOffset.y }
    window.addEventListener('pointermove', handleCropPointerMove)
    window.addEventListener('pointerup', handleCropPointerUp)
  }

  const handleCropPointerMove = (e) => {
    if (!cropDragRef.current || !cropImage) return
    const dx = e.clientX - cropDragRef.current.startX
    const dy = e.clientY - cropDragRef.current.startY
    setCropOffset(clampCropOffset(cropImage, cropZoom, cropDragRef.current.offsetX + dx, cropDragRef.current.offsetY + dy))
  }

  const handleCropPointerUp = () => {
    cropDragRef.current = null
    window.removeEventListener('pointermove', handleCropPointerMove)
    window.removeEventListener('pointerup', handleCropPointerUp)
  }

  const handleCropZoomChange = (value) => {
    if (!cropImage) return
    setCropZoom(value)
    setCropOffset((prev) => clampCropOffset(cropImage, value, prev.x, prev.y))
  }

  const handleConfirmCrop = () => {
    if (!cropImage) return
    const canvas = document.createElement('canvas')
    canvas.width = CROP_OUTPUT_W
    canvas.height = CROP_OUTPUT_H
    const ctx = canvas.getContext('2d')
    ctx.filter = filter.css

    const outputScale = CROP_OUTPUT_W / CROP_FRAME_W
    const scale = getCropBaseScale(cropImage) * cropZoom
    const drawnW = cropImage.width * scale
    const drawnH = cropImage.height * scale
    const x = ((CROP_FRAME_W - drawnW) / 2 + cropOffset.x) * outputScale
    const y = ((CROP_FRAME_H - drawnH) / 2 + cropOffset.y) * outputScale
    ctx.drawImage(cropImage, x, y, drawnW * outputScale, drawnH * outputScale)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

    if (replaceIndex !== null) {
      setPhotos((prev) => prev.map((p, i) => (i === replaceIndex ? dataUrl : p)))
      setReplaceIndex(null)
    } else {
      setPhotos((prev) => [...prev, dataUrl])
    }
    setCropQueue((prev) => prev.slice(1))
  }

  const handleCancelCrop = () => {
    setCropQueue((prev) => prev.slice(1))
    setReplaceIndex(null)
  }

  const handleContinue = () => {
    navigate('/photobooth/design', {
      state: { layoutId, photos, template: location.state?.template || null, stripId: stripIdRef.current },
    })
  }

  const runRetake = async (index) => {
    if (busy) return
    setRetakeIndex(index)
    cancelRef.current = false
    if (!streamRef.current) {
      await startCamera()
    }
    for (let s = delay; s >= 1; s--) {
      if (cancelRef.current) {
        setRetakeIndex(null)
        return
      }
      setCountdown(s)
      await sleep(1000)
    }
    if (cancelRef.current) {
      setRetakeIndex(null)
      return
    }
    setCountdown(null)
    const dataUrl = captureFrame()
    if (dataUrl) {
      setPhotos((prev) => prev.map((p, i) => (i === index ? dataUrl : p)))
    }
    stopCamera()
    setRetakeIndex(null)
  }

  const handleThumbnailDoubleClick = (index) => {
    if (!done || busy) return
    if (mode === 'capture') {
      runRetake(index)
    } else {
      setReplaceIndex(index)
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="max-w-[1440px] mx-auto px-6 md:px-16 py-6">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="text-lg font-extrabold text-dark">Mode Selection:</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleModeChange('capture')}
            className={`${pillBase} ${mode === 'capture' ? pillActive : pillInactive}`}
          >
            Capture
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleModeChange('upload')}
            className={`${pillBase} ${mode === 'upload' ? pillActive : pillInactive}`}
          >
            Upload
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <span className="text-lg font-extrabold text-dark">Layout:</span>
          <div className="relative">
            <select
              value={layoutId}
              disabled={busy}
              onChange={(e) => handleLayoutChange(e.target.value)}
              className={`${selectClasses} w-44 truncate`}
            >
              {LAYOUTS.map((l) => (
                <option key={l.id} value={l.id}>
                  Layout {l.id} ({l.pose})
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-pink-primary" />
          </div>

          {mode === 'capture' && (
            <div className="relative">
              <select
                value={delay}
                disabled={busy}
                onChange={(e) => setDelay(Number(e.target.value))}
                className={selectClasses}
              >
                {DELAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}s delay
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-pink-primary" />
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col md:flex-row items-center md:items-start justify-center gap-5">
          <div className="w-full max-w-[380px] md:flex-1 md:max-w-[420px]">
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-neutral-800 flex items-center justify-center">
              {mode === 'capture' ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ filter: filter.css, transform: 'scaleX(-1)' }}
                    className={`w-full h-full object-cover ${showLiveView && streamReady ? '' : 'hidden'}`}
                  />
                  {showLiveView && !streamReady && (
                    <div className="flex flex-col items-center gap-3 text-white px-6 text-center">
                      <Camera size={32} />
                      <p className="text-base">{cameraError || 'camera preview'}</p>
                    </div>
                  )}
                  {countdown && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-6xl font-extrabold">{countdown}</span>
                    </div>
                  )}
                  {!showLiveView && <div className="absolute inset-0 bg-black" />}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleUploadBoxClick}
                  disabled={done}
                  className="flex flex-col items-center gap-3 text-white px-6 text-center disabled:opacity-70"
                >
                  <Upload size={32} />
                  <p className="text-base">{done ? 'All photos added' : 'Click to upload photos'}</p>
                </button>
              )}
            </div>
          </div>

          {photos.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="flex md:flex-col gap-3 flex-wrap justify-center">
                {photos.map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onDoubleClick={() => handleThumbnailDoubleClick(i)}
                    disabled={!done || busy}
                    title={done ? 'Double-tap to retake this photo' : undefined}
                    className={`relative w-20 h-16 md:w-24 md:h-20 rounded-xl overflow-hidden bg-neutral-800 ${
                      done && !busy ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <img src={photo} alt={`Pose ${i + 1}`} className="w-full h-full object-cover" />
                    {retakeIndex === i && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-semibold">
                        {countdown || '...'}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {done && (
                <p className="mt-2 text-xs text-gray-400 text-center">Double-tap a photo to retake it</p>
              )}
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelected} className="hidden" />

        <div className="mt-5 flex justify-center">
          {mode === 'capture' && !done && (
            <button
              type="button"
              onClick={handleStartCapture}
              disabled={!streamReady || busy}
              className="inline-flex items-center gap-2 rounded-full bg-pink-primary text-white font-semibold px-7 py-3 hover:opacity-90 transition disabled:opacity-60"
            >
              <Camera size={18} />
              {capturing ? 'Capturing…' : 'Start Capture'}
            </button>
          )}

          {done && (
            <button
              type="button"
              onClick={handleContinue}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-pink-primary text-white font-semibold px-7 py-3 hover:opacity-90 transition disabled:opacity-60"
            >
              Continue <ArrowRight size={18} />
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f)}
              className={`${pillBase} ${filter.id === f.id ? pillActive : pillInactive}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {done && (
          <div className="mt-6 text-center">
            <p className="text-base font-semibold text-dark">Try Smart Frame Recommendation!</p>
            <button
              type="button"
              onClick={() => navigate('/photobooth/recommend', { state: { layoutId, photos } })}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-pink-primary text-white font-semibold px-6 py-2.5 hover:opacity-90 transition"
            >
              Smart Frame Recommendation <Sparkles size={18} />
            </button>
          </div>
        )}
      </section>

      {cropImage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <h3 className="text-lg font-bold text-dark text-center">Adjust your photo</h3>
            <p className="mt-1 text-sm text-gray-500 text-center">Drag to reposition, use the slider to zoom</p>

            <div
              onPointerDown={handleCropPointerDown}
              className="mt-4 relative overflow-hidden rounded-xl bg-neutral-900 mx-auto cursor-move touch-none"
              style={{ width: CROP_FRAME_W, height: CROP_FRAME_H, maxWidth: '100%' }}
            >
              <img
                src={cropImage.src}
                alt="Crop preview"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: (CROP_FRAME_W - cropImage.width * getCropBaseScale(cropImage) * cropZoom) / 2 + cropOffset.x,
                  top: (CROP_FRAME_H - cropImage.height * getCropBaseScale(cropImage) * cropZoom) / 2 + cropOffset.y,
                  width: cropImage.width * getCropBaseScale(cropImage) * cropZoom,
                  height: cropImage.height * getCropBaseScale(cropImage) * cropZoom,
                  maxWidth: 'none',
                  filter: filter.css,
                }}
              />
            </div>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={cropZoom}
              onChange={(e) => handleCropZoomChange(Number(e.target.value))}
              className="mt-4 w-full accent-pink-primary"
            />

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleCancelCrop}
                className="flex-1 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold py-2.5 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCrop}
                className="flex-1 rounded-xl bg-pink-primary text-white font-semibold py-2.5 hover:opacity-90 transition"
              >
                Use photo
              </button>
            </div>

            {cropQueue.length > 1 && (
              <p className="mt-3 text-xs text-gray-400 text-center">
                {cropQueue.length - 1} more photo{cropQueue.length - 1 > 1 ? 's' : ''} to adjust
              </p>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

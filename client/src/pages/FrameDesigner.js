import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Smile, Type, Palette, Pencil, Undo2, Redo2, ZoomIn, ZoomOut, X, Download, Video, RotateCcw } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { LAYOUTS } from '../constants/layouts'
import { loadImage, drawStripBase, drawImageCover } from '../utils/frameCanvas'
import { getTwemojiUrl, getFluentUrl } from '../utils/stickerIcons'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'

const TOOLS = [
  { id: 'sticker', label: 'Sticker', icon: Smile },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'color', label: 'Color', icon: Palette },
  { id: 'draw', label: 'Draw', icon: Pencil },
]

const STICKERS = [
  { emoji: '🦋', slug: 'butterfly' },
  { emoji: '🌈', slug: 'rainbow' },
  { emoji: '💗', slug: 'growing-heart' },
  { emoji: '⭐', slug: 'star' },
  { emoji: '✨', slug: 'sparkles' },
  { emoji: '🌟', slug: 'glowing-star' },
  { emoji: '💖', slug: 'sparkling-heart' },
  { emoji: '💕', slug: 'two-hearts' },
  { emoji: '🎀', slug: 'ribbon' },
  { emoji: '🎉', slug: 'party-popper' },
  { emoji: '🎊', slug: 'confetti-ball' },
  { emoji: '🎈', slug: 'balloon' },
  { emoji: '🥳', slug: 'partying-face' },
  { emoji: '😍', slug: 'smiling-face-with-heart-eyes' },
  { emoji: '😎', slug: 'smiling-face-with-sunglasses' },
  { emoji: '🤩', slug: 'star-struck' },
  { emoji: '😘', slug: 'face-blowing-a-kiss' },
  { emoji: '🔥', slug: 'fire' },
  { emoji: '👑', slug: 'crown' },
  { emoji: '🌸', slug: 'cherry-blossom' },
  { emoji: '🌺', slug: 'hibiscus' },
  { emoji: '🌼', slug: 'blossom' },
  { emoji: '☀️', slug: 'sun' },
  { emoji: '🌙', slug: 'crescent-moon' },
  { emoji: '❄️', slug: 'snowflake' },
  { emoji: '🍒', slug: 'cherries' },
  { emoji: '🍩', slug: 'doughnut' },
  { emoji: '☕', slug: 'hot-beverage' },
  { emoji: '📸', slug: 'camera-with-flash' },
  { emoji: '💫', slug: 'dizzy' },
  { emoji: '🫶', slug: 'heart-hands' },
  { emoji: '💜', slug: 'purple-heart' },
]

const COLORS = [
  '#000000',
  '#4b3b47',
  '#f4d9e0',
  '#fde047',
  '#f97362',
  '#ef4444',
  '#f9a8c9',
  '#8b5cf6',
  '#7f1d1d',
  '#64748b',
]

const BRUSH_SIZES = [3, 6, 10, 16]

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const MIN_STICKER_SIZE = 20
const MAX_STICKER_SIZE = 120
const MIN_TEXT_SIZE = 10
const MAX_TEXT_SIZE = 72

const SIZE_PROP = { sticker: 'size', text: 'fontSize' }
const SIZE_BOUNDS = {
  sticker: [MIN_STICKER_SIZE, MAX_STICKER_SIZE],
  text: [MIN_TEXT_SIZE, MAX_TEXT_SIZE],
}

let idCounter = 0
const nextId = () => `el-${++idCounter}`

const getTouchDistance = (touches) =>
  Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

const VIDEO_MIME_CANDIDATES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
const pickVideoMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return null
  return VIDEO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || null
}

const buildBoomerangSequence = (count) => {
  const forward = Array.from({ length: count }, (_, i) => i)
  const backward = forward.slice(1, -1).reverse()
  return [...forward, ...backward]
}

const toolButtonClasses = (active) =>
  `flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-xl border-2 text-xs font-medium transition ${
    active ? 'border-pink-primary text-pink-primary bg-pink-50' : 'border-gray-200 text-gray-500 hover:border-pink-200'
  }`

export default function FrameDesigner() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const layoutId = location.state?.layoutId || 'A'
  const capturedPhotos = location.state?.photos || []
  const template = location.state?.template || null
  const stripId = location.state?.stripId || null
  const layout = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0]

  const buildTemplateElements = (tpl) => {
    if (!tpl?.stickers) return []
    return tpl.stickers.map((s, i) => ({
      id: nextId(),
      type: 'sticker',
      emoji: s.emoji,
      slug: s.slug,
      x: s.x ?? 20 + i * 100,
      y: s.y ?? 16,
      size: s.size ?? 40,
    }))
  }

  const [activeTool, setActiveTool] = useState('sticker')
  const [frameName, setFrameName] = useState('')
  const [borderColor, setBorderColor] = useState(template?.borderColor || '#1f2937')
  const [activeColor, setActiveColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1])
  const [textInput, setTextInput] = useState('')
  const [zoom, setZoom] = useState(1)

  const [elements, setElements] = useState(() => buildTemplateElements(template))
  const [strokes, setStrokes] = useState([])
  const [history, setHistory] = useState(() => [{ elements, strokes: [] }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [videoExporting, setVideoExporting] = useState(false)

  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const strokeRef = useRef(null)
  const pinchRef = useRef(null)
  const selectedElement = elements.find((el) => el.id === selectedId) || null
  const isImageFrame = template?.type === 'image'

  const pushHistory = useCallback((nextElements, nextStrokes) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1)
      trimmed.push({ elements: nextElements, strokes: nextStrokes })
      return trimmed
    })
    setHistoryIndex((prev) => prev + 1)
  }, [historyIndex])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      stroke.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    })
  }, [strokes])

  // Keep the latest redraw function in a ref so resizeCanvas can call it
  // without depending on `strokes` — otherwise every point drawn mid-stroke
  // would recreate resizeCanvas, retrigger its effect below, and force a
  // full canvas.width/height reset (wiping + reallocating the backing
  // store) dozens of times per second while dragging, which can lock up
  // or crash the tab on mobile.
  const redrawCanvasRef = useRef(redrawCanvas)
  useEffect(() => {
    redrawCanvasRef.current = redrawCanvas
  }, [redrawCanvas])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const frame = frameRef.current
    if (!canvas || !frame) return
    const rect = frame.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    canvas.width = rect.width / zoom
    canvas.height = rect.height / zoom
    redrawCanvasRef.current()
  }, [zoom])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  const getLocalPoint = useCallback(
    (e) => {
      const frame = frameRef.current
      const rect = frame.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      }
    },
    [zoom]
  )

  const handleAddSticker = (sticker) => {
    const newEl = { id: nextId(), type: 'sticker', emoji: sticker.emoji, slug: sticker.slug, x: 45, y: 40, size: 44 }
    const nextElements = [...elements, newEl]
    setElements(nextElements)
    pushHistory(nextElements, strokes)
  }

  const handleAddText = () => {
    const value = textInput.trim()
    if (!value) return
    const newEl = { id: nextId(), type: 'text', content: value, x: 40, y: 45, color: activeColor, fontSize: 18 }
    const nextElements = [...elements, newEl]
    setElements(nextElements)
    pushHistory(nextElements, strokes)
    setTextInput('')
    setSelectedId(newEl.id)
  }

  const handleColorSelect = (c) => {
    setActiveColor(c)
    if (!selectedId) return
    setElements((prev) => {
      const next = prev.map((el) => (el.id === selectedId && el.type === 'text' ? { ...el, color: c } : el))
      pushHistory(next, strokes)
      return next
    })
  }

  const handleDeleteElement = (id) => {
    const nextElements = elements.filter((el) => el.id !== id)
    setElements(nextElements)
    pushHistory(nextElements, strokes)
    setSelectedId((prev) => (prev === id ? null : prev))
  }

  const handleElementPointerDown = (e, el) => {
    e.stopPropagation()
    setSelectedId(el.id)
    const point = getLocalPoint(e)
    dragRef.current = { id: el.id, offsetX: point.x - el.x, offsetY: point.y - el.y }
  }

  const handleElementPointerMove = useCallback(
    (e) => {
      if (!dragRef.current) return
      const point = getLocalPoint(e)
      const { id, offsetX, offsetY } = dragRef.current
      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, x: point.x - offsetX, y: point.y - offsetY } : el))
      )
    },
    [getLocalPoint]
  )

  const endElementDrag = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    setElements((current) => {
      pushHistory(current, strokes)
      return current
    })
  }, [strokes, pushHistory])

  // A stroke or a drag can end via 'pointerup' OR 'pointercancel' (common on
  // mobile when the OS intercepts a gesture, e.g. a second finger touching
  // down). Previously these listeners were added/removed per-stroke and only
  // listened for 'pointerup', so a cancelled touch left stale listeners
  // attached; starting a second stroke then raced two sets of listeners
  // against the same ref, nulling it out from under an in-flight read and
  // crashing with "null is not an object (evaluating '...points')".
  // Registering one stable pair for the component's whole lifetime avoids
  // that entirely.
  useEffect(() => {
    window.addEventListener('pointermove', handleElementPointerMove)
    window.addEventListener('pointerup', endElementDrag)
    window.addEventListener('pointercancel', endElementDrag)
    return () => {
      window.removeEventListener('pointermove', handleElementPointerMove)
      window.removeEventListener('pointerup', endElementDrag)
      window.removeEventListener('pointercancel', endElementDrag)
    }
  }, [handleElementPointerMove, endElementDrag])

  const handleCanvasPointerDown = (e) => {
    if (activeTool !== 'draw') return
    const point = getLocalPoint(e)
    strokeRef.current = { color: activeColor, size: brushSize, points: [point] }
    setStrokes((prev) => [...prev, strokeRef.current])
  }

  const handleCanvasPointerMove = useCallback(
    (e) => {
      if (!strokeRef.current) return
      const point = getLocalPoint(e)
      strokeRef.current.points.push(point)
      setStrokes((prev) => {
        if (!strokeRef.current || prev.length === 0) return prev
        const next = [...prev]
        next[next.length - 1] = { ...strokeRef.current, points: [...strokeRef.current.points] }
        return next
      })
    },
    [getLocalPoint]
  )

  const endStroke = useCallback(() => {
    if (!strokeRef.current) return
    strokeRef.current = null
    setStrokes((current) => {
      pushHistory(elements, current)
      return current
    })
  }, [elements, pushHistory])

  useEffect(() => {
    window.addEventListener('pointermove', handleCanvasPointerMove)
    window.addEventListener('pointerup', endStroke)
    window.addEventListener('pointercancel', endStroke)
    return () => {
      window.removeEventListener('pointermove', handleCanvasPointerMove)
      window.removeEventListener('pointerup', endStroke)
      window.removeEventListener('pointercancel', endStroke)
    }
  }, [handleCanvasPointerMove, endStroke])

  const handleUndo = () => {
    if (historyIndex === 0) return
    const nextIndex = historyIndex - 1
    setHistoryIndex(nextIndex)
    setElements(history[nextIndex].elements)
    setStrokes(history[nextIndex].strokes)
  }

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    setElements(history[nextIndex].elements)
    setStrokes(history[nextIndex].strokes)
  }

  const resizeSelectedElement = (delta) => {
    if (!selectedElement) return
    const prop = SIZE_PROP[selectedElement.type]
    const [min, max] = SIZE_BOUNDS[selectedElement.type]
    const nextElements = elements.map((el) =>
      el.id === selectedId ? { ...el, [prop]: Math.min(max, Math.max(min, el[prop] + delta)) } : el
    )
    setElements(nextElements)
    pushHistory(nextElements, strokes)
  }

  const handleZoomIn = () => {
    if (selectedElement) {
      resizeSelectedElement(selectedElement.type === 'text' ? 2 : 8)
      return
    }
    setZoom((prev) => Math.min(MAX_ZOOM, +(prev + 0.1).toFixed(2)))
  }

  const handleZoomOut = () => {
    if (selectedElement) {
      resizeSelectedElement(selectedElement.type === 'text' ? -2 : -8)
      return
    }
    setZoom((prev) => Math.max(MIN_ZOOM, +(prev - 0.1).toFixed(2)))
  }

  const handleElementTouchStart = (e, el) => {
    if (e.touches.length !== 2) return
    e.stopPropagation()
    dragRef.current = null
    setSelectedId(el.id)
    pinchRef.current = {
      type: 'element',
      id: el.id,
      elType: el.type,
      startDist: getTouchDistance(e.touches),
      startValue: el[SIZE_PROP[el.type]],
    }
    window.addEventListener('touchmove', handlePinchMove, { passive: false })
    window.addEventListener('touchend', handlePinchEnd)
    window.addEventListener('touchcancel', handlePinchEnd)
  }

  const handleFrameTouchStart = (e) => {
    if (e.touches.length !== 2) return
    dragRef.current = null
    pinchRef.current = { type: 'canvas', startDist: getTouchDistance(e.touches), startValue: zoom }
    window.addEventListener('touchmove', handlePinchMove, { passive: false })
    window.addEventListener('touchend', handlePinchEnd)
    window.addEventListener('touchcancel', handlePinchEnd)
  }

  const handlePinchMove = (e) => {
    if (!pinchRef.current || e.touches.length < 2) return
    e.preventDefault()
    const scale = getTouchDistance(e.touches) / pinchRef.current.startDist
    if (pinchRef.current.type === 'element') {
      const prop = SIZE_PROP[pinchRef.current.elType]
      const [min, max] = SIZE_BOUNDS[pinchRef.current.elType]
      const nextSize = Math.min(max, Math.max(min, pinchRef.current.startValue * scale))
      setElements((prev) => prev.map((el) => (el.id === pinchRef.current.id ? { ...el, [prop]: nextSize } : el)))
    } else {
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.startValue * scale)))
    }
  }

  const handlePinchEnd = () => {
    if (!pinchRef.current) return
    const wasElement = pinchRef.current.type === 'element'
    pinchRef.current = null
    window.removeEventListener('touchmove', handlePinchMove)
    window.removeEventListener('touchend', handlePinchEnd)
    window.removeEventListener('touchcancel', handlePinchEnd)
    if (wasElement) {
      setElements((current) => {
        pushHistory(current, strokes)
        return current
      })
    }
  }

  const handleRetakePhotos = () => {
    navigate('/photobooth/capture', { state: { layoutId, template, stripId } })
  }

  const drawElements = async (ctx, scale) => {
    for (const el of elements) {
      if (el.type === 'sticker') {
        try {
          const img = await loadImage(getFluentUrl(el.slug))
          ctx.drawImage(img, el.x * scale, el.y * scale, el.size * scale, el.size * scale)
        } catch {
          try {
            const fallbackImg = await loadImage(getTwemojiUrl(el.emoji))
            ctx.drawImage(fallbackImg, el.x * scale, el.y * scale, el.size * scale, el.size * scale)
          } catch {
            // skip sticker if both sources fail
          }
        }
      } else {
        ctx.fillStyle = el.color
        ctx.font = `bold ${el.fontSize * scale}px sans-serif`
        ctx.textBaseline = 'top'
        ctx.fillText(el.content, el.x * scale, el.y * scale)
      }
    }
  }

  const handleDownload = async () => {
    const overlay = canvasRef.current
    if (!overlay) return

    const exportCanvas = document.createElement('canvas')
    const ctx = exportCanvas.getContext('2d')

    if (isImageFrame) {
      // Export at the template's own native resolution instead of the small
      // on-screen preview size, so downloads match the source art's quality.
      exportCanvas.width = template.canvasWidth
      exportCanvas.height = template.canvasHeight

      for (let i = 0; i < template.slots.length; i++) {
        const slot = template.slots[i]
        const photoSrc = capturedPhotos[i]
        if (!photoSrc) continue
        try {
          const img = await loadImage(photoSrc)
          ctx.save()
          ctx.beginPath()
          ctx.rect(slot.x, slot.y, slot.w, slot.h)
          ctx.clip()
          drawImageCover(ctx, img, slot.x, slot.y, slot.w, slot.h)
          ctx.restore()
        } catch {
          // skip photo if it fails to load
        }
      }
      try {
        const overlayImg = await loadImage(template.overlay)
        ctx.drawImage(overlayImg, 0, 0, template.canvasWidth, template.canvasHeight)
      } catch {
        // skip overlay art if it fails to load
      }

      ctx.drawImage(overlay, 0, 0, template.canvasWidth, template.canvasHeight)
      await drawElements(ctx, template.canvasWidth / overlay.width)
    } else {
      // Bump the export resolution well above the compact on-screen preview.
      const scale = 3
      exportCanvas.width = overlay.width * scale
      exportCanvas.height = overlay.height * scale
      ctx.scale(scale, scale)

      await drawStripBase(ctx, { layout, photos: capturedPhotos, borderColor })
      ctx.drawImage(overlay, 0, 0)
      await drawElements(ctx, 1)
    }

    const link = document.createElement('a')
    link.download = `${frameName.trim() || 'luvibooth-frame'}.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()

    // Also sync the profile's saved preview to this decorated version, so
    // "My recent photo strips" reflects the actual frame, not the raw capture.
    if (stripId && user) {
      const previewCanvas = document.createElement('canvas')
      const previewScale = Math.min(1, 640 / exportCanvas.width)
      previewCanvas.width = exportCanvas.width * previewScale
      previewCanvas.height = exportCanvas.height * previewScale
      previewCanvas.getContext('2d').drawImage(exportCanvas, 0, 0, previewCanvas.width, previewCanvas.height)
      const preview = previewCanvas.toDataURL('image/jpeg', 0.85)
      supabase
        .from('photo_strips')
        .update({ preview })
        .eq('id', stripId)
        .then(({ error }) => {
          if (error) console.error('Failed to update saved photo strip preview:', error.message)
        })
    }
  }

  const handleDownloadVideo = async () => {
    if (videoExporting || capturedPhotos.length === 0) return

    const mimeType = pickVideoMimeType()
    if (!mimeType) {
      window.alert('Your browser cannot record video. Try a recent version of Chrome, Edge, or Firefox.')
      return
    }

    setVideoExporting(true)
    try {
      const images = await Promise.all(capturedPhotos.map((src) => loadImage(src)))
      const { width, height } = images[0]

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(images[0], 0, 0, width, height)

      const stream = canvas.captureStream(15)
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      const sequence = buildBoomerangSequence(images.length)
      const frameDurationMs = 180
      const cycles = 3
      const totalSteps = sequence.length * cycles

      const finished = new Promise((resolve) => {
        recorder.onstop = resolve
      })

      recorder.start()
      let step = 0
      const interval = setInterval(() => {
        const img = images[sequence[step % sequence.length]]
        ctx.drawImage(img, 0, 0, width, height)
        step += 1
        if (step >= totalSteps) {
          clearInterval(interval)
          recorder.stop()
        }
      }, frameDurationMs)

      await finished

      const blob = new Blob(chunks, { type: mimeType })
      const url = URL.createObjectURL(blob)
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const link = document.createElement('a')
      link.download = `${frameName.trim() || 'luvibooth-boomerang'}.${extension}`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      window.alert('Could not create the video. Please try again.')
    } finally {
      setVideoExporting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-6">
        <button
          type="button"
          onClick={handleRetakePhotos}
          className="inline-flex items-center gap-2 text-sm font-semibold text-pink-primary hover:underline"
        >
          <RotateCcw size={16} />
          Retake photos
        </button>
      </div>

      <section className="max-w-[1600px] mx-auto px-6 md:px-10 py-8 flex flex-col lg:flex-row gap-8">
        <div className="flex flex-wrap lg:flex-col justify-center gap-2 w-full lg:w-20 shrink-0">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              className={toolButtonClasses(activeTool === tool.id)}
            >
              <tool.icon size={16} />
              {tool.label}
            </button>
          ))}
          <div className="hidden lg:block border-t border-gray-200 my-1" />
          <button type="button" onClick={handleUndo} disabled={historyIndex === 0} className={`${toolButtonClasses(false)} disabled:opacity-40`}>
            <Undo2 size={16} />
            Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className={`${toolButtonClasses(false)} disabled:opacity-40`}
          >
            <Redo2 size={16} />
            Redo
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={
              selectedElement
                ? selectedElement[SIZE_PROP[selectedElement.type]] >= SIZE_BOUNDS[selectedElement.type][1]
                : zoom >= MAX_ZOOM
            }
            className={`${toolButtonClasses(false)} disabled:opacity-40`}
          >
            <ZoomIn size={16} />
            {selectedElement ? 'Bigger' : 'Zoom in'}
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={
              selectedElement
                ? selectedElement[SIZE_PROP[selectedElement.type]] <= SIZE_BOUNDS[selectedElement.type][0]
                : zoom <= MIN_ZOOM
            }
            className={`${toolButtonClasses(false)} disabled:opacity-40`}
          >
            <ZoomOut size={16} />
            {selectedElement ? 'Smaller' : 'Zoom out'}
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-8 justify-center">
          {activeTool === 'sticker' && (
            <div className="w-full max-w-xs mx-auto lg:max-w-none lg:mx-0 lg:w-56 shrink-0">
              <h2 className="text-lg font-semibold text-gray-500">Stickers</h2>
              <div className="mt-3 grid grid-cols-5 sm:grid-cols-4 gap-1.5">
                {STICKERS.map((sticker, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddSticker(sticker)}
                    className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-xl bg-pink-50 hover:bg-pink-100 flex items-center justify-center p-1.5 transition"
                  >
                    <img
                      src={getFluentUrl(sticker.slug)}
                      alt={sticker.slug}
                      className="w-full h-full object-contain"
                      draggable={false}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = getTwemojiUrl(sticker.emoji)
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {(activeTool === 'draw' || activeTool === 'color' || selectedElement?.type === 'text') && (
            <div className="w-full max-w-xs mx-auto lg:max-w-none lg:mx-0 lg:w-56 shrink-0">
              <h2 className="text-lg font-semibold text-gray-500">{activeTool === 'draw' ? 'Brush Colors' : 'Colors'}</h2>
              {selectedElement?.type === 'text' ? (
                <p className="mt-1 text-xs text-pink-primary">Tap a color to recolor the selected text</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">Select a placed text to recolor it, or pick a color before typing new text</p>
              )}
              <div className="mt-3 grid grid-cols-5 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorSelect(c)}
                    style={{ backgroundColor: c }}
                    className={`w-9 h-9 rounded-full border-2 transition ${
                      activeColor === c ? 'border-pink-primary scale-110' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>

              {activeTool === 'draw' && (
                <>
                  <hr className="my-5 border-gray-200" />
                  <h2 className="text-lg font-semibold text-gray-500">Brush Size</h2>
                  <div className="mt-3 flex gap-2">
                    {BRUSH_SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setBrushSize(s)}
                        className={`w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center border-2 transition ${
                          brushSize === s ? 'border-pink-primary' : 'border-transparent'
                        }`}
                      >
                        <span className="rounded-full bg-dark" style={{ width: s, height: s }} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex-1 flex items-center justify-center py-4 overflow-auto">
            <div
              ref={frameRef}
              onClick={() => setSelectedId(null)}
              onTouchStart={handleFrameTouchStart}
              className="relative touch-none"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            >
              {isImageFrame ? (
                <div
                  className="relative overflow-hidden rounded-xl bg-white"
                  style={{ height: 560, aspectRatio: `${template.canvasWidth} / ${template.canvasHeight}` }}
                >
                  {template.slots.map((slot, i) => (
                    <div
                      key={i}
                      className="absolute overflow-hidden bg-white"
                      style={{
                        left: `${(slot.x / template.canvasWidth) * 100}%`,
                        top: `${(slot.y / template.canvasHeight) * 100}%`,
                        width: `${(slot.w / template.canvasWidth) * 100}%`,
                        height: `${(slot.h / template.canvasHeight) * 100}%`,
                      }}
                    >
                      {capturedPhotos[i] && (
                        <img src={capturedPhotos[i]} alt={`Pose ${i + 1}`} className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                  <img
                    src={template.overlay}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full pointer-events-none select-none"
                  />
                </div>
              ) : (
                <div
                  style={{ backgroundColor: borderColor }}
                  className={`inline-grid gap-3 p-3 rounded-3xl ${layout.cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
                >
                  {Array.from({ length: layout.boxes }).map((_, i) => (
                    <div key={i} className="w-40 aspect-[4/3] rounded-xl overflow-hidden bg-white">
                      {capturedPhotos[i] && (
                        <img src={capturedPhotos[i]} alt={`Pose ${i + 1}`} className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: activeTool === 'draw' ? 'auto' : 'none', cursor: activeTool === 'draw' ? 'crosshair' : 'default' }}
              />

              {elements.map((el) => (
                <div
                  key={el.id}
                  onPointerDown={(e) => handleElementPointerDown(e, el)}
                  onTouchStart={(e) => handleElementTouchStart(e, el)}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={() => handleDeleteElement(el.id)}
                  className={`group absolute cursor-grab active:cursor-grabbing select-none rounded ${
                    selectedId === el.id ? 'outline outline-2 outline-dashed outline-pink-primary outline-offset-4' : ''
                  }`}
                  style={{ left: el.x, top: el.y, touchAction: 'none' }}
                  title={
                    el.type === 'sticker'
                      ? 'Drag to move, pinch or use Zoom in/out to resize, double-click to remove'
                      : 'Drag to move, pinch or use Zoom in/out to resize, pick a color to recolor, double-click to remove'
                  }
                >
                  {el.type === 'sticker' ? (
                    <img
                      src={getFluentUrl(el.slug)}
                      alt={el.slug}
                      style={{ width: el.size, height: el.size }}
                      draggable={false}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = getTwemojiUrl(el.emoji)
                      }}
                    />
                  ) : (
                    <span style={{ color: el.color, fontSize: el.fontSize }} className="font-bold whitespace-nowrap">
                      {el.content}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteElement(el.id)}
                    className="hidden group-hover:flex absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-gray-300 items-center justify-center text-gray-500 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-72 shrink-0 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-500">Frame name</h2>
            <input
              type="text"
              value={frameName}
              onChange={(e) => setFrameName(e.target.value)}
              placeholder="Type something..."
              className="mt-3 w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary"
            />
          </div>

          {!isImageFrame && (
            <>
              <hr className="border-gray-200" />

              <div>
                <h2 className="text-lg font-semibold text-gray-500">Border colors</h2>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBorderColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-9 h-9 rounded-full border-2 transition ${
                        borderColor === c ? 'border-pink-primary scale-110' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <hr className="border-gray-200" />

          <div>
            <h2 className="text-lg font-semibold text-gray-500">Add text</h2>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              placeholder="Type something..."
              className="mt-3 w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary"
            />
            <button
              type="button"
              onClick={handleAddText}
              className="mt-3 w-full rounded-full border-2 border-pink-primary text-pink-primary font-semibold py-3 hover:bg-pink-50 transition"
            >
              Add text
            </button>
          </div>

          <hr className="border-gray-200" />

          <button
            type="button"
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-pink-primary text-white font-semibold py-3.5 hover:opacity-90 transition"
          >
            <Download size={18} />
            Download frame
          </button>

          <button
            type="button"
            onClick={handleDownloadVideo}
            disabled={videoExporting || capturedPhotos.length === 0}
            title={capturedPhotos.length === 0 ? 'No captured photos to make a video from' : undefined}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-pink-primary text-pink-primary font-semibold py-3.5 hover:bg-pink-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Video size={18} />
            {videoExporting ? 'Recording…' : 'Download video'}
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}

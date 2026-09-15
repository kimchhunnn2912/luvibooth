import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ArrowRight, Camera } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { LAYOUTS } from '../constants/layouts'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import { socket } from '../services/socket'
import { composeStripPreview } from '../utils/frameCanvas'

const DELAYS = [3, 5, 10]

const FILTERS = [
  { id: 'normal', label: 'Normal', css: 'none' },
  { id: 'blur', label: 'Blur', css: 'blur(2px)' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.6) contrast(1.15)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.3) saturate(1.3) brightness(1.05)' },
  { id: 'cool', label: 'Cool', css: 'saturate(1.1) contrast(1.05) brightness(1.05) hue-rotate(-12deg)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.4) contrast(0.9) brightness(0.95) saturate(0.75)' },
]

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

const pillBase = 'rounded-full px-4 py-2 font-semibold text-sm transition border-2 disabled:opacity-50 disabled:cursor-not-allowed'
const pillActive = 'bg-pink-primary text-white border-pink-primary'
const pillInactive = 'bg-white text-pink-primary border-pink-primary hover:bg-pink-50'

const selectClasses =
  'appearance-none rounded-full border-2 border-pink-primary bg-white text-pink-primary font-medium pl-4 pr-9 py-2 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function CollabCapture() {
  const { roomCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isHost = location.state?.isHost ?? false
  const myName =
    location.state?.displayName ||
    user?.user_metadata?.first_name ||
    user?.email?.split('@')[0] ||
    'You'

  const [layoutId, setLayoutId] = useState('A')
  const [delay, setDelay] = useState(3)
  const [filter, setFilter] = useState(FILTERS[0])
  const [friendName, setFriendName] = useState('')
  const [friendConnected, setFriendConnected] = useState(false)
  const [localReady, setLocalReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [photos, setPhotos] = useState([])

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const pcRef = useRef(null)
  const cancelRef = useRef(false)
  const savedStripRef = useRef(false)
  const stripIdRef = useRef(location.state?.stripId || null)

  const layout = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0]
  const done = photos.length >= layout.boxes

  // Get the local camera once on mount.
  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        setLocalReady(true)
      })
      .catch(() => setCameraError('Could not access your camera. Please allow camera permission.'))
    return () => {
      cancelled = true
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc-signal', { roomCode, signal: { type: 'ice-candidate', candidate: e.candidate } })
      }
    }
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]
      setFriendConnected(true)
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current))
    }
    pcRef.current = pc
    return pc
  }, [roomCode])

  // Join the room once on mount.
  useEffect(() => {
    if (!roomCode) return
    if (!socket.connected) socket.connect()
    socket.emit('join-room', { roomCode, name: myName })
    return () => {
      socket.emit('leave-room')
      pcRef.current?.close()
      pcRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode])

  const runCaptureSequence = useCallback(
    async (customDelay) => {
      setCapturing((current) => {
        if (current) return current
        return true
      })
      cancelRef.current = false
      const d = customDelay || delay
      const remaining = layout.boxes - photos.length

      for (let i = 0; i < remaining; i++) {
        for (let s = d; s >= 1; s--) {
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

        const localVideo = localVideoRef.current
        const remoteVideo = remoteVideoRef.current
        if (localVideo) {
          const halfW = 320
          const h = 480
          const canvas = document.createElement('canvas')
          canvas.width = halfW * 2
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.filter = filter.css

          ctx.save()
          ctx.translate(halfW, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(localVideo, 0, 0, halfW, h)
          ctx.restore()

          if (remoteVideo?.srcObject) {
            ctx.drawImage(remoteVideo, halfW, 0, halfW, h)
          } else {
            ctx.fillStyle = '#1f2937'
            ctx.fillRect(halfW, 0, halfW, h)
          }

          setPhotos((prev) => [...prev, canvas.toDataURL('image/jpeg', 0.92)])
        }
        await sleep(400)
      }
      setCapturing(false)
    },
    [delay, layout.boxes, photos.length, filter]
  )

  // Signaling + presence listeners.
  useEffect(() => {
    if (!roomCode) return

    const handleRoomUsers = async (members) => {
      const friend = members.find((m) => m.id !== socket.id)
      setFriendName(friend?.name || '')
      if (members.length === 2 && isHost && !pcRef.current && localStreamRef.current) {
        const pc = createPeerConnection()
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('webrtc-signal', { roomCode, signal: { type: 'offer', sdp: offer } })
      }
    }

    const handleSignal = async ({ signal }) => {
      if (signal.type === 'offer') {
        const pc = pcRef.current || createPeerConnection()
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('webrtc-signal', { roomCode, signal: { type: 'answer', sdp: answer } })
      } else if (signal.type === 'answer') {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      } else if (signal.type === 'ice-candidate') {
        try {
          await pcRef.current?.addIceCandidate(signal.candidate)
        } catch {
          // ignore candidates that arrive after the connection settles
        }
      }
    }

    const handleCaptureStart = ({ delay: d }) => {
      runCaptureSequence(d)
    }

    socket.on('room-users', handleRoomUsers)
    socket.on('webrtc-signal', handleSignal)
    socket.on('capture-start', handleCaptureStart)

    return () => {
      socket.off('room-users', handleRoomUsers)
      socket.off('webrtc-signal', handleSignal)
      socket.off('capture-start', handleCaptureStart)
    }
  }, [roomCode, isHost, createPeerConnection, runCaptureSequence])

  // Save the finished strip once, tagged as collaborative.
  useEffect(() => {
    if (!done) {
      savedStripRef.current = false
      return
    }
    if (savedStripRef.current) return
    savedStripRef.current = true
    if (!user) return
    composeStripPreview({ layout, photos })
      .then((preview) => {
        if (stripIdRef.current) {
          return supabase
            .from('photo_strips')
            .update({ layout_id: layoutId, photos, preview, collaborative: true })
            .eq('id', stripIdRef.current)
        }
        return supabase
          .from('photo_strips')
          .insert({ user_id: user.id, layout_id: layoutId, photos, preview, collaborative: true })
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
  }, [done, user, layoutId, photos, layout])

  const handleLayoutChange = (id) => {
    if (capturing) return
    setLayoutId(id)
    setPhotos([])
  }

  const handleStartCapture = () => {
    if (!friendConnected || capturing || done) return
    socket.emit('capture-start', { roomCode, delay })
    runCaptureSequence(delay)
  }

  const handleContinue = () => {
    navigate('/photobooth/design', { state: { layoutId, photos, stripId: stripIdRef.current } })
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="max-w-[1440px] mx-auto px-6 md:px-16 py-6">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="text-lg font-extrabold text-dark">Room Name:</span>
          <span className="rounded-full bg-pink-primary text-white font-semibold px-5 py-2">{roomCode}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <span className="text-lg font-extrabold text-dark">Layout:</span>
          <div className="relative">
            <select
              value={layoutId}
              disabled={capturing}
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
          <div className="relative">
            <select
              value={delay}
              disabled={capturing}
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
        </div>

        <div className="mt-6 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5">
          <div className="flex-1 flex flex-col sm:flex-row justify-center gap-5 w-full max-w-3xl">
            <div className="flex-1">
              <p className="flex items-center gap-2 font-semibold text-dark">
                <span className={`w-2.5 h-2.5 rounded-full ${localReady ? 'bg-green-500' : 'bg-gray-300'}`} />
                You
              </p>
              <div className="mt-2 relative aspect-square rounded-3xl overflow-hidden bg-neutral-800 flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ filter: filter.css, transform: 'scaleX(-1)' }}
                  className={`w-full h-full object-cover ${localReady ? '' : 'hidden'}`}
                />
                {!localReady && (
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
              </div>
            </div>

            <div className="flex-1">
              <p className="flex items-center gap-2 font-semibold text-dark">
                <span className={`w-2.5 h-2.5 rounded-full ${friendConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                {friendName || "Friend's name"}
              </p>
              <div className="mt-2 relative aspect-square rounded-3xl overflow-hidden bg-neutral-800 flex items-center justify-center">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{ filter: filter.css }}
                  className={`w-full h-full object-cover ${friendConnected ? '' : 'hidden'}`}
                />
                {!friendConnected && (
                  <p className="text-white text-base px-6 text-center">Waiting for your friend to join…</p>
                )}
              </div>
            </div>
          </div>

          {photos.length > 0 && (
            <div className="flex lg:flex-col gap-3 flex-wrap justify-center">
              {photos.map((photo, i) => (
                <div key={i} className="w-20 h-16 md:w-24 md:h-20 rounded-xl overflow-hidden bg-neutral-800">
                  <img src={photo} alt={`Pose ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          {!done ? (
            <button
              type="button"
              onClick={handleStartCapture}
              disabled={!friendConnected || capturing}
              className="inline-flex items-center gap-2 rounded-full bg-pink-primary text-white font-semibold px-7 py-3 hover:opacity-90 transition disabled:opacity-60"
            >
              <Camera size={18} />
              {capturing ? 'Capturing…' : friendConnected ? 'Start Capture' : 'Waiting for your friend…'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-full bg-pink-primary text-white font-semibold px-7 py-3 hover:opacity-90 transition"
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
      </section>

      <Footer />
    </div>
  )
}

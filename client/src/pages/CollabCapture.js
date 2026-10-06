import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ArrowRight, Camera, Check } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { LAYOUTS } from '../constants/layouts'
import { FRAME_TEMPLATES } from '../constants/frameTemplates'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import { socket } from '../services/socket'
import { composeStripPreview } from '../utils/frameCanvas'
import coinIcon from '../assets/coin.png'

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

// A STUN-only config can't punch through when both peers are behind
// different restrictive NATs (common across different wifi/mobile
// networks) — add a free public TURN relay (OpenRelay) as a fallback so
// video still connects even when a direct peer-to-peer path isn't possible.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
}

const pillBase = 'rounded-full px-4 py-2 font-semibold text-sm transition border-2 disabled:opacity-50 disabled:cursor-not-allowed'
const pillActive = 'bg-pink-primary text-white border-pink-primary'
const pillInactive = 'bg-white text-pink-primary border-pink-primary hover:bg-pink-50'

const selectClasses =
  'appearance-none rounded-full border-2 border-pink-primary bg-white text-pink-primary font-medium pl-4 pr-9 py-2 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitFor = async (checkFn, intervalMs = 150, timeoutMs = 20000) => {
  const start = Date.now()
  while (!checkFn()) {
    if (Date.now() - start > timeoutMs) return false
    await sleep(intervalMs)
  }
  return true
}

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

  const [layoutId, setLayoutId] = useState('C')
  const [delay, setDelay] = useState(3)
  const [filter, setFilter] = useState(FILTERS[0])
  const [friendName, setFriendName] = useState('')
  const [friendConnected, setFriendConnected] = useState(false)
  const [connDebug, setConnDebug] = useState({})
  const [memberCount, setMemberCount] = useState(1)
  const [localReady, setLocalReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [photos, setPhotos] = useState([])
  const [template, setTemplate] = useState(null)
  const [frameChosen, setFrameChosen] = useState(false)
  const [pendingLayoutId, setPendingLayoutId] = useState(null)
  const [pendingTemplateId, setPendingTemplateId] = useState(null)
  const [unlockedIds, setUnlockedIds] = useState(new Set())

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const pcRef = useRef(null)
  const cancelRef = useRef(false)
  const savedStripRef = useRef(false)
  const stripIdRef = useRef(location.state?.stripId || null)

  const layout = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0]
  const done = photos.length >= layout.boxes

  // Only the host picks the frame, so only the host needs to know which
  // frames they've unlocked.
  useEffect(() => {
    if (!isHost || !user) return
    supabase
      .from('unlocked_frames')
      .select('frame_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error) setUnlockedIds(new Set((data || []).map((r) => r.frame_id)))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, user])

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

  // The camera stream (and the peer's remote stream) can resolve before the
  // frame-selection gate clears — at that point the <video> elements don't
  // exist in the DOM yet, so assigning srcObject in those callbacks has
  // nothing to attach to. Once frameChosen flips true and the video tags
  // actually mount, re-attach whatever streams are already sitting in refs.
  useEffect(() => {
    if (!frameChosen) return
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
    }
  }, [frameChosen])

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc-signal', { roomCode, signal: { type: 'ice-candidate', candidate: e.candidate } })
      }
    }
    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0]
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]
      setFriendConnected(true)
      const [videoTrack] = e.streams[0].getVideoTracks()
      setConnDebug((d) => ({ ...d, remoteTrack: videoTrack ? `${videoTrack.readyState}/muted=${videoTrack.muted}` : 'none' }))
    }
    pc.oniceconnectionstatechange = () => setConnDebug((d) => ({ ...d, ice: pc.iceConnectionState }))
    pc.onconnectionstatechange = () => setConnDebug((d) => ({ ...d, conn: pc.connectionState }))
    const localTrackCount = localStreamRef.current?.getTracks().length || 0
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current))
    }
    setConnDebug((d) => ({ ...d, localTracks: localTrackCount }))
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

  // Keep the latest runCaptureSequence in a ref so the capture-start
  // listener below always calls the current version without needing to be
  // in that effect's dependency array — otherwise every captured photo
  // (which changes photos.length, one of runCaptureSequence's own deps)
  // would tear down and rebuild the whole listener effect, including the
  // WebRTC signal handler, risking a dropped ICE candidate or offer/answer
  // if one arrived in that gap.
  const runCaptureSequenceRef = useRef(runCaptureSequence)
  useEffect(() => {
    runCaptureSequenceRef.current = runCaptureSequence
  }, [runCaptureSequence])

  // Signaling + presence listeners.
  useEffect(() => {
    if (!roomCode) return

    const handleRoomUsers = (members) => {
      const friend = members.find((m) => m.id !== socket.id)
      setFriendName(friend?.name || '')
      setMemberCount(members.length)
    }

    const handleSignal = async ({ signal }) => {
      if (signal.type === 'offer') {
        // Make sure our own camera is ready before answering, so the track
        // actually gets attached instead of racing the permission prompt.
        await waitFor(() => !!localStreamRef.current)
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
      runCaptureSequenceRef.current(d)
    }

    const handleFrameSelect = ({ templateId, layoutId: chosenLayoutId }) => {
      const t = templateId ? FRAME_TEMPLATES.find((f) => f.id === templateId) : null
      setTemplate(t || null)
      setLayoutId(t ? t.layoutId : chosenLayoutId)
      setFrameChosen(true)
    }

    socket.on('room-users', handleRoomUsers)
    socket.on('webrtc-signal', handleSignal)
    socket.on('capture-start', handleCaptureStart)
    socket.on('frame-select', handleFrameSelect)

    return () => {
      socket.off('room-users', handleRoomUsers)
      socket.off('webrtc-signal', handleSignal)
      socket.off('capture-start', handleCaptureStart)
      socket.off('frame-select', handleFrameSelect)
    }
  }, [roomCode, isHost, createPeerConnection])

  // Once both the room has 2 people AND our own camera is ready — whichever
  // finishes last — the host creates the WebRTC offer. Guarding on
  // !pcRef.current makes this safe to re-run as either dependency changes.
  useEffect(() => {
    if (memberCount !== 2 || !isHost || !localReady || pcRef.current) return
    let cancelled = false
    ;(async () => {
      const pc = createPeerConnection()
      const offer = await pc.createOffer()
      if (cancelled) return
      await pc.setLocalDescription(offer)
      socket.emit('webrtc-signal', { roomCode, signal: { type: 'offer', sdp: offer } })
    })()
    return () => {
      cancelled = true
    }
  }, [memberCount, isHost, localReady, createPeerConnection, roomCode])

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

  const isOwnedTemplate = (t) => t.badge === 'Free' || unlockedIds.has(t.id)

  const handleChooseTemplate = (t) => {
    if (!isHost || !isOwnedTemplate(t)) return
    setTemplate(t)
    setLayoutId(t.layoutId)
    setPhotos([])
    setFrameChosen(true)
    socket.emit('frame-select', { roomCode, templateId: t.id, layoutId: t.layoutId })
  }

  const handleChooseLayout = (id) => {
    if (!isHost) return
    setTemplate(null)
    setLayoutId(id)
    setPhotos([])
    setFrameChosen(true)
    socket.emit('frame-select', { roomCode, templateId: null, layoutId: id })
  }

  const handleConfirmFrame = () => {
    if (pendingTemplateId) {
      const t = FRAME_TEMPLATES.find((f) => f.id === pendingTemplateId)
      if (t) handleChooseTemplate(t)
    } else if (pendingLayoutId) {
      handleChooseLayout(pendingLayoutId)
    }
  }

  const handleStartCapture = () => {
    if (!friendConnected || capturing || done) return
    socket.emit('capture-start', { roomCode, delay })
    runCaptureSequence(delay)
  }

  const handleContinue = () => {
    navigate('/photobooth/design', { state: { layoutId, template, photos, stripId: stripIdRef.current } })
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Navbar />

      <section className="flex-1 max-w-[1440px] mx-auto px-6 md:px-16 py-6">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="text-lg font-extrabold text-dark">Room Name:</span>
          <span className="rounded-full bg-pink-primary text-white font-semibold px-5 py-2">{roomCode}</span>
        </div>

        {frameChosen && (
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-dark">Frame:</span>
              <span className="rounded-full border-2 border-pink-primary text-pink-primary font-semibold px-5 py-2">
                {template ? template.name : `Layout ${layoutId} (${layout.pose})`}
              </span>
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
        )}

        {!frameChosen ? (
          isHost ? (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-dark text-center">Choose a layout</h2>
              <p className="mt-1 text-sm text-gray-500 text-center">Just picking a pose count? Pick one below.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setPendingLayoutId(l.id)
                      setPendingTemplateId(null)
                    }}
                    className="text-center"
                  >
                    <div
                      className={`${l.cols === 2 ? 'w-[184px]' : 'w-24'} rounded-2xl bg-pink-100 p-2 ${
                        pendingLayoutId === l.id ? 'ring-4 ring-pink-primary' : ''
                      }`}
                    >
                      <div className={l.cols === 2 ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
                        {Array.from({ length: l.boxes }).map((_, i) => (
                          <div key={i} className="aspect-[3/4] bg-white rounded-lg" />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-bold text-dark">Layout {l.id}</p>
                    <p className="text-xs text-gray-500">{l.pose}</p>
                  </button>
                ))}
              </div>

              <h2 className="mt-12 text-xl font-bold text-dark text-center">Or pick a designed frame</h2>
              <p className="mt-1 text-sm text-gray-500 text-center">Your friend will see whatever you pick.</p>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 max-w-[1200px] mx-auto">
                {FRAME_TEMPLATES.map((t) => {
                  const owned = isOwnedTemplate(t)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!owned}
                      onClick={() => {
                        setPendingTemplateId(t.id)
                        setPendingLayoutId(null)
                      }}
                      className="text-left group w-full max-w-[170px] mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div
                        className={`relative rounded-2xl overflow-hidden bg-gray-50 ${
                          pendingTemplateId === t.id ? 'ring-4 ring-pink-primary' : ''
                        }`}
                      >
                        {owned && (
                          <span className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-green-500 text-white text-[10px] font-bold px-2 py-1">
                            <Check size={10} strokeWidth={3} />
                            Owned
                          </span>
                        )}
                        {!owned && (
                          <span className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] font-bold px-2 py-1">
                            <img src={coinIcon} alt="" className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                        {t.type === 'image' ? (
                          <img
                            src={t.overlay}
                            alt=""
                            draggable={false}
                            className={`w-full h-auto transition group-hover:scale-105 ${!owned ? 'opacity-60' : ''}`}
                            style={{ aspectRatio: `${t.canvasWidth} / ${t.canvasHeight}` }}
                          />
                        ) : (
                          <div className="p-2" style={{ backgroundColor: t.borderColor }}>
                            <div className={LAYOUTS.find((l) => l.id === t.layoutId)?.cols === 2 ? 'grid grid-cols-2 gap-1.5' : 'flex flex-col gap-1.5'}>
                              {Array.from({ length: LAYOUTS.find((l) => l.id === t.layoutId)?.boxes || 4 }).map((_, i) => (
                                <div key={i} className="aspect-[4/3] bg-white rounded-lg" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-bold text-dark">{t.name}</p>
                    </button>
                  )
                })}
              </div>
              <p className="mt-6 text-center text-xs text-gray-400">
                Want a locked frame? Unlock it in{' '}
                <a href="/frame" className="text-pink-primary font-semibold hover:underline">
                  Browse Frames
                </a>{' '}
                first.
              </p>

              <div
                className="sticky z-40 flex justify-center py-4"
                style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                <button
                  type="button"
                  disabled={!pendingLayoutId && !pendingTemplateId}
                  onClick={handleConfirmFrame}
                  className="rounded-full bg-pink-primary text-white font-semibold px-8 py-3 shadow-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pendingTemplateId
                    ? `Continue with ${FRAME_TEMPLATES.find((f) => f.id === pendingTemplateId)?.name}`
                    : pendingLayoutId
                    ? `Continue with Layout ${pendingLayoutId}`
                    : 'Select a layout or frame to continue'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-16 text-center">
              <p className="text-gray-500">Waiting for {friendName || 'the host'} to choose a frame...</p>
            </div>
          )
        ) : (
          <>
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
                {countdown && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-6xl font-extrabold">{countdown}</span>
                  </div>
                )}
              </div>
              {/* Temporary WebRTC diagnostics — remove once the blank-remote-video bug is found. */}
              <p className="mt-1 text-[10px] text-gray-400 break-all">
                local={connDebug.localTracks ?? '?'} ice={connDebug.ice ?? '?'} conn={connDebug.conn ?? '?'} remoteTrack=
                {connDebug.remoteTrack ?? '?'}
              </p>
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
          </>
        )}
      </section>

      <Footer />
    </div>
  )
}

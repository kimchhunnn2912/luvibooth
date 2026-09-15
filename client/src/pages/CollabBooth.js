import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Copy, Check } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { socket } from '../services/socket'

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generateRoomCode = () => {
  const randomValues = new Uint32Array(6)
  crypto.getRandomValues(randomValues)
  return Array.from(randomValues, (n) => ROOM_CODE_CHARS[n % ROOM_CODE_CHARS.length]).join('')
}

const cardButtonClasses =
  'w-full rounded-full border-2 border-pink-primary bg-white text-dark font-semibold py-3.5 hover:bg-pink-50 transition'

export default function CollabBooth() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [joinError, setJoinError] = useState('')

  const displayName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Guest'

  const initial = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    if (!socket.connected) socket.connect()

    const handleRoomUsers = (members) => {
      if (roomCode && members.length >= 2) {
        navigate(`/room/${roomCode}`, { state: { isHost: true, displayName } })
      }
    }
    const handleRoomFull = () => {
      setJoinError('That room is already full.')
    }

    socket.on('room-users', handleRoomUsers)
    socket.on('room-full', handleRoomFull)
    return () => {
      socket.off('room-users', handleRoomUsers)
      socket.off('room-full', handleRoomFull)
    }
  }, [roomCode, navigate, displayName])

  const handleCreateRoom = () => {
    const code = generateRoomCode()
    setRoomCode(code)
    setCopied(false)
    if (!socket.connected) socket.connect()
    socket.emit('join-room', { roomCode: code, name: displayName })
  }

  const handleCopyCode = async () => {
    if (!roomCode) return
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
    } catch {
      // clipboard not available, ignore
    }
  }

  const handleJoinRoom = () => {
    const code = joinInput.trim().toUpperCase()
    if (!code) return
    setJoinError('')
    if (!socket.connected) socket.connect()
    socket.emit('join-room', { roomCode: code, name: displayName })
    navigate(`/room/${code}`, { state: { isHost: false, displayName } })
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="max-w-[1000px] mx-auto px-6 md:px-10 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-dark">Collaborative Booth</h1>
        <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
          Take photos together with your friends remotely or create a room or join one using a room code.
        </p>

        {roomCode ? (
          <div className="mt-14 rounded-3xl bg-pink-50 p-8 md:p-12">
            <h2 className="text-xl md:text-2xl font-bold text-pink-600">
              Room created!! Share this code with your friend
            </h2>

            <div className="mt-6 rounded-2xl bg-white py-10 px-6">
              <p className="text-4xl md:text-6xl font-extrabold tracking-[0.2em] text-pink-primary">{roomCode}</p>
              <p className="mt-3 text-pink-200">Share this code with your friend!</p>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-pink-primary bg-white text-pink-primary font-semibold px-8 py-3 hover:bg-pink-50 transition"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy code'}
            </button>

            <div className="mt-8 flex items-center justify-center gap-6">
              <div className="w-16 h-16 rounded-full border-2 border-pink-primary bg-pink-50 flex items-center justify-center text-2xl font-extrabold text-pink-primary">
                {initial}
              </div>
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-pink-200" />
            </div>
            <p className="mt-4 text-pink-600">Waiting for a friend to join...</p>
            <button
              type="button"
              onClick={handleCreateRoom}
              className="mt-4 text-sm font-semibold text-pink-primary hover:underline"
            >
              Generate a new code
            </button>
          </div>
        ) : (
          <div className="mt-14 flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-0">
            <div className="flex-1 max-w-sm mx-auto md:mx-0 rounded-3xl bg-pink-50 p-8 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-pink-primary">
                <Plus size={40} />
              </div>
              <h2 className="mt-6 text-xl font-bold text-dark">Create a room</h2>
              <p className="mt-2 text-gray-500">
                Generate a room code and share it with your friend to start a booth session together.
              </p>
              <button type="button" onClick={handleCreateRoom} className={`mt-6 ${cardButtonClasses}`}>
                Create a room
              </button>
            </div>

            <div className="hidden md:flex items-center px-6 text-gray-400">or</div>
            <div className="md:hidden text-gray-400">or</div>

            <div className="flex-1 max-w-sm mx-auto md:mx-0 rounded-3xl bg-pink-50 p-8 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-pink-primary">
                <Users size={36} />
              </div>
              <h2 className="mt-6 text-xl font-bold text-dark">Join a room</h2>
              <p className="mt-2 text-gray-500">
                Enter the room code shared by your friend to join their photobooth session.
              </p>

              <input
                type="text"
                value={joinInput}
                onChange={(e) => {
                  setJoinInput(e.target.value.toUpperCase())
                  setJoinError('')
                }}
                placeholder="Enter room code"
                maxLength={6}
                className="mt-6 w-full rounded-full border-2 border-pink-primary bg-white text-center font-semibold tracking-widest text-dark placeholder-gray-400 placeholder:font-normal placeholder:tracking-normal py-3.5 focus:outline-none"
              />
              <button type="button" onClick={handleJoinRoom} className={`mt-3 ${cardButtonClasses}`}>
                Join room
              </button>

              {joinError && <p className="mt-4 text-xs text-red-500">{joinError}</p>}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Pencil, Crown, Users, Plus, Minus, LogOut, Check, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import { saveOrShareBlob, dataUrlToBlob } from '../utils/saveFile'
import { getPlanByName } from '../constants/plans'
import coinIcon from '../assets/coin.png'

const FREE_PLAN_NAME = 'Free Plan'

const COLLAB_LIMIT = {
  'Free Plan': 0,
  'Pro Plan': 3,
  'Pro Max Plan': '∞',
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

const handleSaveStrip = async (strip) => {
  const src = strip.preview || strip.photos?.[0]
  if (!src) return
  const blob = await dataUrlToBlob(src)
  await saveOrShareBlob(blob, `luvibooth-strip-${strip.id}.jpg`, blob.type || 'image/jpeg')
}

const FILTERS = ['All', 'This month', 'Collaborative']

const pillClasses = (active) =>
  `rounded-full px-4 py-2 text-sm font-semibold border-2 transition ${
    active ? 'bg-pink-primary text-white border-pink-primary' : 'bg-white text-dark border-gray-200 hover:border-pink-200'
  }`

export default function Profile() {
  const { user, logout, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [strips, setStrips] = useState([])
  const [stripsLoading, setStripsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [planName, setPlanName] = useState(FREE_PLAN_NAME)
  const [coins, setCoins] = useState(0)
  const [planRenewDate, setPlanRenewDate] = useState(null)
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    if (!user) {
      setStrips([])
      setStripsLoading(false)
      return
    }
    setStripsLoading(true)
    supabase
      .from('photo_strips')
      .select('id, layout_id, photos, preview, collaborative, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load photo strips:', error.message)
        } else {
          setStrips(data || [])
        }
        setStripsLoading(false)
      })
  }, [user])

  useEffect(() => {
    if (!user) {
      setPlanName(FREE_PLAN_NAME)
      setCoins(0)
      setPlanRenewDate(null)
      setTransactions([])
      return
    }
    supabase
      .from('profiles')
      .select('plan, coins, plan_renew_date')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load plan info:', error.message)
          return
        }
        setPlanName(data?.plan || FREE_PLAN_NAME)
        setCoins(data?.coins || 0)
        setPlanRenewDate(data?.plan_renew_date || null)
      })
    supabase
      .from('coin_transactions')
      .select('id, title, amount, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load transactions:', error.message)
        } else {
          setTransactions(data || [])
        }
      })
  }, [user])

  const handleCancelPlan = async () => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ plan: FREE_PLAN_NAME, plan_renew_date: null })
      .eq('id', user.id)
    if (error) {
      console.error('Failed to cancel plan:', error.message)
      return
    }
    setPlanName(FREE_PLAN_NAME)
    setPlanRenewDate(null)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const firstName = user?.user_metadata?.first_name
  const lastName = user?.user_metadata?.last_name
  const fullName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    'there'
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || ''
  const initial = (firstName || fullName || user?.email || '?').charAt(0).toUpperCase()

  const handleStartEdit = () => {
    setEditFirstName(firstName || '')
    setEditLastName(lastName || '')
    setEditUsername(username || '')
    setSaveError('')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setSaveError('')
  }

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      setSaveError('Username cannot be empty.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await updateProfile({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        username: editUsername.trim().replace(/\s/g, '').toLowerCase(),
      })
      setIsEditing(false)
    } catch (err) {
      setSaveError(err.message || 'Could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const currentPlan = getPlanByName(planName)

  const STATS = [
    { label: 'Photo strips taken', value: strips.length },
    { label: 'coins remaining', value: coins, icon: coinIcon },
    { label: 'Collab sessions / day', value: COLLAB_LIMIT[planName] ?? 0, icon: Users },
  ]

  const visibleStrips = strips.filter((strip) => {
    if (filter === 'Collaborative') return strip.collaborative
    return true
  })

  return (
    <div className="min-h-dvh bg-pink-50/60">
      <Navbar />

      <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-8">
        <div className="rounded-2xl bg-white p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-20 h-20 rounded-full border-2 border-pink-primary bg-pink-50 flex items-center justify-center text-3xl font-extrabold text-pink-primary shrink-0">
            {initial}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3 max-w-sm">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary"
                  />
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary"
                  />
                </div>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
                  placeholder="username"
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-pink-primary/40 focus:border-pink-primary"
                />
                {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold text-dark">{fullName}</h1>
                {username && <p className="text-gray-500">@{username}</p>}
                <p className="text-gray-500">{user?.email}</p>
                {planName !== FREE_PLAN_NAME ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-white text-sm font-semibold px-3 py-1">
                    <Crown size={14} />
                    {planName.replace(' Plan', '')} member
                  </span>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-200 text-gray-600 text-sm font-semibold px-3 py-1">
                    Free member
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4 self-start sm:self-center">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 text-pink-primary hover:opacity-80 transition disabled:opacity-50"
                >
                  <Check size={16} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-red-500 transition disabled:opacity-50"
                >
                  <X size={16} />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-primary transition"
                >
                  <Pencil size={16} />
                  Edit profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-red-500 transition"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-3xl font-extrabold text-pink-primary">
                {stat.value}
                {stat.icon &&
                  (typeof stat.icon === 'string' ? (
                    <img src={stat.icon} alt="" className="w-6 h-6" />
                  ) : (
                    <stat.icon size={24} className="text-pink-primary" />
                  ))}
              </div>
              <p className="mt-1 text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-dark p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-white">Current Plan</h2>
              <span className="rounded-full bg-pink-primary text-white text-xs font-semibold px-3 py-1">
                {currentPlan.name}
              </span>
            </div>
            <ul className="mt-3 text-gray-300 space-y-1">
              {currentPlan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
              {planRenewDate && <li>Renews on {formatDate(planRenewDate)}</li>}
              <li>{currentPlan.price}{currentPlan.price !== '$0' ? '/month' : ''}</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {planName !== 'Pro Max Plan' && (
              <Link
                to="/pricing"
                className="text-center rounded-full bg-pink-primary text-white font-semibold px-6 py-3 hover:opacity-90 transition"
              >
                {planName === FREE_PLAN_NAME ? 'Upgrade plan' : 'Upgrade to Pro Max'}
              </Link>
            )}
            {planName !== FREE_PLAN_NAME && (
              <button
                type="button"
                onClick={handleCancelPlan}
                className="rounded-full bg-red-500 text-white font-semibold px-6 py-3 hover:opacity-90 transition"
              >
                Cancel Plan
              </button>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold text-dark">My recent photo strips</h2>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={pillClasses(filter === f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
          {visibleStrips.map((strip) => (
            <div key={strip.id} className="w-40 shrink-0 rounded-2xl overflow-hidden bg-white">
              <div className="h-56 bg-neutral-100 flex items-center justify-center">
                {strip.preview && (
                  <img src={strip.preview} alt="" className="w-full h-full object-contain" />
                )}
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-pink-50 text-xs text-pink-primary font-medium">
                <span>{formatDate(strip.created_at)}</span>
                <button type="button" onClick={() => handleSaveStrip(strip)} className="hover:underline">
                  Save
                </button>
              </div>
            </div>
          ))}
          {!stripsLoading && visibleStrips.length === 0 && (
            <p className="text-gray-400 text-sm py-6">No photo strips in this filter yet.</p>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-extrabold text-dark">Transaction history</h2>
          <div className="mt-4 space-y-3">
            {transactions.length === 0 && (
              <p className="text-gray-400 text-sm py-2">No transactions yet — coin purchases will show up here.</p>
            )}
            {transactions.map((tx) => {
              const earned = tx.amount > 0
              return (
                <div key={tx.id} className="flex items-center justify-between gap-4 rounded-xl bg-white px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white ${
                        earned ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {earned ? <Plus size={16} /> : <Minus size={16} />}
                    </div>
                    <div>
                      <p className="font-semibold text-dark">{tx.title}</p>
                      <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <span className={`font-semibold flex items-center gap-1 ${earned ? 'text-green-600' : 'text-red-500'}`}>
                    {earned ? '+' : ''}
                    {tx.amount} coins
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

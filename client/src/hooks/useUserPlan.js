import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import { FREE_PLAN_NAME } from '../constants/plans'

// Loads the signed-in user's subscription state from Supabase and derives
// the "effective" plan the same way everywhere it's needed (Profile page,
// watermarking on download, frame unlocking, etc.): an expired-but-not-
// renewed subscription counts as Free even though the stored `plan` value
// hasn't been reset, so this is computed live rather than trusted as-is.
export function useUserPlan() {
  const { user } = useAuth()
  const [planName, setPlanName] = useState(FREE_PLAN_NAME)
  const [coins, setCoins] = useState(0)
  const [planRenewDate, setPlanRenewDate] = useState(null)
  const [planCancelled, setPlanCancelled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setPlanName(FREE_PLAN_NAME)
      setCoins(0)
      setPlanRenewDate(null)
      setPlanCancelled(false)
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('profiles')
      .select('plan, coins, plan_renew_date, plan_cancelled')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load plan info:', error.message)
        } else {
          setPlanName(data?.plan || FREE_PLAN_NAME)
          setCoins(data?.coins || 0)
          setPlanRenewDate(data?.plan_renew_date || null)
          setPlanCancelled(data?.plan_cancelled || false)
        }
        setLoading(false)
      })
  }, [user])

  const isExpired = Boolean(planRenewDate) && new Date(planRenewDate) < new Date()
  const effectivePlanName = isExpired ? FREE_PLAN_NAME : planName

  return {
    user,
    planName,
    effectivePlanName,
    isExpired,
    coins,
    setCoins,
    planRenewDate,
    planCancelled,
    setPlanCancelled,
    loading,
  }
}

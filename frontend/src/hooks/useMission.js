import { useState, useEffect, useCallback } from 'react'
import { getMission } from '../utils/api.js'

export function useMission(id) {
  const [mission, setMission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await getMission(id)
      setMission(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  // Poll every 10s if active
  useEffect(() => {
    if (!mission || mission.status !== 'active') return
    const interval = setInterval(fetch, 10000)
    return () => clearInterval(interval)
  }, [mission?.status, fetch])

  return { mission, loading, error, refetch: fetch }
}

export function useMissionProgress(mission) {
  if (!mission) return { pct: 0, remaining: 0, done: false }
  const pct = Math.min(100, (parseFloat(mission.current_ton) / parseFloat(mission.goal_ton)) * 100)
  const remaining = Math.max(0, parseFloat(mission.goal_ton) - parseFloat(mission.current_ton))
  return {
    pct: Math.round(pct * 10) / 10,
    remaining: remaining.toFixed(2),
    done: mission.status === 'completed'
  }
}

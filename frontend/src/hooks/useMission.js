import { useState, useEffect, useCallback } from 'react'
import { getMission } from '../utils/api.js'

function normalizeMission(data) {
  if (!data) return data
  return {
    ...data,
    current_ton: parseFloat(data.current_ton) || 0,
    goal_ton: parseFloat(data.goal_ton) || 0,
    winner_count: parseInt(data.winner_count) || 0,
  }
}

export function useMission(id) {
  const [mission, setMission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await getMission(id)
      setMission(normalizeMission(data))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!mission || mission.status !== 'active') return
    const interval = setInterval(fetch, 10000)
    return () => clearInterval(interval)
  }, [mission?.status, fetch])

  return { mission, loading, error, refetch: fetch }
}

export function useMissionProgress(mission) {
  if (!mission) return { pct: 0, remaining: '0.00', done: false }
  const current = parseFloat(mission.current_ton) || 0
  const goal = parseFloat(mission.goal_ton) || 0
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100 * 10) / 10) : 0
  const remaining = Math.max(0, goal - current).toFixed(2)
  return {
    pct,
    remaining,
    done: mission.status === 'completed'
  }
}

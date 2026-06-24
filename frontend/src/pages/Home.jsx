import { useState, useEffect } from 'react'
import MissionCard from '../components/MissionCard.jsx'
import { getMissions } from '../utils/api.js'

export default function Home() {
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMissions({ status: 'active' })
      .then(setMissions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🎯 Missions</h1>
      <p style={{ color: 'var(--tg-hint)', fontSize: 13, marginBottom: 20 }}>
        Support live missions and get rewarded
      </p>

      {loading && <div className="spinner" />}

      {!loading && missions.length === 0 && (
        <div className="empty">
          <div className="icon">🌱</div>
          <div>No missions yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Be the first to create one!</div>
        </div>
      )}

      {missions.map(m => <MissionCard key={m.id} mission={m} />)}
    </div>
  )
}

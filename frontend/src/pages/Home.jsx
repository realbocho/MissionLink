import { useState, useEffect } from 'react'
import MissionCard from '../components/MissionCard.jsx'
import { getMissions } from '../utils/api.js'

export default function Home() {
  const [active, setActive] = useState([])
  const [completed, setCompleted] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getMissions({ status: 'active' }),
      getMissions({ status: 'completed' })
    ])
      .then(([a, c]) => {
        setActive(a)
        setCompleted(c)
      })
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

      {!loading && active.length === 0 && completed.length === 0 && (
        <div className="empty">
          <div className="icon">🌱</div>
          <div>No missions yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Be the first to create one!</div>
        </div>
      )}

      {!loading && active.map(m => <MissionCard key={m.id} mission={m} />)}

      {!loading && completed.length > 0 && (
        <>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--tg-hint)',
            margin: '24px 0 12px', letterSpacing: 0.5, textTransform: 'uppercase'
          }}>
            🏆 Achieved Missions
          </div>
          {completed.map(m => (
            <div key={m.id} style={{ opacity: 0.6 }}>
              <MissionCard mission={m} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

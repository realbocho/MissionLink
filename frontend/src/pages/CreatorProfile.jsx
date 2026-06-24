import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMissions } from '../utils/api.js'
import MissionCard from '../components/MissionCard.jsx'
import Avatar from '../components/Avatar.jsx'
import { copyToClipboard, haptic, showAlert, getCreatorDeepLink } from '../utils/telegram.js'

export default function CreatorProfile() {
  const { creatorId } = useParams()
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [creator, setCreator] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(() => navigate(-1))
    return () => { tg.BackButton.offClick(() => navigate(-1)); tg.BackButton.hide() }
  }, [navigate])

  useEffect(() => {
    Promise.all([
      getMissions({ creator_id: creatorId, status: 'active' }),
      getMissions({ creator_id: creatorId, status: 'completed' })
    ])
      .then(([active, completed]) => {
        const all = [...active, ...completed]
        setMissions(all)
        if (all.length > 0) setCreator(all[0].creator)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [creatorId])

  const handleShareProfile = () => {
    copyToClipboard(getCreatorDeepLink(creatorId))
    haptic('light')
    showAlert('Profile link copied!\nPaste it anywhere 📋')
  }

  const active = missions.filter(m => m.status === 'active')
  const completed = missions.filter(m => m.status === 'completed')
  const totalRaised = missions.reduce((s, m) => s + parseFloat(m.current_ton || 0), 0).toFixed(2)

  return (
    <div className="page" style={{ paddingTop: 12 }}>

      {/* Profile Header */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', marginBottom: 20, paddingBottom: 20,
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        {creator
          ? <Avatar user={creator} size={72} />
          : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--tg-secondary-bg)' }} />
        }
        <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>
          {creator?.first_name}{creator?.last_name ? ` ${creator.last_name}` : ''}
        </h1>
        {creator?.username && (
          <div style={{ fontSize: 14, color: 'var(--tg-hint)', marginTop: 2 }}>@{creator.username}</div>
        )}

        <div style={{ display: 'flex', gap: 28, marginTop: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{active.length}</div>
            <div style={{ fontSize: 11, color: 'var(--tg-hint)' }}>Live</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{completed.length}</div>
            <div style={{ fontSize: 11, color: 'var(--tg-hint)' }}>Completed</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{totalRaised}</div>
            <div style={{ fontSize: 11, color: 'var(--tg-hint)' }}>TON raised</div>
          </div>
        </div>

        <button
          onClick={handleShareProfile}
          style={{
            marginTop: 14,
            background: 'var(--tg-secondary-bg)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '9px 20px',
            color: 'var(--tg-text)', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          🔗 Copy Profile Link
        </button>
      </div>

      {loading && <div className="spinner" />}

      {!loading && missions.length === 0 && (
        <div className="empty">
          <div className="icon">📭</div>
          <div>No missions yet</div>
        </div>
      )}

      {!loading && missions.length > 0 && (
        <>
          <div style={{
            display: 'flex', gap: 8, marginBottom: 16,
            background: 'var(--tg-secondary-bg)',
            borderRadius: 10, padding: 4
          }}>
            {[
              { key: 'active', label: `Live (${active.length})` },
              { key: 'completed', label: `Completed (${completed.length})` }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                  background: tab === t.key ? 'var(--accent)' : 'transparent',
                  color: tab === t.key ? 'white' : 'var(--tg-hint)',
                  fontWeight: 600, fontSize: 13, transition: 'all 0.15s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'active' && (
            active.length > 0
              ? active.map(m => <MissionCard key={m.id} mission={m} />)
              : <div className="empty" style={{ padding: '24px 0' }}>No live missions</div>
          )}
          {tab === 'completed' && (
            completed.length > 0
              ? completed.map(m => <MissionCard key={m.id} mission={m} />)
              : <div className="empty" style={{ padding: '24px 0' }}>No completed missions yet</div>
          )}
        </>
      )}
    </div>
  )
}

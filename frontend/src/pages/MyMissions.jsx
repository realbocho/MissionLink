import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMissions, getMe } from '../utils/api.js'
import MissionCard from '../components/MissionCard.jsx'
import { getTgUser, copyToClipboard, haptic, showAlert, getCreatorDeepLink } from '../utils/telegram.js'

export default function MyMissions() {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const tgUser = getTgUser()

  useEffect(() => {
    if (!tgUser) return
    Promise.all([
      getMissions({ creator_id: tgUser.id }),
      getMe()
    ])
      .then(([m, u]) => { setMissions(m); setUser(u) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleShareProfile = () => {
    if (!tgUser) return
    copyToClipboard(getCreatorDeepLink(tgUser.id))
    haptic('light')
    showAlert('Profile link copied!\nPaste it anywhere 📋')
  }

  const hasWallet = !!user?.ton_wallet

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>My Missions</h1>
          <p style={{ color: 'var(--tg-hint)', fontSize: 13 }}>
            {tgUser?.username ? `@${tgUser.username}` : tgUser?.first_name}
          </p>
        </div>
        {tgUser && (
          <button
            onClick={handleShareProfile}
            style={{
              background: 'var(--tg-secondary-bg)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '8px 14px',
              color: 'var(--tg-text)', fontSize: 13, fontWeight: 600
            }}
          >
            🔗 My Link
          </button>
        )}
      </div>

      {/* Wallet status banner */}
      <div
        onClick={() => navigate('/wallet')}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', borderRadius: 'var(--radius-sm)',
          background: hasWallet ? '#10b98111' : '#ef444411',
          border: `1px solid ${hasWallet ? '#10b98133' : '#ef444433'}`,
          marginBottom: 16, cursor: 'pointer'
        }}
      >
        <span style={{ fontSize: 22 }}>{hasWallet ? '✅' : '⚠️'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: hasWallet ? 'var(--success)' : 'var(--danger)' }}>
            {hasWallet ? 'Wallet connected' : 'No wallet set'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--tg-hint)' }}>
            {hasWallet
              ? `${user.ton_wallet.slice(0, 8)}...${user.ton_wallet.slice(-6)}`
              : 'Tap to add your TON wallet and start receiving donations'
            }
          </div>
        </div>
        <span style={{ color: 'var(--tg-hint)', fontSize: 18 }}>›</span>
      </div>

      {loading && <div className="spinner" />}

      {!loading && missions.length === 0 && (
        <div className="empty">
          <div className="icon">📭</div>
          <div>No missions yet</div>
          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
            style={{ marginTop: 16, width: 'auto', padding: '12px 24px' }}
          >
            Create your first mission
          </button>
        </div>
      )}

      {missions.filter(m => m.status === 'active').length > 0 && (
        <>
          <div className="label" style={{ marginBottom: 8 }}>Live</div>
          {missions.filter(m => m.status === 'active').map(m => <MissionCard key={m.id} mission={m} />)}
        </>
      )}

      {missions.filter(m => m.status === 'completed').length > 0 && (
        <>
          <div className="label" style={{ marginTop: 8, marginBottom: 8 }}>Completed</div>
          {missions.filter(m => m.status === 'completed').map(m => <MissionCard key={m.id} mission={m} />)}
        </>
      )}
    </div>
  )
}

import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/', icon: '🔍', label: 'Explore' },
  { path: '/create', icon: '✨', label: 'Create' },
  { path: '/my', icon: '👤', label: 'My Missions' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--tg-secondary-bg)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 100
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1, background: 'none', border: 'none',
              padding: '10px 0 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: active ? 'var(--accent)' : 'var(--tg-hint)',
              transition: 'color 0.15s'
            }}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

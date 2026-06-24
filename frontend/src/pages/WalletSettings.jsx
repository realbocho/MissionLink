import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../utils/api.js'
import api from '../utils/api.js'
import { haptic, showAlert } from '../utils/telegram.js'

const PLATFORM_WALLET = 'UQAfdeijx6QgEcO97eVfSsTYtC20_-bfLePj7Bl2162XIkjG'
const PLATFORM_FEE_PCT = 10

export default function WalletSettings() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [wallet, setWallet] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(() => navigate(-1))
    return () => { tg.BackButton.offClick(() => navigate(-1)); tg.BackButton.hide() }
  }, [navigate])

  useEffect(() => {
    getMe()
      .then(u => { setUser(u); setWallet(u.ton_wallet || '') })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const trimmed = wallet.trim()
    if (trimmed && !/^[UE]Q[A-Za-z0-9_-]{46}$/.test(trimmed)) {
      return showAlert('Invalid TON address.\nIt should start with UQ or EQ and be 48 characters long.')
    }
    haptic('medium')
    setSaving(true)
    try {
      await api.patch('/users/me', { ton_wallet: trimmed || null })
      haptic('success')
      showAlert(trimmed ? 'Wallet saved! You can now receive donations.' : 'Wallet removed.')
      navigate(-1)
    } catch (e) {
      showAlert(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 32 }}><div className="spinner" /></div>

  return (
    <div className="page" style={{ paddingTop: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>💎 Wallet Settings</h1>
      <p style={{ color: 'var(--tg-hint)', fontSize: 13, marginBottom: 20 }}>
        Set your TON wallet to receive donations from your missions.
      </p>

      {/* Fee notice */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf611, #ec489911)',
        border: '1px solid #8b5cf633',
        borderRadius: 'var(--radius)',
        padding: 16,
        marginBottom: 16
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>📢 Platform Fee</div>
        <p style={{ fontSize: 13, color: 'var(--tg-hint)', lineHeight: 1.6 }}>
          MissionLink charges a <b style={{ color: 'var(--accent)' }}>{PLATFORM_FEE_PCT}% platform fee</b> on all donations.
          When a supporter donates, the TON is automatically split at the moment of payment:
        </p>
        <div style={{
          display: 'flex', gap: 8, marginTop: 12,
          background: 'var(--tg-bg)', borderRadius: 10, padding: 12
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>90%</div>
            <div style={{ fontSize: 12, color: 'var(--tg-hint)', marginTop: 2 }}>To your wallet</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--tg-hint)' }}>→</div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>10%</div>
            <div style={{ fontSize: 12, color: 'var(--tg-hint)', marginTop: 2 }}>Platform fee</div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--tg-hint)', marginTop: 10, lineHeight: 1.5 }}>
          Both transfers happen in a single transaction — no manual splits, no delays.
          The platform fee supports MissionLink's development and operations.
        </p>
      </div>

      <div className="card">
        <div className="label">Your TON Wallet Address</div>
        <input
          className="input"
          placeholder="UQ... or EQ..."
          value={wallet}
          onChange={e => setWallet(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
        {wallet && !/^[UE]Q[A-Za-z0-9_-]{46}$/.test(wallet.trim()) && (
          <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>
            ⚠️ Invalid address format
          </div>
        )}
        {user?.ton_wallet && (
          <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 6 }}>
            ✓ Current: {user.ton_wallet.slice(0, 8)}...{user.ton_wallet.slice(-6)}
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--tg-hint)', marginTop: 8, lineHeight: 1.5 }}>
          Get your address from Tonkeeper, TonSpace, or any TON wallet app.
          Must start with <code style={{ background: 'var(--tg-bg)', padding: '1px 4px', borderRadius: 4 }}>UQ</code> or <code style={{ background: 'var(--tg-bg)', padding: '1px 4px', borderRadius: 4 }}>EQ</code>.
        </div>
      </div>

      {!user?.ton_wallet && (
        <div style={{
          background: '#ef444411', border: '1px solid #ef444433',
          borderRadius: 'var(--radius)', padding: 14, marginBottom: 12,
          fontSize: 13, color: '#ef4444', lineHeight: 1.5
        }}>
          ⚠️ You need to set a wallet before creating missions. Supporters cannot donate without it.
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Wallet'}
      </button>

      {user?.ton_wallet && (
        <button
          className="btn-secondary"
          style={{ marginTop: 10, borderColor: 'var(--danger)', color: 'var(--danger)' }}
          onClick={() => { setWallet(''); }}
        >
          Remove Wallet
        </button>
      )}
    </div>
  )
}

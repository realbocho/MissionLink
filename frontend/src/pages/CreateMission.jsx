import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMission, getMe } from '../utils/api.js'
import { haptic, showAlert } from '../utils/telegram.js'

const DEFAULT_TIERS = [
  { name: 'Supporter', amount_ton: '1' },
  { name: 'Fan', amount_ton: '5' },
  { name: 'VIP', amount_ton: '10' },
]

function Toggle({ checked, onChange }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 26 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 99,
        background: checked ? 'var(--accent)' : 'var(--tg-hint)',
        cursor: 'pointer', transition: 'background 0.2s'
      }}>
        <span style={{
          position: 'absolute', top: 3, left: checked ? 22 : 3,
          width: 20, height: 20, background: 'white', borderRadius: '50%',
          transition: 'left 0.2s'
        }} />
      </span>
    </label>
  )
}

export default function CreateMission() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [checkingWallet, setCheckingWallet] = useState(true)
  const [hasWallet, setHasWallet] = useState(false)
  const [useTiers, setUseTiers] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', goal_ton: '',
    winner_count: '1', weighted: true, tiers: DEFAULT_TIERS
  })

  useEffect(() => {
    getMe()
      .then(u => setHasWallet(!!u.ton_wallet))
      .catch(console.error)
      .finally(() => setCheckingWallet(false))
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setTier = (i, key, val) => setForm(f => {
    const tiers = [...f.tiers]; tiers[i] = { ...tiers[i], [key]: val }; return { ...f, tiers }
  })
  const addTier = () => setForm(f => ({ ...f, tiers: [...f.tiers, { name: '', amount_ton: '' }] }))
  const removeTier = (i) => setForm(f => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }))

  const handleSubmit = async () => {
    if (!form.title.trim()) return showAlert('Please enter a mission title')
    if (!form.description.trim()) return showAlert('Please describe the reward')
    if (!form.goal_ton || parseFloat(form.goal_ton) <= 0) return showAlert('Please enter a goal amount in TON')
    haptic('medium')
    setLoading(true)
    try {
      const mission = await createMission({
        title: form.title.trim(), description: form.description.trim(),
        goal_ton: parseFloat(form.goal_ton),
        winner_count: form.winner_count === '' ? 1 : parseInt(form.winner_count),
        weighted: form.weighted,
        tiers: useTiers ? form.tiers.filter(t => t.name && t.amount_ton) : []
      })
      haptic('success')
      navigate(`/mission/${mission.id}`)
    } catch (e) {
      showAlert(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingWallet) return <div style={{ padding: 32 }}><div className="spinner" /></div>

  // Block if no wallet
  if (!hasWallet) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>💎</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Connect your wallet first</h2>
        <p style={{ color: 'var(--tg-hint)', fontSize: 14, lineHeight: 1.6, marginBottom: 24, maxWidth: 280 }}>
          You need to add a TON wallet address before creating missions so supporters can send you donations.
        </p>
        <button className="btn-primary" style={{ width: 'auto', padding: '13px 28px' }} onClick={() => navigate('/wallet')}>
          Set Up Wallet
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>✨ Create Mission</h1>

      <div className="card">
        <div className="label">Mission Title</div>
        <input className="input" placeholder="e.g. Dinner date if we hit 100 TON!" value={form.title} onChange={e => set('title', e.target.value)} maxLength={80} />
      </div>

      <div className="card">
        <div className="label">Reward Description</div>
        <textarea className="input" placeholder="Describe what you'll do when the goal is reached. Be specific — your supporters want to know exactly what they're funding!" value={form.description} onChange={e => set('description', e.target.value)} rows={4} />
      </div>

      <div className="card">
        <div className="label">Goal Amount (TON)</div>
        <input className="input" type="number" placeholder="e.g. 100" value={form.goal_ton} onChange={e => set('goal_ton', e.target.value)} min="0.1" step="0.1" />
      </div>

      <div className="card">
        <div className="label">Number of Winners</div>
        <input className="input" type="number" placeholder="1" value={form.winner_count} onChange={e => set('winner_count', e.target.value)} min="0" />
        <div style={{ fontSize: 12, color: 'var(--tg-hint)', marginTop: 6 }}>Set to 0 to reward all supporters (or leave blank for random draw)</div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Weighted Draw</div>
            <div style={{ fontSize: 12, color: 'var(--tg-hint)' }}>Higher donations = higher win chance</div>
          </div>
          <Toggle checked={form.weighted} onChange={e => set('weighted', e.target.checked)} />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: useTiers ? 12 : 0 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Donation Tiers</div>
            <div style={{ fontSize: 12, color: 'var(--tg-hint)' }}>Optional — free amount if off</div>
          </div>
          <Toggle checked={useTiers} onChange={e => setUseTiers(e.target.checked)} />
        </div>
        {useTiers && (
          <>
            {form.tiers.map((tier, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input className="input" placeholder="Tier name" value={tier.name} onChange={e => setTier(i, 'name', e.target.value)} style={{ flex: 1.5 }} />
                <input className="input" type="number" placeholder="TON" value={tier.amount_ton} onChange={e => setTier(i, 'amount_ton', e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => removeTier(i)} style={{ background: 'none', color: 'var(--danger)', fontSize: 20, padding: '0 4px' }}>×</button>
              </div>
            ))}
            <button onClick={addTier} style={{ color: 'var(--accent)', background: 'none', fontSize: 14, padding: '8px 0' }}>+ Add tier</button>
          </>
        )}
      </div>

      <div style={{ padding: '10px 14px', background: 'var(--tg-secondary-bg)', borderRadius: 10, marginBottom: 12, fontSize: 12, color: 'var(--tg-hint)' }}>
        💡 A 10% platform fee applies to all donations. Supporters see a clear breakdown before paying.
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Creating...' : '🚀 Launch Mission'}
      </button>
    </div>
  )
}

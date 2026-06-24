import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { useMission, useMissionProgress } from '../hooks/useMission.js'
import ProgressBar from '../components/ProgressBar.jsx'
import Avatar from '../components/Avatar.jsx'
import { createDonation } from '../utils/api.js'
import { haptic, showAlert, showConfirm, getMissionDeepLink, copyToClipboard, getTgUser } from '../utils/telegram.js'

const PLATFORM_WALLET = 'UQAfdeijx6QgEcO97eVfSsTYtC20_-bfLePj7Bl2162XIkjG'
const PLATFORM_FEE = 0.10

export default function MissionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { mission, loading, error, refetch } = useMission(id)
  const { pct, remaining, done } = useMissionProgress(mission)
  const [tonConnectUI] = useTonConnectUI()
  const walletAddress = useTonAddress()
  const [selectedTier, setSelectedTier] = useState(null)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [donating, setDonating] = useState(false)
  const tgUser = getTgUser()

  const isCreator = tgUser && mission && String(tgUser.id) === String(mission.creator_id)
  const getAmount = () => selectedTier ? parseFloat(selectedTier.amount_ton) : parseFloat(customAmount) || 0

  // Split amounts
  const getSplit = (total) => {
    const fee = Math.round(total * PLATFORM_FEE * 1e9)        // nanoTON to platform
    const creator = Math.round(total * 1e9) - fee              // nanoTON to creator
    return { creatorNano: creator.toString(), feeNano: fee.toString() }
  }

  const handleDonate = async () => {
    const amount = getAmount()
    if (amount <= 0) return showAlert('Please enter a donation amount')

    if (!mission.creator?.ton_wallet) {
      return showAlert("This creator hasn't set up their wallet yet.\nThey need to add a TON wallet before accepting donations.")
    }

    if (!walletAddress) {
      haptic('medium')
      return tonConnectUI.openModal()
    }

    haptic('medium')
    setDonating(true)
    try {
      const { creatorNano, feeNano } = getSplit(amount)

      // Single transaction with 2 messages: creator (90%) + platform (10%)
      const tx = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: mission.creator.ton_wallet,
            amount: creatorNano,
            payload: btoa(`missionlink:${id}`)
          },
          {
            address: PLATFORM_WALLET,
            amount: feeNano,
            payload: btoa(`fee:${id}`)
          }
        ]
      })

      await createDonation({
        mission_id: id,
        amount_ton: amount,
        tx_hash: tx.boc,
        message: message.trim() || null
      })

      haptic('success')
      showAlert(
        `🎉 ${amount} TON sent!\n\n` +
        `${(amount * 0.9).toFixed(3)} TON → Creator\n` +
        `${(amount * 0.1).toFixed(3)} TON → Platform fee\n\n` +
        `Your donation will be confirmed within 1–2 minutes.`
      )
      setCustomAmount('')
      setSelectedTier(null)
      setMessage('')
      setTimeout(refetch, 5000)
    } catch (e) {
      if (!e.message?.includes('User rejects')) {
        showAlert('Something went wrong: ' + e.message)
      }
    } finally {
      setDonating(false)
    }
  }

  const handleShare = () => {
    copyToClipboard(getMissionDeepLink(id))
    haptic('light')
    showAlert('Mission link copied!\nPaste it anywhere 📋')
  }

  const handleCancel = async () => {
    const ok = await showConfirm('Cancel this mission? This cannot be undone.')
    if (!ok) return
    const { updateMission } = await import('../utils/api.js')
    await updateMission(id, { status: 'cancelled' })
    refetch()
  }

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(() => navigate(-1))
    return () => { tg.BackButton.offClick(() => navigate(-1)); tg.BackButton.hide() }
  }, [navigate])

  if (loading) return <div style={{ padding: 32 }}><div className="spinner" /></div>
  if (error) return <div className="page"><div className="empty">❌ {error}</div></div>
  if (!mission) return null

  const tiers = mission.tiers?.sort((a, b) => a.sort_order - b.sort_order) || []
  const donations = mission.donations || []
  const donorCount = new Set(donations.map(d => d.donor_id)).size
  const amount = getAmount()
  const creatorHasWallet = !!mission.creator?.ton_wallet

  return (
    <div className="page" style={{ paddingTop: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
        <Avatar user={mission.creator} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--tg-hint)' }}>
            {mission.creator?.username ? `@${mission.creator.username}` : mission.creator?.first_name}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{mission.title}</h1>
        </div>
        <span className={`badge badge-${mission.status}`}>
          {mission.status === 'active' ? 'Live' : mission.status === 'completed' ? 'Achieved! 🎉' : 'Cancelled'}
        </span>
      </div>

      {/* Progress */}
      <div className="card">
        <ProgressBar pct={pct} current={mission.current_ton} goal={mission.goal_ton} />
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{donorCount}</div>
            <div style={{ fontSize: 11, color: 'var(--tg-hint)' }}>Supporters</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{remaining}</div>
            <div style={{ fontSize: 11, color: 'var(--tg-hint)' }}>TON left</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{mission.winner_count === 0 ? 'All' : mission.winner_count}</div>
            <div style={{ fontSize: 11, color: 'var(--tg-hint)' }}>Winner{mission.winner_count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* Reward */}
      <div className="card">
        <div className="label">🎁 Reward</div>
        <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{mission.description}</p>
        {mission.weighted && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--tg-bg)', borderRadius: 8, fontSize: 12, color: 'var(--tg-hint)' }}>
            💡 The more you donate, the higher your chance of winning!
          </div>
        )}
      </div>

      {/* Donate */}
      {mission.status === 'active' && !isCreator && (
        <div className="card">
          <div className="label">💜 Support</div>

          {!creatorHasWallet && (
            <div style={{ padding: 12, background: '#ef444411', borderRadius: 10,
              fontSize: 13, color: '#ef4444', marginBottom: 12 }}>
              ⚠️ This creator hasn't connected a wallet yet. Donations are currently unavailable.
            </div>
          )}

          {creatorHasWallet && (
            <>
              {tiers.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {tiers.map(tier => (
                      <button
                        key={tier.id}
                        onClick={() => { setSelectedTier(tier); setCustomAmount('') }}
                        style={{
                          padding: '10px 6px', borderRadius: 10,
                          border: `1.5px solid ${selectedTier?.id === tier.id ? 'var(--accent)' : 'transparent'}`,
                          background: selectedTier?.id === tier.id ? 'var(--accent)22' : 'var(--tg-bg)',
                          color: selectedTier?.id === tier.id ? 'var(--accent)' : 'var(--tg-text)',
                          textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{tier.amount_ton} TON</div>
                        <div style={{ fontSize: 11, color: 'var(--tg-hint)', marginTop: 2 }}>{tier.name}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tg-hint)', marginBottom: 8 }}>or enter custom amount</div>
                </>
              )}

              <input
                className="input"
                type="number"
                placeholder="Amount in TON"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedTier(null) }}
                min="0.1" step="0.1"
                style={{ marginBottom: 8 }}
              />
              <input
                className="input"
                placeholder="Leave a message (optional)"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={100}
                style={{ marginBottom: 8 }}
              />

              {/* Fee breakdown preview */}
              {amount > 0 && (
                <div style={{
                  background: 'var(--tg-bg)', borderRadius: 10,
                  padding: '10px 12px', marginBottom: 12,
                  fontSize: 12, color: 'var(--tg-hint)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Creator receives</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{(amount * 0.9).toFixed(3)} TON</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Platform fee (10%)</span>
                    <span style={{ fontWeight: 600 }}>{(amount * 0.1).toFixed(3)} TON</span>
                  </div>
                </div>
              )}

              {!walletAddress ? (
                <button className="btn-primary" onClick={() => tonConnectUI.openModal()}>
                  🔗 Connect Wallet
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={handleDonate}
                  disabled={donating || amount <= 0}
                >
                  {donating ? 'Processing...' : `Donate${amount > 0 ? ` ${amount} TON` : ''} 💜`}
                </button>
              )}

              {walletAddress && (
                <div style={{ fontSize: 11, color: 'var(--tg-hint)', textAlign: 'center', marginTop: 8 }}>
                  Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Completed banner */}
      {done && (
        <div style={{
          background: 'linear-gradient(135deg, var(--accent)22, #ec489922)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)', padding: 16,
          textAlign: 'center', marginBottom: 12
        }}>
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: 17, marginTop: 4 }}>Mission Achieved!</div>
          <div style={{ fontSize: 13, color: 'var(--tg-hint)', marginTop: 4 }}>
            Winners have been notified via Telegram DM
          </div>
        </div>
      )}

      <button className="btn-secondary" onClick={handleShare} style={{ marginBottom: 12 }}>
        🔗 Copy Mission Link
      </button>

      {isCreator && mission.status === 'active' && (
        <button
          className="btn-secondary"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginBottom: 12 }}
          onClick={handleCancel}
        >
          Cancel Mission
        </button>
      )}

      {/* Donation feed */}
      {donations.length > 0 && (
        <div className="card">
          <div className="label" style={{ marginBottom: 12 }}>Supporters</div>
          {donations.slice(0, 20).map(d => (
            <div key={d.id} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              paddingBottom: 12, marginBottom: 12,
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              <Avatar user={d.donor} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {d.donor?.username ? `@${d.donor.username}` : d.donor?.first_name}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                    +{parseFloat(d.amount_ton).toFixed(2)} TON
                  </span>
                </div>
                {d.message && (
                  <div style={{ fontSize: 12, color: 'var(--tg-hint)', marginTop: 2 }}>{d.message}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

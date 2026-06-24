import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api.js'
import { haptic, showAlert, getTgUser } from '../utils/telegram.js'

export default function RequestMission() {
  const { creatorId } = useParams()
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const tgUser = getTgUser()

  const handleSubmit = async () => {
    if (!content.trim()) return showAlert('Please describe the mission you want!')
    if (content.trim().length < 10) return showAlert('Please be more specific (at least 10 characters)')

    haptic('medium')
    setLoading(true)
    try {
      await api.post('/requests', { creator_id: parseInt(creatorId), content: content.trim() })
      haptic('success')
      showAlert('🎉 Request sent!\nThe creator will review it and set a goal amount.')
      navigate(-1)
    } catch (e) {
      showAlert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ paddingTop: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>📬 Request a Mission</h1>
      <p style={{ color: 'var(--tg-hint)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
        Tell the creator what you'd like them to do. If they accept, they'll set a goal and open it for funding!
      </p>

      <div className="card">
        <div className="label">What do you want the creator to do?</div>
        <textarea
          className="input"
          placeholder="e.g. Do a live cooking stream, post a behind-the-scenes video, sing a song of my choice..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={5}
          maxLength={300}
          autoFocus
        />
        <div style={{
          textAlign: 'right', fontSize: 12,
          color: content.length > 260 ? 'var(--danger)' : 'var(--tg-hint)',
          marginTop: 6
        }}>
          {content.length}/300
        </div>
      </div>

      <div style={{
        padding: '12px 14px', background: 'var(--tg-secondary-bg)',
        borderRadius: 'var(--radius-sm)', marginBottom: 16,
        fontSize: 13, color: 'var(--tg-hint)', lineHeight: 1.5
      }}>
        💡 The creator will set the goal amount and reward if they accept your request.
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading || content.trim().length < 10}
      >
        {loading ? 'Sending...' : '📬 Send Request'}
      </button>
    </div>
  )
}

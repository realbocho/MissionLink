import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar.jsx'
import ProgressBar from './ProgressBar.jsx'

const STATUS_LABEL = { active: 'Live', completed: 'Achieved!', cancelled: 'Cancelled' }

export default function MissionCard({ mission }) {
  const navigate = useNavigate()
  const pct = Math.min(100, Math.round(
    (parseFloat(mission.current_ton) / parseFloat(mission.goal_ton)) * 100
  ))

  return (
    <div
      className="card"
      onClick={() => navigate(`/mission/${mission.id}`)}
      style={{ cursor: 'pointer', marginBottom: 12 }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <Avatar user={mission.creator} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--tg-hint)', marginBottom: 2 }}>
            {mission.creator?.username ? `@${mission.creator.username}` : mission.creator?.first_name}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{mission.title}</div>
        </div>
        <span className={`badge badge-${mission.status}`}>{STATUS_LABEL[mission.status]}</span>
      </div>
      <p style={{
        fontSize: 13, color: 'var(--tg-hint)', marginBottom: 12,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
      }}>
        {mission.description}
      </p>
      <ProgressBar pct={pct} current={mission.current_ton} goal={mission.goal_ton} />
    </div>
  )
}

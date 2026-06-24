export default function ProgressBar({ pct, current, goal }) {
  return (
    <div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--tg-hint)' }}>
          <b style={{ color: 'var(--accent)', fontSize: 15 }}>{parseFloat(current).toFixed(2)}</b> TON raised
        </span>
        <span style={{ fontSize: 13, color: 'var(--tg-hint)' }}>
          Goal {parseFloat(goal).toFixed(2)} TON · <b>{pct}%</b>
        </span>
      </div>
    </div>
  )
}

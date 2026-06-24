export default function ProgressBar({ pct, current, goal }) {
  const c = parseFloat(current) || 0
  const g = parseFloat(goal) || 0
  const p = isNaN(pct) ? 0 : pct

  return (
    <div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${p}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--tg-hint)' }}>
          <b style={{ color: 'var(--accent)', fontSize: 15 }}>{c.toFixed(2)}</b> TON raised
        </span>
        <span style={{ fontSize: 13, color: 'var(--tg-hint)' }}>
          Goal {g.toFixed(2)} TON · <b>{p}%</b>
        </span>
      </div>
    </div>
  )
}

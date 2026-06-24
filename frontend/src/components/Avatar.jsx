export default function Avatar({ user, size = 40 }) {
  const initial = (user?.first_name || user?.username || '?')[0].toUpperCase()
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {user?.photo_url
        ? <img src={user.photo_url} alt={initial} />
        : initial
      }
    </div>
  )
}

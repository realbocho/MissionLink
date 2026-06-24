import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { initTelegram } from './utils/telegram.js'
import BottomNav from './components/BottomNav.jsx'
import Home from './pages/Home.jsx'
import CreateMission from './pages/CreateMission.jsx'
import MissionDetail from './pages/MissionDetail.jsx'
import MyMissions from './pages/MyMissions.jsx'
import CreatorProfile from './pages/CreatorProfile.jsx'
import WalletSettings from './pages/WalletSettings.jsx'

export default function App() {
  const location = useLocation()
  const hideNav = ['/mission/', '/creator/', '/wallet'].some(p => location.pathname.startsWith(p))

  useEffect(() => { initTelegram() }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateMission />} />
        <Route path="/mission/:id" element={<MissionDetail />} />
        <Route path="/my" element={<MyMissions />} />
        <Route path="/creator/:creatorId" element={<CreatorProfile />} />
        <Route path="/wallet" element={<WalletSettings />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  )
}

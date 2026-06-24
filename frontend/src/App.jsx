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
import RequestMission from './pages/RequestMission.jsx'
import IncomingRequests from './pages/IncomingRequests.jsx'

const HIDE_NAV_PATHS = ['/mission/', '/creator/', '/wallet', '/requests']

export default function App() {
  const location = useLocation()
  const hideNav = HIDE_NAV_PATHS.some(p => location.pathname.startsWith(p))

  useEffect(() => { initTelegram() }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateMission />} />
        <Route path="/mission/:id" element={<MissionDetail />} />
        <Route path="/my" element={<MyMissions />} />
        <Route path="/creator/:creatorId" element={<CreatorProfile />} />
        <Route path="/creator/:creatorId/request" element={<RequestMission />} />
        <Route path="/wallet" element={<WalletSettings />} />
        <Route path="/requests" element={<IncomingRequests />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  )
}

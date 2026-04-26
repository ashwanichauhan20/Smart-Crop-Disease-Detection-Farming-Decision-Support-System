import { BrowserRouter } from 'react-router-dom'
import './App.css'
import SiteAnnouncement from './components/SiteAnnouncement/SiteAnnouncement'
import WelcomeBanner from './components/WelcomeBanner/WelcomeBanner'
import WelcomeToast from './components/WelcomeToast/WelcomeToast'
import { NotificationProvider } from './context/NotificationContext'
import { VideoCallProvider } from './context/VideoCallContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NotificationProvider>
        <VideoCallProvider>
          <SiteAnnouncement />
          <AppRoutes />
          <WelcomeToast />
          <WelcomeBanner />
        </VideoCallProvider>
      </NotificationProvider>
    </BrowserRouter>
  )
}

export default App

import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ContactUs from './pages/ContactUs'
import Pricing from './pages/Pricing'
import Photobooth from './pages/Photobooth'
import CameraCapture from './pages/CameraCapture'
import FrameDesigner from './pages/FrameDesigner'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import HelpCenter from './pages/HelpCenter'
import Profile from './pages/Profile'
import CollabBooth from './pages/CollabBooth'
import CollabCapture from './pages/CollabCapture'
import BrowseFrames from './pages/BrowseFrames'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/photobooth" element={<Photobooth />} />
            <Route path="/photobooth/capture" element={<CameraCapture />} />
            <Route path="/photobooth/design" element={<FrameDesigner />} />
            <Route path="/frame" element={<BrowseFrames />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/join" element={<CollabBooth />} />
            <Route path="/room/:roomCode" element={<CollabCapture />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/help" element={<HelpCenter />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
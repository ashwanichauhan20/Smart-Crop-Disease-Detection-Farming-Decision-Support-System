import { Navigate, Route, Routes } from 'react-router-dom'

// Pages
import AdminDashboard from '../pages/AdminDashboard/AdminDashboard'
import Community from '../pages/Community/Community'
import DiseaseDetection from '../pages/DiseaseDetection/DiseaseDetection'
import ExpertDashboard from '../pages/ExpertDashboard/ExpertDashboard'
import FarmerDashboard from '../pages/FarmerDashboard/FarmerDashboard'
import FarmerProfile from '../pages/FarmerProfile/FarmerProfile'
import Home from '../pages/Home/Home'
import Login from '../pages/Login/Login'
import ProfitPrediction from '../pages/ProfitPrediction/ProfitPrediction'
import MandiPrices from '../pages/MandiPrices/MandiPrices'
import Register from '../pages/Register/Register'
import Schemes from '../pages/Schemes/Schemes'
import VideoConsultation from '../pages/VideoConsultation/VideoConsultation'
import Weather from '../pages/Weather/Weather'

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
            <Route path="/farmer-profile" element={<FarmerProfile />} />
            <Route path="/expert-dashboard" element={<ExpertDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/disease-detection" element={<DiseaseDetection />} />
            <Route path="/profit-prediction" element={<ProfitPrediction />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/schemes" element={<Schemes />} />
            <Route path="/community" element={<Community />} />
            <Route path="/video-consultation" element={<VideoConsultation />} />
            <Route path="/mandi-prices" element={<MandiPrices />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default AppRoutes

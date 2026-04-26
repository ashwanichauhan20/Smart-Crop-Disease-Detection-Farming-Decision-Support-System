import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadToCloudinary } from '../../utils/cloudinary'
import DiseaseDetection from '../DiseaseDetection/DiseaseDetection'
import ProfitPrediction from '../ProfitPrediction/ProfitPrediction'
import Weather from '../Weather/Weather'
import Schemes from '../Schemes/Schemes'
import Community from '../Community/Community'
import VideoConsultation from '../VideoConsultation/VideoConsultation'
import MandiPrices from '../MandiPrices/MandiPrices'
import './FarmerDashboard.css'

const dashTabs = [
    { id: 'overview', icon: '🏠', title: 'Overview' },
    { id: 'disease', icon: '🔬', title: 'Detect Disease' },
    { id: 'profit', icon: '💰', title: 'Predict Profit' },
    { id: 'mandi', icon: '🏪', title: 'Mandi Prices' },
    { id: 'weather', icon: '⛅', title: 'Weather Alerts' },
    { id: 'community', icon: '🌾', title: 'Krishi Community' },
    { id: 'consult', icon: '📹', title: 'Video Consult' },
    { id: 'schemes', icon: '🏛️', title: 'Govt Schemes' },
    { id: 'profile', icon: '👤', title: 'My Profile' },
]

const recentActivity = [
    { icon: '🔬', text: 'Disease detected: Powdery Mildew on Wheat', time: '2 hrs ago', status: 'alert' },
    { icon: '⛅', text: 'Heavy rain alert for your district tomorrow', time: '5 hrs ago', status: 'warning' },
    { icon: '📞', text: 'Expert consultation booked for 15 Feb, 3PM', time: '1 day ago', status: 'success' },
    { icon: '🏛️', text: 'PM-KUSUM scheme deadline: Feb 28', time: '2 days ago', status: 'info' },
]

function FarmerDashboard() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('overview')
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const [userProfile, setUserProfile] = useState(null)
    const [stats, setStats] = useState({ detections: 0, savings: 0, calls: 0, cropsTracked: 0 })
    const [recentActs, setRecentActs] = useState([])
    const [healthStatus, setHealthStatus] = useState([])
    
    const [weatherData, setWeatherData] = useState(null)

    const [showWelcome, setShowWelcome] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [landArea, setLandArea] = useState('')
    const [securityForm, setSecurityForm] = useState({ oldPassword: '', newPassword: '' })

    // Read logged-in user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')
    
    const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'))

    useEffect(() => {
        if (!currentUser) {
            navigate('/login')
            return
        }

        // Welcome Toast Logic
        if (sessionStorage.getItem('showWelcomeToast') === 'true') {
            setShowWelcome(true)
            sessionStorage.removeItem('showWelcomeToast')
            setTimeout(() => setShowWelcome(false), 5000)
        }

        // Fetch user profile data to overwrite dummy data
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/user/${currentUser._id}`)
                const data = await res.json()
                if (data.success && data.data) {
                    setUserProfile(data.data)
                    if (data.data.stats) setStats(data.data.stats)
                    if (data.data.recentActivity) setRecentActs(data.data.recentActivity)
                    if (data.data.cropHealthStatus) setHealthStatus(data.data.cropHealthStatus)
                    if (data.data.landArea) setLandArea(data.data.landArea)
                }
            } catch (err) {
                console.error("Failed to fetch profile real data:", err)
            }
        }
        fetchProfile()

        // Fetch live weather data for top right widget
        const fetchLiveWeather = async () => {
            try {
                // If user has no city, try getting geolocation
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        const res = await fetch(`${API_BASE}/api/weather/dashboard?lat=${latitude}&lng=${longitude}`)
                        const wData = await res.json()
                        if (wData.success && wData.data?.current_weather) {
                            setWeatherData({
                                temp: wData.data.current_weather.temp,
                                city: wData.data.location.city,
                                condition: wData.data.current_weather.condition
                            })
                        }
                    },
                    (err) => {
                        console.warn("Location denied for weather, using fallback.")
                        setWeatherData({ temp: 28, city: currentUser.city || 'India', condition: 'Clear' })
                    }
                )
            } catch (err) {
                console.warn("Failed weather fetch", err)
            }
        }
        fetchLiveWeather()
        
    }, [navigate, currentUser?._id])

    const handleLogout = () => {
        localStorage.removeItem('fasalCurrentUser')
        navigate('/login')
    }

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        try {
            setIsUploading(true)
            const secureUrl = await uploadToCloudinary(file)
            
            // Update MongoDB
            const updateRes = await fetch(`${API_BASE}/api/user/${currentUser._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profilePic: secureUrl })
            })
            const updateData = await updateRes.json()
            if (updateData.success) {
                setUserProfile(updateData.data)
                // Update local storage so sidebar updates next load
                const updatedUser = { ...currentUser, profilePic: secureUrl }
                localStorage.setItem('fasalCurrentUser', JSON.stringify(updatedUser))
            }
        } catch (err) {
            console.error("Avatar upload failed:", err)
        } finally {
            setIsUploading(false)
        }
    }

    const handleSaveProfile = async () => {
        try {
            const updateRes = await fetch(`${API_BASE}/api/user/${currentUser._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ landArea: Number(landArea) })
            })
            if (updateRes.ok) {
                alert("Profile Updated Successfully!")
            }
        } catch (err) {
            console.error("Profile save failed:", err)
        }
    }

    const handleUpdatePassword = async () => {
        if (!securityForm.newPassword) return alert("Please enter a new password");
        try {
            const res = await fetch(`${API_BASE}/api/user/${currentUser._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    oldPassword: securityForm.oldPassword,
                    newPassword: securityForm.newPassword
                })
            })
            const data = await res.json()
            if (data.success) {
                alert("Password updated successfully!")
                setSecurityForm({ oldPassword: '', newPassword: '' })
            } else {
                alert(data.message || "Failed to update password")
            }
        } catch (err) {
            alert("Connection error")
        }
    }

    const displayUser = userProfile || currentUser
    const userName = displayUser?.name || 'Farmer'
    const userState = displayUser?.state || 'India'
    const joinYear = displayUser?.joinedDate ? new Date(displayUser.joinedDate).getFullYear() : 'Recently'

    return (
        <div className={`farmer-dash ${sidebarOpen ? 'sidebar-open' : ''}`}>
            {showWelcome && (
                <div className="welcome-toast animate-slideInRight" style={{ position: 'fixed', top: '20px', right: '20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎉</span>
                    <div>
                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Welcome to SmartFasal!</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>Aapka swagat hai, {userName}.</p>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`farmer-sidebar ${sidebarOpen ? 'mobile-show' : ''}`}>
                <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>×</button>
                <div className="farmer-sidebar-header">
                    <div className="farmer-avatar-small">
                        {displayUser?.profilePic ? (
                            <img src={displayUser.profilePic} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : '👨‍🌾'}
                    </div>
                    <div className="farmer-info">
                        <h3>{userName}</h3>
                        <p>{userState}</p>
                    </div>
                </div>

                <nav className="farmer-sidebar-menu">
                    {dashTabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`farmer-sidebar-link ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSidebarOpen(false);
                            }}
                        >
                            <span>{tab.icon}</span> {tab.title}
                        </button>
                    ))}
                </nav>

                <div className="farmer-sidebar-footer">
                    <button className="farmer-home-btn" onClick={() => navigate('/')}>
                        <span>🏠</span> Back to Site
                    </button>
                    <button className="farmer-logout-btn" onClick={handleLogout}>
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="farmer-main">
                <header className="farmer-main-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(true)}>☰</button>
                        <h2>
                            {dashTabs.find(t => t.id === activeTab)?.icon} {dashTabs.find(t => t.id === activeTab)?.title}
                        </h2>
                    </div>
                    <div className="farmer-header-actions">
                        <div className="weather-mini" style={{ background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#333' }}>
                            <span style={{ fontSize: '1.2rem' }}>{weatherData?.condition === 'Rain' ? '🌧️' : weatherData?.condition === 'Cloudy' ? '☁️' : '🌤️'}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', lineHeight: '1' }}>{weatherData ? `${weatherData.temp}°C` : '...'}</span>
                                <span style={{ fontSize: '0.65rem', color: '#666' }}>{weatherData?.city || 'Fetching...'}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="farmer-content">
                    {activeTab === 'overview' && (
                        <div className="dash-page">
                    <div className="container">

                        {/* Stats Row */}
                        <div className="dash-stats">
                            {[
                                { icon: '🔬', label: 'Detections Done', value: stats.detections },
                                { icon: '💰', label: 'Estimated Savings', value: `₹${(stats.detections * 200) + (stats.cropsTracked * 400)}` },
                                { icon: '📞', label: 'Expert Calls', value: stats.calls },
                                { icon: '🌾', label: 'Crops Tracked', value: stats.cropsTracked },
                            ].map(s => (
                                <div key={s.label} className="dash-stat-card">
                                    <span className="dash-stat-icon">{s.icon}</span>
                                    <p className="dash-stat-value">{s.value}</p>
                                    <p className="dash-stat-label">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Main Dashboard Grid */}
                        <div className="dash-main-grid">

                            {/* Feature Cards */}
                            <div className="dash-features">
                                <h2 className="dash-section-title">Overview Options</h2>
                                <div className="dash-cards-grid">
                                    {[
                                        { id: 'disease', icon: '🔬', title: 'Detect Disease', color: '#2E7D32' },
                                        { id: 'profit', icon: '💰', title: 'Predict Profit', color: '#FFA000' },
                                        { id: 'weather', icon: '⛅', title: 'Weather Alerts', color: '#0288D1' },
                                    ].map(card => (
                                        <button onClick={() => setActiveTab(card.id)} key={card.title} className="dash-feature-card" style={{ '--card-accent': card.color, textAlign: 'left', background: 'white', border: '1px solid #ccc' }}>
                                            <div className="dfc-icon" style={{ background: `${card.color}18` }}>
                                                {card.icon}
                                            </div>
                                            <h3>{card.title}</h3>
                                            <span className="dfc-arrow">→</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="dash-sidebar">
                                <div className="activity-panel">
                                    <h2 className="dash-section-title">Recent Activity</h2>
                                    <div className="activity-list">
                                        {recentActs.length > 0 ? recentActs.map((act, i) => (
                                    <div key={i} className="activity-item animate-fadeInRight" style={{ animationDelay: `${i * 0.1}s` }}>
                                        <div className={`activity-icon ${act.status}`}>{act.icon}</div>
                                        <div className="activity-details">
                                            <p>{act.text}</p>
                                            <span>{act.time}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌱</div>
                                        <p>No recent activity.</p>
                                        <small>Start by detecting a disease or booking a consultation.</small>
                                    </div>
                                )}
                                    </div>
                                </div>

                                <div className="crop-health-panel">
                                    <h2 className="dash-section-title">Crop Health Status</h2>
                                    {healthStatus.length > 0 ? healthStatus.map(c => (
                                        <div key={c.crop} className="crop-health-item">
                                            <div className="crop-health-header">
                                                <span>🌾 {c.crop}</span>
                                                <span className={`crop-health-status ${c.health > 80 ? 'good' : 'warn'}`}>{c.status}</span>
                                            </div>
                                            <div className="crop-health-bar">
                                                <div className="crop-health-fill" style={{ width: `${c.health}%`, background: c.health > 80 ? 'var(--primary)' : 'var(--secondary)' }} />
                                            </div>
                                            <span className="crop-health-pct">{c.health}%</span>
                                        </div>
                                    )) : (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Add crops in the platform to track their health globally here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

                    {activeTab === 'profile' && (
                        <div className="profile-section-dash animate-fadeIn">
                            <div className="profile-header-card">
                                <div className="ph-avatar-large" style={{ position: 'relative' }}>
                                    {displayUser?.profilePic ? (
                                        <img src={displayUser.profilePic} alt="Profile" style={{ opacity: isUploading ? 0.5 : 1 }} />
                                    ) : (
                                        <span style={{ opacity: isUploading ? 0.5 : 1 }}>👨‍🌾</span>
                                    )}
                                    {isUploading && <div className="spinner-small-green" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '24px', height: '24px' }} />}
                                    <label className="edit-avatar-btn" title="Change Photo" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, padding: 0 }}>
                                        📷
                                        <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                                    </label>
                                </div>
                                <div className="ph-info-main">
                                    <h2>{userName}</h2>
                                    <p className="ph-badge">Farmer Account • {userState}</p>
                                    <p className="ph-joined">Joined: {joinYear}</p>
                                </div>
                            </div>

                            <div className="profile-details-grid">
                                <div className="profile-card profile-info">
                                    <h3>👤 Personal Information</h3>
                                    <div className="p-field">
                                        <label>Full Name</label>
                                        <input type="text" defaultValue={userName} />
                                    </div>
                                    <div className="p-field">
                                        <label>Email Address</label>
                                        <input type="email" defaultValue={currentUser?.email || 'N/A'} disabled />
                                    </div>
                                    <div className="p-field">
                                        <label>Mobile Number</label>
                                        <input type="text" defaultValue={displayUser?.mobile ? `+91 ${displayUser.mobile}` : '+91 1234567890'} />
                                    </div>
                                    <button className="save-profile-btn" onClick={handleSaveProfile}>Save Changes</button>
                                </div>

                                <div className="profile-card profile-security">
                                    <h3>🛡️ Account Security</h3>
                                    <div className="p-field">
                                        <label>Current Password</label>
                                        <input 
                                            type="password" 
                                            value={securityForm.oldPassword}
                                            onChange={(e) => setSecurityForm({...securityForm, oldPassword: e.target.value})}
                                            placeholder="••••••••" 
                                        />
                                    </div>
                                    <div className="p-field">
                                        <label>New Password</label>
                                        <input 
                                            type="password" 
                                            value={securityForm.newPassword}
                                            onChange={(e) => setSecurityForm({...securityForm, newPassword: e.target.value})}
                                            placeholder="Enter new password" 
                                        />
                                    </div>
                                    <button className="update-pass-btn" onClick={handleUpdatePassword}>Update Password</button>
                                </div>

                                <div className="profile-card profile-farm">
                                    <h3>🌾 Farm Details</h3>
                                    <div className="p-field">
                                        <label>Total Land Area (Acres)</label>
                                        <input 
                                            type="number" 
                                            value={landArea} 
                                            onChange={(e) => setLandArea(e.target.value)} 
                                            placeholder="e.g. 5" 
                                            min="0" step="0.1" 
                                        />
                                    </div>
                                    <div className="p-field">
                                        <label>Primary Crops</label>
                                        <div className="crop-chips">
                                            <span>Wheat</span> <span>Rice</span> <span>Cotton</span>
                                            <button className="add-chip">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Injections */}
                    {activeTab === 'disease' && <DiseaseDetection isTab={true} />}
                    {activeTab === 'profit' && <ProfitPrediction isTab={true} />}
                    {activeTab === 'mandi' && <MandiPrices isTab={true} />}
                    {activeTab === 'weather' && <Weather isTab={true} />}
                    {activeTab === 'community' && <Community isTab={true} />}
                    {activeTab === 'consult' && <VideoConsultation isTab={true} />}
                    {activeTab === 'schemes' && <Schemes isTab={true} />}

                </div>
            </main>
        </div>
    )
}

export default FarmerDashboard

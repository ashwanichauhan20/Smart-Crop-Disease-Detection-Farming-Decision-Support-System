import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './WelcomeBanner.css'

function WelcomeBanner() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if we need to show the welcome banner
        const shouldShow = sessionStorage.getItem('showWelcomeBanner')
        if (shouldShow === 'true') {
            const currentUserData = localStorage.getItem('fasalCurrentUser')
            let currentUser = null
            try { currentUser = JSON.parse(currentUserData) } catch (e) { console.error('Error parsing user', e) }

            if (currentUser && typeof currentUser === 'object' && currentUser?.role !== 'admin') { // Admins skip the banner
                setUser(currentUser)
                setIsVisible(true)
            }
            // Clear the flag so it only shows once per login
            sessionStorage.removeItem('showWelcomeBanner')
        }
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        if (user?.role === 'expert') navigate('/expert-dashboard')
        else navigate('/farmer-dashboard')
    }

    if (!isVisible || !user || typeof user !== 'object') return null

    const isExpert = user?.role === 'expert'

    // Safely cast variables to strings to prevent React from throwing "Objects are not valid as a React child"
    // in case local storage data was corrupted into nested objects.
    const displayName = String(user.name || user.fullName || user.email || 'User')
    const displayMeta = String(user.mobile || user.email || '')
    const displaySpec = user.specialization ? String(user.specialization) : ''

    return (
        <div className="wb-overlay">
            <div className={`wb-card ${isExpert ? 'expert-card' : 'farmer-card'}`}>
                <div className="wb-close" onClick={handleClose}>✕</div>

                <div className="wb-header-img">
                    <div className="wb-glass-glow" />
                    <div className="wb-avatar">
                        {isExpert ? '👨‍⚕️' : '👨‍🌾'}
                    </div>
                </div>

                <div className="wb-content">
                    <h2 className="wb-title">Welcome Back!</h2>
                    <h3 className="wb-name">{displayName === '[object Object]' ? 'User' : displayName}</h3>

                    <div className="wb-details">
                        {isExpert && displaySpec && (
                            <div className="wb-detail-row">
                                <span className="wb-icon">🎓</span>
                                <span className="wb-text">{displaySpec === '[object Object]' ? '' : displaySpec}</span>
                            </div>
                        )}
                        <div className="wb-detail-row">
                            <span className="wb-icon">📱</span>
                            <span className="wb-text">{displayMeta === '[object Object]' ? '' : displayMeta}</span>
                        </div>
                    </div>

                    <p className="wb-msg">
                        {isExpert
                            ? 'Your farmers are waiting for your expert advice. Let\'s make agriculture smarter today.'
                            : 'Ready to protect your crops and maximize your profit? Your Smart-Fasal dashboard is ready.'}
                    </p>

                    <div className="wb-quick-actions">
                        <p className="qa-label">Quick Actions</p>
                        <div className="qa-grid">
                            {!isExpert ? (
                                <>
                                    <button className="qa-btn" onClick={() => navigate('/disease-detection')}>
                                        <span>🔬</span> Scan Crop
                                    </button>
                                    <button className="qa-btn" onClick={() => navigate('/profit-prediction')}>
                                        <span>💰</span> Plan Profit
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="qa-btn" onClick={() => navigate('/expert-dashboard')}>
                                        <span>📅</span> My Schedule
                                    </button>
                                    <button className="qa-btn" onClick={() => navigate('/community')}>
                                        <span>💬</span> Discussions
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <button className="wb-btn" onClick={handleClose}>
                        Go to Dashboard →
                    </button>
                </div>
            </div>
        </div>
    )
}

export default WelcomeBanner

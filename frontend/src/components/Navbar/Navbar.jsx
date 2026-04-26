import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import LoginModal from '../LoginModal/LoginModal'
import './Navbar.css'

const navLinks = [
    { label: 'Detect Disease', path: '/disease-detection' },
    { label: 'Profit Prediction', path: '/profit-prediction' },
    { label: 'Weather', path: '/weather' },
    { label: 'Schemes', path: '/schemes' },
    { label: 'Community', path: '/community' },
    { label: 'Video Consult', path: '/video-consultation' },
]

function getInitials(name = '') {
    return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [loginModalOpen, setLoginModalOpen] = useState(false)
    const dropdownRef = useRef(null)
    const notifRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

    // Sync user data from backend to ensure profilePic etc are always up-to-date
    useEffect(() => {
        const stored = localStorage.getItem('fasalCurrentUser')
        if (stored) {
            const user = JSON.parse(stored)
            const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
            
            // Re-fetch minimal user info to ensure persistence across refreshes
            fetch(`${API_BASE}/api/user/${user._id || user.id}`)
                .then(res => res.json())
                .then(json => {
                    if (json.success && json.data) {
                        const updated = { ...user, ...json.data }
                        localStorage.setItem('fasalCurrentUser', JSON.stringify(updated))
                        setCurrentUser(updated)
                    }
                })
                .catch(err => console.warn('User sync failed', err))
        }
    }, [])

    // Re-read user from localStorage whenever route changes (keep original logic for fast UI updates)
    useEffect(() => {
        const stored = localStorage.getItem('fasalCurrentUser')
        setCurrentUser(stored ? JSON.parse(stored) : null)
    }, [location.pathname])

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const isActive = (path) => location.pathname === path

    const handleLogout = () => {
        localStorage.removeItem('fasalCurrentUser')
        setCurrentUser(null)
        setDropdownOpen(false)
        navigate('/')
    }

    const dashboardPath =
        currentUser?.role === 'expert' ? '/expert-dashboard'
            : currentUser?.role === 'admin' ? '/admin-dashboard'
                : '/farmer-dashboard'

    const getSafeName = (user) => {
        if (!user) return 'User'
        if (typeof user === 'string') return 'User' // Handle if user got saved as a literal string
        const nameField = user.name || user.fullName || user.email
        if (typeof nameField === 'string') return nameField
        return 'User' // Fallback if nameField is an object/array
    }

    const displayName = getSafeName(currentUser)

    return (
        <>
            <nav className="navbar">
                <div className="navbar-inner container">
                    {/* Logo */}
                    <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
                        <span className="logo-icon">🌿</span>
                        <span className="logo-text">
                            <span className="logo-main">Smart-Fasal</span>
                            <span className="logo-sub"> Suraksha</span>
                        </span>
                    </Link>

                    {/* Desktop Nav Links */}
                    <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                        {navLinks.filter(link => currentUser?.role !== 'admin' && currentUser?.role !== 'expert').map((link) => (
                            <li key={link.path}>
                                <Link
                                    to={link.path}
                                    className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* CTA / User Avatar */}
                    <div className={`navbar-actions ${menuOpen ? 'open' : ''}`}>
                        {/* Google Translate Widget */}
                        <div id="google_translate_element" style={{ marginRight: '1rem', marginTop: '4px' }}></div>
                        
                        {currentUser ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {/* Notification Bell */}
                                <div className="nav-notif-menu" ref={notifRef} style={{ position: 'relative' }}>
                                    <button
                                        className="nav-bell-btn"
                                        onClick={() => setNotifOpen(!notifOpen)}
                                        style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', position: 'relative' }}
                                    >
                                        🔔
                                        {unreadCount > 0 && (
                                            <span style={{ position: 'absolute', top: 0, right: 0, background: '#f44336', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {notifOpen && (
                                        <div className="nav-notif-dropdown" style={{ position: 'absolute', top: '120%', right: '-30px', background: 'white', width: '300px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #eee', background: '#f8fafc' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem' }}>Notifications</h4>
                                                {unreadCount > 0 && <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: '#2E7D32', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
                                            </div>
                                            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                                {notifications.length === 0 ? (
                                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>📭 No notifications yet.</div>
                                                ) : (
                                                    notifications.map(n => {
                                                        const isUnread = currentUser && n.readBy && !n.readBy.includes(currentUser.email);
                                                        return (
                                                            <div key={n.id} onClick={() => markAsRead(n.id)} style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', background: isUnread ? '#f0fdf4' : 'white', cursor: 'pointer', transition: 'background 0.2s' }}>
                                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                                    <span style={{ fontSize: '1.2rem', margin: '-2px 0 0 0' }}>
                                                                        {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : n.type === 'error' ? '❌' : 'ℹ️'}
                                                                    </span>
                                                                    <div>
                                                                        <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#333' }}>{n.title}</h5>
                                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', lineHeight: 1.4 }}>{n.message}</p>
                                                                        <span style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.25rem', display: 'block' }}>{n.date}</span>
                                                                    </div>
                                                                    {isUnread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4CAF50', flexShrink: 0, marginTop: '5px' }} />}
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* User Menu */}
                                <div className="nav-user-menu" ref={dropdownRef}>
                                    <button
                                        className="nav-avatar-btn"
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        title={displayName}
                                    >
                                        <span className="nav-avatar-circle">
                                            {currentUser?.profilePic ? (
                                                <img src={currentUser.profilePic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                getInitials(displayName)
                                            )}
                                        </span>
                                        <span className="nav-avatar-name">{displayName.split(' ')[0]}</span>
                                        <span className="nav-avatar-caret">{dropdownOpen ? '▲' : '▼'}</span>
                                    </button>

                                    {dropdownOpen && (
                                        <div className="nav-dropdown">
                                            <div className="nav-dropdown-header">
                                                <span className="nav-dropdown-avatar">
                                                    {currentUser?.profilePic ? (
                                                        <img src={currentUser.profilePic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        getInitials(displayName)
                                                    )}
                                                </span>
                                                <div>
                                                    <p className="nav-dropdown-name">{displayName}</p>
                                                    <p className="nav-dropdown-role">
                                                        {currentUser.role === 'farmer' ? '🌾 Farmer'
                                                            : currentUser.role === 'expert' ? '👨‍⚕️ Expert'
                                                                : '🛡️ Admin'}
                                                    </p>
                                                    <p className="nav-dropdown-email">{currentUser.email}</p>
                                                </div>
                                            </div>
                                            <div className="nav-dropdown-divider" />
                                            <Link to={dashboardPath} className="nav-dropdown-item" onClick={() => setDropdownOpen(false)}>
                                                📊 My Dashboard
                                            </Link>
                                            <div className="nav-dropdown-divider" />
                                            <button className="nav-dropdown-item nav-dropdown-logout" onClick={handleLogout}>
                                                🚪 Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <button
                                    className="btn-outline-nav"
                                    onClick={() => { setLoginModalOpen(true); setMenuOpen(false) }}
                                >
                                    Login
                                </button>
                                <Link to="/register" className="btn-primary-nav" onClick={() => setMenuOpen(false)}>
                                    Get Started
                                </Link>
                            </>
                        )}

                        {/* Hamburger */}
                        <button
                            className={`hamburger ${menuOpen ? 'active' : ''}`}
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label="Toggle menu"
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Login Modal */}
            {loginModalOpen && (
                <LoginModal
                    onClose={() => setLoginModalOpen(false)}
                    onSuccess={(user) => setCurrentUser(user)}
                />
            )}
        </>
    )
}

export default Navbar

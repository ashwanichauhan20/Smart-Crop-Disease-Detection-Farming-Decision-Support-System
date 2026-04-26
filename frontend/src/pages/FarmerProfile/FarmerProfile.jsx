import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Footer from '../../components/Footer/Footer'
import Navbar from '../../components/Navbar/Navbar'
import { uploadToCloudinary } from '../../utils/cloudinary'
import './FarmerProfile.css'

const defaultProfile = {
    name: '',
    email: '',
    phone: '',
    state: '',
    district: '',
    village: '',
    pincode: '',
    landArea: '',
    soilType: '',
    irrigationType: '',
    experience: '',
    bio: '',
    crops: [],
    photo: null,
}

const indianStates = ['Maharashtra', 'Punjab', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Gujarat', 'Karnataka', 'Haryana', 'Bihar', 'West Bengal', 'Andhra Pradesh', 'Tamil Nadu', 'Telangana']
const cropOptions = ['Wheat 🌾', 'Rice 🌾', 'Sugarcane 🎍', 'Soybean 🫘', 'Groundnut 🥜', 'Tomato 🍅', 'Onion 🧅', 'Potato 🥔', 'Cotton 🌿', 'Maize 🌽', 'Mango 🥭', 'Banana 🍌']
const soilTypes = ['Black (Regur)', 'Red Laterite', 'Sandy / Loamy', 'Alluvial', 'Clay', 'Clayey Loam']
const irrigationTypes = ['Canal Irrigation', 'Borewell / Drip', 'Rain-fed Only', 'River / Tank', 'Sprinkler']

const achievements = [
    { icon: '🔬', title: 'First Diagnosis', desc: 'Completed first AI crop scan', earned: true },
    { icon: '💰', title: 'Profit Planner', desc: 'Used profit predictor 5 times', earned: true },
    { icon: '🌾', title: 'Community Star', desc: 'Posted in Krishi Charcha', earned: true },
    { icon: '👨‍⚕️', title: 'Expert Consult', desc: 'Booked first video consultation', earned: false },
    { icon: '🏛️', title: 'Scheme Applied', desc: 'Applied for a govt. scheme', earned: false },
    { icon: '🌱', title: 'Green Champion', desc: 'Used organic remedy tips', earned: false },
]

function FarmerProfile() {
    const navigate = useNavigate()
    const fileInputRef = useRef(null)

    // Load from localStorage
    const currentUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')
    const savedProfile = JSON.parse(localStorage.getItem('fasalFarmerProfile') || 'null')

    const initProfile = {
        ...defaultProfile,
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        state: currentUser?.state || '',
        ...savedProfile,
    }

    const [profile, setProfile] = useState(initProfile)
    const [editMode, setEditMode] = useState(false)
    const [draft, setDraft] = useState(initProfile)
    const [photoPreview, setPhotoPreview] = useState(savedProfile?.photo || null)
    const [activeTab, setActiveTab] = useState('overview')
    const [saved, setSaved] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Live Location
    const [liveLocation, setLiveLocation] = useState(null)
    const [locationLoading, setLocationLoading] = useState(false)
    const [locationError, setLocationError] = useState('')

    const fetchLocation = () => {
        if (!navigator.geolocation) { setLocationError('Geolocation not supported by your browser.'); return }
        setLocationLoading(true); setLocationError('')
        navigator.geolocation.getCurrentPosition(
            pos => {
                setLiveLocation({
                    lat: pos.coords.latitude.toFixed(5),
                    lng: pos.coords.longitude.toFixed(5),
                    accuracy: Math.round(pos.coords.accuracy),
                })
                setLocationLoading(false)
            },
            err => {
                setLocationError(err.code === 1 ? '❌ Location permission denied.' : '❌ Unable to fetch location.')
                setLocationLoading(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    // Load from backend on focus or mount
    const loadProfileFromBackend = async () => {
        if (!currentUser?.id && !currentUser?._id) return
        try {
            const userId = currentUser.id || currentUser._id
            const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
            const res = await fetch(`${API_BASE}/api/user/${userId}`)
            const json = await res.json()
            if (json.success) {
                setProfile(json.data)
                setDraft(json.data)
                setPhotoPreview(json.data.profilePic || null)
            }
        } catch (err) {
            console.error('Failed to load profile:', err)
        }
    }

    useEffect(() => { 
        loadProfileFromBackend()
        fetchLocation() 
    }, [])

    if (!currentUser) {
        return (
            <div className="page-wrapper">
                <Navbar />
                <div className="profile-not-auth">
                    <h2>🔒 Please login to view your profile</h2>
                    <Link to="/login" className="profile-login-btn">Go to Login</Link>
                </div>
                <Footer />
            </div>
        )
    }

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        try {
            setUploading(true)
            // Show local preview immediately
            const reader = new FileReader()
            reader.onloadend = () => setPhotoPreview(reader.result)
            reader.readAsDataURL(file)

            // Upload to Cloudinary
            const secureUrl = await uploadToCloudinary(file)
            setPhotoPreview(secureUrl)
            setDraft(d => ({ ...d, profilePic: secureUrl }))

            // Auto-save the profile picture to MongoDB immediately (no need to press Save)
            const userId = currentUser?.id || currentUser?._id
            if (userId) {
                try {
                    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
                    const saveRes = await fetch(`${API_BASE}/api/user/${userId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profilePic: secureUrl })
                    })
                    const saveJson = await saveRes.json()
                    if (saveJson.success) {
                        // Update localStorage so Navbar/Community also reflect it
                        const updatedUser = { ...currentUser, profilePic: secureUrl }
                        localStorage.setItem('fasalCurrentUser', JSON.stringify(updatedUser))
                        setProfile(p => ({ ...p, profilePic: secureUrl }))
                    }
                } catch {
                    console.warn('Auto-save profile pic to MongoDB failed; will save on next manual save.')
                }
            }
        } catch (error) {
            console.error('Image upload failed:', error)
            alert('Failed to upload image. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    const toggleCrop = (crop) => {
        setDraft(d => ({
            ...d,
            crops: d.crops.includes(crop)
                ? d.crops.filter(c => c !== crop)
                : [...d.crops, crop],
        }))
    }

    const handleSave = async () => {
        const updated = { ...draft, profilePic: photoPreview }
        
        try {
            setUploading(true)
            const userId = currentUser.id || currentUser._id
            const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
            const res = await fetch(`${API_BASE}/api/user/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            })
            
            const json = await res.json()
            if (!json.success) {
                alert(json.message || 'Failed to save profile.')
                return
            }

            setProfile(json.data)
            // Update currentUser name and profile pic in localStorage
            const updatedUser = { ...currentUser, name: json.data.name, state: json.data.state, profilePic: json.data.profilePic }
            localStorage.setItem('fasalCurrentUser', JSON.stringify(updatedUser))
            
            setEditMode(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            console.error('Save error:', err)
            alert('Network error. Could not save profile.')
        } finally {
            setUploading(false)
        }
    }

    const handleCancel = () => {
        setDraft(profile)
        setPhotoPreview(profile.profilePic)
        setEditMode(false)
    }

    const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const completeness = [profile.name, profile.phone, profile.district, profile.landArea, profile.soilType, profile.bio, profile.photo, profile.crops.length > 0]
        .filter(Boolean).length * 12.5

    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="main-content">

                {/* Hero Banner */}
                <div className="profile-hero">
                    <div className="profile-hero-bg" />
                    <div className="container profile-hero-inner">
                        {/* Avatar - Always Clickable */}
                        <div className="profile-avatar-wrapper">
                            <div 
                                className="profile-avatar-circle" 
                                title="Click to change profile photo"
                                style={{ cursor: uploading ? 'not-allowed' : 'pointer', position: 'relative' }}
                                onClick={() => !uploading && fileInputRef.current.click()}
                            >
                                {photoPreview
                                    ? <img src={photoPreview} alt="Profile" className="profile-photo-img" />
                                    : <span className="profile-initials">{getInitials(profile.name || 'F')}</span>
                                }
                                {/* Hover overlay */}
                                <div style={{
                                    position: 'absolute', inset: 0, borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.45)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: 0, transition: 'opacity 0.2s',
                                    fontSize: '1.5rem', color: '#fff',
                                    pointerEvents: 'none'
                                }} className="avatar-hover-overlay">
                                    {uploading ? '⏳' : '📷'}
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                        </div>

                        {/* Header info */}
                        <div className="profile-hero-info">
                            <h1 className="profile-hero-name">{profile.name || 'Your Name'}</h1>
                            <p className="profile-hero-meta">
                                🌾 Farmer &nbsp;·&nbsp; 📍 {profile.district ? `${profile.district}, ` : ''}{profile.state || 'India'}
                                {profile.experience ? ` · ${profile.experience} yrs experience` : ''}
                            </p>
                            <div className="profile-hero-chips">
                                {profile.crops.slice(0, 4).map(c => (
                                    <span key={c} className="profile-crop-chip">{c}</span>
                                ))}
                                {profile.crops.length > 4 && <span className="profile-crop-chip">+{profile.crops.length - 4} more</span>}
                            </div>
                        </div>

                        {/* Edit / Save buttons */}
                        <div className="profile-hero-actions">
                            {!editMode ? (
                                <button className="profile-edit-btn" onClick={() => setEditMode(true)}>
                                    ✏️ Edit Profile
                                </button>
                            ) : (
                                <div className="profile-save-cancel">
                                    <button className="profile-save-btn" onClick={handleSave} disabled={uploading}>
                                        {uploading ? '⏳ Uploading...' : '💾 Save Changes'}
                                    </button>
                                    <button className="profile-cancel-btn" onClick={handleCancel} disabled={uploading}>✕ Cancel</button>
                                </div>
                            )}
                            <Link to="/farmer-dashboard" className="profile-dash-btn">📊 Dashboard</Link>
                        </div>
                    </div>

                    {/* Completeness bar */}
                    <div className="container">
                        <div className="profile-completeness">
                            <div className="pc-label">
                                <span>Profile Completeness</span>
                                <span className="pc-pct">{Math.round(completeness)}%</span>
                            </div>
                            <div className="pc-bar">
                                <div className="pc-fill" style={{ width: `${completeness}%` }} />
                            </div>
                            {completeness < 100 && (
                                <p className="pc-hint">💡 Complete your profile to unlock all features</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Success toast */}
                {saved && (
                    <div className="profile-toast">✅ Profile saved successfully!</div>
                )}

                {/* Tabs */}
                <div className="profile-tabs-bar">
                    <div className="container">
                        <div className="profile-tabs">
                            {['overview', 'farm', 'crops', 'achievements', 'activity'].map(tab => (
                                <button
                                    key={tab}
                                    className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab === 'overview' && '👤 '}{tab === 'farm' && '🌾 '}{tab === 'crops' && '🌱 '}{tab === 'achievements' && '🏆 '}{tab === 'activity' && '📋 '}
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="container profile-body">

                    {/* ── OVERVIEW TAB ── */}
                    {activeTab === 'overview' && (
                        <div className="profile-tab-content animate-fadeInUp">
                            <div className="profile-two-col">
                                <div className="profile-card">
                                    <h3 className="profile-card-title">👤 Personal Information</h3>
                                    {editMode ? (
                                        <div className="profile-edit-form">
                                            <div className="pef-row">
                                                <div className="pef-group">
                                                    <label>Full Name *</label>
                                                    <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Ramesh Kumar Yadav" />
                                                </div>
                                                <div className="pef-group">
                                                    <label>Phone Number</label>
                                                    <input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} placeholder="+91 98765 43210" />
                                                </div>
                                            </div>
                                            <div className="pef-row">
                                                <div className="pef-group">
                                                    <label>Email</label>
                                                    <input value={draft.email} disabled className="input-disabled" />
                                                </div>
                                                <div className="pef-group">
                                                    <label>State</label>
                                                    <select value={draft.state} onChange={e => setDraft(d => ({ ...d, state: e.target.value }))}>
                                                        <option value="">Select State</option>
                                                        {indianStates.map(s => <option key={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="pef-row">
                                                <div className="pef-group">
                                                    <label>District</label>
                                                    <input value={draft.district} onChange={e => setDraft(d => ({ ...d, district: e.target.value }))} placeholder="Nashik" />
                                                </div>
                                                <div className="pef-group">
                                                    <label>Village</label>
                                                    <input value={draft.village} onChange={e => setDraft(d => ({ ...d, village: e.target.value }))} placeholder="Village name" />
                                                </div>
                                            </div>
                                            <div className="pef-row">
                                                <div className="pef-group">
                                                    <label>PIN Code</label>
                                                    <input value={draft.pincode} onChange={e => setDraft(d => ({ ...d, pincode: e.target.value }))} placeholder="422001" />
                                                </div>
                                                <div className="pef-group">
                                                    <label>Farming Experience (years)</label>
                                                    <input type="number" value={draft.experience} onChange={e => setDraft(d => ({ ...d, experience: e.target.value }))} placeholder="10" />
                                                </div>
                                            </div>
                                            <div className="pef-group" style={{ gridColumn: '1 / -1' }}>
                                                <label>About Me / Bio</label>
                                                <textarea
                                                    value={draft.bio}
                                                    onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                                                    rows={3}
                                                    placeholder="Tell the community about yourself and your farm..."
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="profile-info-grid">
                                            <InfoRow icon="👤" label="Full Name" value={profile.name} />
                                            <InfoRow icon="📧" label="Email" value={profile.email} />
                                            <InfoRow icon="📱" label="Phone" value={profile.phone || '—'} />
                                            <InfoRow icon="📍" label="State" value={profile.state || '—'} />
                                            <InfoRow icon="🏘️" label="District" value={profile.district || '—'} />
                                            <InfoRow icon="🏡" label="Village" value={profile.village || '—'} />
                                            <InfoRow icon="📮" label="PIN Code" value={profile.pincode || '—'} />
                                            <InfoRow icon="📅" label="Experience" value={profile.experience ? `${profile.experience} years` : '—'} />
                                            {profile.bio && (
                                                <div className="info-bio">
                                                    <p className="info-label">📝 Bio</p>
                                                    <p className="info-bio-text">{profile.bio}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Quick Stats sidebar */}
                                <div>
                                    <div className="profile-card profile-stats-card">
                                        <h3 className="profile-card-title">📊 Quick Stats</h3>
                                        {[
                                            { icon: '🔬', label: 'Diseases Diagnosed', value: '24' },
                                            { icon: '💰', label: 'Profit Predictions', value: '12' },
                                            { icon: '📞', label: 'Expert Calls', value: '6' },
                                            { icon: '🌾', label: 'Community Posts', value: '8' },
                                            { icon: '🏛️', label: 'Schemes Applied', value: '2' },
                                            { icon: '📅', label: 'Member Since', value: currentUser?.joinedDate || 'Recently' },
                                        ].map(s => (
                                            <div key={s.label} className="qs-row">
                                                <span className="qs-icon">{s.icon}</span>
                                                <span className="qs-label">{s.label}</span>
                                                <span className="qs-value">{s.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Live Location Card */}
                                    <div className="profile-card live-location-card" style={{ marginTop: '1.25rem' }}>
                                        <h3 className="profile-card-title">📍 Live Location</h3>
                                        {locationLoading && (
                                            <div className="loc-loading">
                                                <span className="loc-pulse" />
                                                Detecting your location...
                                            </div>
                                        )}
                                        {locationError && (
                                            <div className="loc-error">
                                                {locationError}
                                                <button className="loc-retry-btn" onClick={fetchLocation}>🔄 Retry</button>
                                            </div>
                                        )}
                                        {liveLocation && !locationLoading && (
                                            <div className="loc-data">
                                                <div className="loc-map-preview">
                                                    <iframe
                                                        title="Live Map"
                                                        src={`https://maps.google.com/maps?q=${liveLocation.lat},${liveLocation.lng}&z=15&output=embed`}
                                                        className="loc-map-iframe"
                                                        loading="lazy"
                                                        allowFullScreen
                                                    />
                                                </div>
                                                <div className="loc-info-rows">
                                                    <div className="loc-row"><span>🌐 Latitude</span><strong>{liveLocation.lat}°</strong></div>
                                                    <div className="loc-row"><span>🌐 Longitude</span><strong>{liveLocation.lng}°</strong></div>
                                                    <div className="loc-row"><span>🎯 Accuracy</span><strong>±{liveLocation.accuracy}m</strong></div>
                                                </div>
                                                <a
                                                    href={`https://maps.google.com/?q=${liveLocation.lat},${liveLocation.lng}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="loc-open-maps-btn"
                                                >
                                                    🗺️ Open in Google Maps
                                                </a>
                                                <button className="loc-refresh-btn" onClick={fetchLocation}>🔄 Refresh Location</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── FARM TAB ── */}
                    {activeTab === 'farm' && (
                        <div className="profile-tab-content animate-fadeInUp">
                            <div className="profile-two-col">
                                <div className="profile-card">
                                    <h3 className="profile-card-title">🌾 Farm Details</h3>
                                    {editMode ? (
                                        <div className="profile-edit-form">
                                            <div className="pef-row">
                                                <div className="pef-group">
                                                    <label>Total Land Area (Acres)</label>
                                                    <input type="number" step="0.5" value={draft.landArea} onChange={e => setDraft(d => ({ ...d, landArea: e.target.value }))} placeholder="e.g. 5" />
                                                </div>
                                                <div className="pef-group">
                                                    <label>Soil Type</label>
                                                    <select value={draft.soilType} onChange={e => setDraft(d => ({ ...d, soilType: e.target.value }))}>
                                                        <option value="">Select Soil Type</option>
                                                        {soilTypes.map(s => <option key={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="pef-group">
                                                <label>Irrigation Type</label>
                                                <div className="irrigation-options">
                                                    {irrigationTypes.map(ir => (
                                                        <button
                                                            key={ir}
                                                            type="button"
                                                            className={`irr-btn ${draft.irrigationType === ir ? 'selected' : ''}`}
                                                            onClick={() => setDraft(d => ({ ...d, irrigationType: ir }))}
                                                        >
                                                            {ir}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="farm-details-display">
                                            <div className="farm-stat-row">
                                                <div className="farm-stat-card">
                                                    <div className="fsc-icon">🌾</div>
                                                    <div className="fsc-value">{profile.landArea || '—'}</div>
                                                    <div className="fsc-label">Acres of Land</div>
                                                </div>
                                                <div className="farm-stat-card">
                                                    <div className="fsc-icon">🟫</div>
                                                    <div className="fsc-value">{profile.soilType?.split('(')[0].trim() || '—'}</div>
                                                    <div className="fsc-label">Soil Type</div>
                                                </div>
                                                <div className="farm-stat-card">
                                                    <div className="fsc-icon">💧</div>
                                                    <div className="fsc-value">{profile.irrigationType?.split(' ')[0] || '—'}</div>
                                                    <div className="fsc-label">Irrigation</div>
                                                </div>
                                            </div>
                                            <div className="profile-info-grid" style={{ marginTop: '1.5rem' }}>
                                                <InfoRow icon="📏" label="Land Area" value={profile.landArea ? `${profile.landArea} Acres` : '—'} />
                                                <InfoRow icon="🟫" label="Soil Type" value={profile.soilType || '—'} />
                                                <InfoRow icon="💧" label="Irrigation" value={profile.irrigationType || '—'} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="profile-card">
                                    <h3 className="profile-card-title">🌡️ AI Farm Health Score</h3>
                                    <div className="farm-health-score">
                                        <div className="fhs-circle">
                                            <span className="fhs-value">78</span>
                                            <span className="fhs-unit">/100</span>
                                        </div>
                                        <p className="fhs-label">Good</p>
                                    </div>
                                    <div className="farm-health-breakdown">
                                        {[
                                            { label: 'Soil Health', val: 82 },
                                            { label: 'Water Usage', val: 70 },
                                            { label: 'Crop Diversity', val: 85 },
                                            { label: 'Pest Control', val: 65 },
                                        ].map(b => (
                                            <div key={b.label} className="fhb-row">
                                                <span className="fhb-label">{b.label}</span>
                                                <div className="fhb-bar">
                                                    <div className="fhb-fill" style={{ width: `${b.val}%`, background: b.val > 75 ? 'var(--primary)' : 'var(--secondary)' }} />
                                                </div>
                                                <span className="fhb-pct">{b.val}%</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Link to="/disease-detection" className="farm-health-cta">🔬 Run AI Crop Scan →</Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── CROPS TAB ── */}
                    {activeTab === 'crops' && (
                        <div className="profile-tab-content animate-fadeInUp">
                            <div className="profile-card">
                                <div className="profile-card-header">
                                    <h3 className="profile-card-title">🌱 My Crops</h3>
                                    {editMode && <p className="crops-hint">Click crops to select / deselect</p>}
                                </div>
                                {editMode ? (
                                    <div className="crops-select-grid">
                                        {cropOptions.map(crop => (
                                            <button
                                                key={crop}
                                                type="button"
                                                className={`crop-select-btn ${draft.crops.includes(crop) ? 'selected' : ''}`}
                                                onClick={() => toggleCrop(crop)}
                                            >
                                                {crop}
                                                {draft.crops.includes(crop) && <span className="crop-check">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                ) : profile.crops.length === 0 ? (
                                    <div className="crops-empty">
                                        <p>🌱 No crops added yet.</p>
                                        <button className="crops-add-btn" onClick={() => { setEditMode(true); setActiveTab('crops') }}>+ Add Your Crops</button>
                                    </div>
                                ) : (
                                    <div className="crops-display-grid">
                                        {profile.crops.map(crop => (
                                            <div key={crop} className="crop-display-card">
                                                <div className="cdc-icon">{crop.split(' ')[1] || '🌾'}</div>
                                                <div className="cdc-name">{crop.split(' ')[0]}</div>
                                                <Link to="/disease-detection" className="cdc-scan">Scan 🔬</Link>
                                                <Link to="/profit-prediction" className="cdc-predict">Predict 💰</Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Crop Calendar */}
                            <div className="profile-card" style={{ marginTop: '1.5rem' }}>
                                <h3 className="profile-card-title">📅 Crop Sowing Calendar</h3>
                                <div className="crop-calendar">
                                    {[
                                        { season: 'Kharif (Jun–Oct)', crops: 'Soybean, Maize, Rice, Cotton', icon: '☀️', status: 'active' },
                                        { season: 'Rabi (Nov–Apr)', crops: 'Wheat, Gram, Mustard, Potato', icon: '❄️', status: 'upcoming' },
                                        { season: 'Zaid (Mar–Jun)', crops: 'Watermelon, Cucumber, Moong', icon: '🌸', status: '' },
                                    ].map(s => (
                                        <div key={s.season} className={`cal-row ${s.status}`}>
                                            <span className="cal-icon">{s.icon}</span>
                                            <div className="cal-body">
                                                <p className="cal-season">{s.season} {s.status === 'active' && <span className="cal-badge active">Current Season</span>}</p>
                                                <p className="cal-crops">{s.crops}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── ACHIEVEMENTS TAB ── */}
                    {activeTab === 'achievements' && (
                        <div className="profile-tab-content animate-fadeInUp">
                            <div className="profile-card">
                                <h3 className="profile-card-title">🏆 Achievements & Badges</h3>
                                <div className="achievements-grid">
                                    {achievements.map(a => (
                                        <div key={a.title} className={`achievement-card ${a.earned ? 'earned' : 'locked'}`}>
                                            <div className="ach-icon">{a.icon}</div>
                                            <h4 className="ach-title">{a.title}</h4>
                                            <p className="ach-desc">{a.desc}</p>
                                            {a.earned
                                                ? <span className="ach-badge earned">✅ Earned</span>
                                                : <span className="ach-badge locked">🔒 Locked</span>
                                            }
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── ACTIVITY TAB ── */}
                    {activeTab === 'activity' && (
                        <div className="profile-tab-content animate-fadeInUp">
                            <div className="profile-card">
                                <h3 className="profile-card-title">📋 Recent Activity</h3>
                                <div className="activity-timeline">
                                    {[
                                        { icon: '🔬', text: 'AI Diagnosed: Powdery Mildew on Wheat', sub: 'Confidence: 94% · Chemical + Organic remedies provided', time: '2 hrs ago', type: 'alert' },
                                        { icon: '⛅', text: 'Heavy rain alert received for your district', sub: 'Nasik district: 85% rain probability tomorrow', time: '5 hrs ago', type: 'warning' },
                                        { icon: '💰', text: 'Profit predicted: Tomato – ₹58,000/acre', sub: 'Season: Zaid · Loamy soil selected', time: '1 day ago', type: 'success' },
                                        { icon: '🏛️', text: 'PM-KUSUM scheme application submitted', sub: 'Solar pump subsidy (90%) applied', time: '2 days ago', type: 'info' },
                                        { icon: '📞', text: 'Video consultation with Dr. Ajay Mehta', sub: 'Topic: Late blight in tomatoes · Duration: 22 min', time: '3 days ago', type: 'success' },
                                        { icon: '🌾', text: 'Posted in Krishi Charcha community', sub: '"My wheat crop is showing yellow patches..."', time: '5 days ago', type: 'info' },
                                    ].map((a, i) => (
                                        <div key={i} className={`timeline-item type-${a.type}`}>
                                            <div className="timeline-dot">{a.icon}</div>
                                            <div className="timeline-body">
                                                <p className="timeline-text">{a.text}</p>
                                                <p className="timeline-sub">{a.sub}</p>
                                                <p className="timeline-time">{a.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}

function InfoRow({ icon, label, value }) {
    return (
        <div className="info-row">
            <span className="info-icon">{icon}</span>
            <div>
                <p className="info-label">{label}</p>
                <p className="info-value">{value}</p>
            </div>
        </div>
    )
}

export default FarmerProfile

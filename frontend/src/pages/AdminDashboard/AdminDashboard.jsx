import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import './AdminDashboard.css'

const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'))

/* Removed LocalStorage User Mocking */

/* ─── Helper: Cloudinary PDF Fix ─── */
const getSafeDownloadUrl = (url) => {
    if (!url || !url.startsWith('http')) return url;
    // Route through backend proxy to avoid Cloudinary 401 auth errors
    return `${API_BASE}/api/admin/doc-proxy?url=${encodeURIComponent(url)}`;
};

const getSafePreviewUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('cloudinary.com') && url.toLowerCase().includes('.pdf')) {
        return url.replace('.pdf', '.jpg'); // Render 1st page of PDF as image
    }
    return url;
};

function AdminDashboard() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const [tab, setTab] = useState('overview')
    const [users, setUsers] = useState([])
    const [toast, setToast] = useState('')
    const [confirmDel, setConfirmDel] = useState(null)
    const [confirmRemove, setConfirmRemove] = useState(null)
    const [resetInfo, setResetInfo] = useState(null)
    const [expandedRow, setExpandedRow] = useState(null)
    const [viewExpert, setViewExpert] = useState(null)
    const [viewFarmer, setViewFarmer] = useState(null)    // farmer profile modal
    const [docViewer, setDocViewer] = useState(null)      // { url, name, type } for full-screen doc viewer
    const [editingScheme, setEditingScheme] = useState(null) // scheme being edited
    const [adminProfile, setAdminProfile] = useState(() => JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null'))
    const [adminPicUploading, setAdminPicUploading] = useState(false)
    const adminPicRef = useRef(null)

    // Announcement / Site Control state
    const [announcement, setAnnouncement] = useState(
        localStorage.getItem('fasalAnnouncement') || ''
    )
    const [announcementInput, setAnnouncementInput] = useState(
        localStorage.getItem('fasalAnnouncement') || ''
    )
    const [maintenanceMode, setMaintenanceMode] = useState(
        localStorage.getItem('fasalMaintenance') === 'true'
    )
    const [allowRegistration, setAllowRegistration] = useState(
        localStorage.getItem('fasalRegOpen') !== 'false'
    )
    const [expertAutoApprove, setExpertAutoApprove] = useState(
        localStorage.getItem('fasalAutoApprove') === 'true'
    )
    const [siteContent, setSiteContent] = useState(
        JSON.parse(localStorage.getItem('fasalSiteContent') || '{"homeTitle":"","homeSubtitle":"","homeTagline":"","homeDesc":"","contactEmail":"","contactPhone":""}')
    )
    const [trendingWidgets, setTrendingWidgets] = useState(() => JSON.parse(localStorage.getItem('fasalCommunityTrending') || 'null') || [
        { tag: '#WheatDisease', posts: 234 }, { tag: '#PMKisan2025', posts: 189 }, { tag: '#RabiCrops', posts: 156 },
        { tag: '#DripIrrigation', posts: 128 }, { tag: '#SoybeanFarming', posts: 95 }, { tag: '#OrganicFarming', posts: 87 }
    ])
    const [expertsWidgets, setExpertsWidgets] = useState(() => JSON.parse(localStorage.getItem('fasalCommunityExperts') || 'null') || [
        { name: 'Dr. Ajay Mehta', spec: 'Plant Pathology', rating: '4.9' },
        { name: 'Dr. Reena Sharma', spec: 'Soil Science', rating: '4.8' },
        { name: 'Prof. R. Krishnan', spec: 'Horticulture', rating: '4.7' }
    ])
    const [statsWidgets, setStatsWidgets] = useState(() => JSON.parse(localStorage.getItem('fasalCommunityStats') || 'null') || [
        { label: 'Farmers', value: '50K+' }, { label: 'Experts', value: '500+' },
        { label: 'Posts Today', value: '1,240' }, { label: 'Questions Resolved', value: '98%' }
    ])

    // --- MESSAGING STATE ---
    const [expertContacts, setExpertContacts] = useState([])
    const [selectedExpert, setSelectedExpert] = useState(null)
    const [chatHistory, setChatHistory] = useState([])
    const [adminReply, setAdminReply] = useState('')
    const [isSendingReply, setIsSendingReply] = useState(false)

    /* ─── Toast helper ─── */
    const showToast = (msg) => {
        setToast(msg)
        setTimeout(() => setToast(''), 3500)
    }

    /* ─── Reload users from DB ─── */
    const refresh = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/user/all`)
            const data = await res.json()
            if (data.success && data.data) {
                setUsers(data.data)
            }
        } catch (e) {
            console.error("Failed to fetch users", e)
        }
    }

    /* ─── SITE SETTINGS - Load from MongoDB ─── */
    const loadSettings = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/settings`)
            const data = await res.json()
            if (data.success && data.data) {
                const s = data.data
                if (s.announcement !== undefined) { setAnnouncement(s.announcement); setAnnouncementInput(s.announcement) }
                if (s.maintenanceMode !== undefined) setMaintenanceMode(s.maintenanceMode)
                if (s.allowRegistration !== undefined) setAllowRegistration(s.allowRegistration)
                if (s.expertAutoApprove !== undefined) setExpertAutoApprove(s.expertAutoApprove)
                if (s.siteContent) setSiteContent(s.siteContent)
                if (s.communityWidgets) {
                    if (s.communityWidgets.trending?.length) setTrendingWidgets(s.communityWidgets.trending)
                    if (s.communityWidgets.experts?.length) setExpertsWidgets(s.communityWidgets.experts)
                    if (s.communityWidgets.stats?.length) setStatsWidgets(s.communityWidgets.stats)
                }
            }
        } catch (e) { console.warn('Failed to load site settings from DB', e) }
    }
    const persistSettings = async (patch) => {
        try {
            await fetch(`${API_BASE}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch)
            })
        } catch (e) { console.warn('Settings persist failed', e) }
    }

    useEffect(() => {
        refresh()
        loadSettings()
        // Fetch and cache admin's real DB _id on mount
        fetch(`${API_BASE}/api/messages/admin-id`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.adminId) {
                    setAdminProfile(prev => ({ ...(prev || {}), _id: data.adminId }))
                }
            })
            .catch(console.error)
    }, [])

    /* ─── COMMUNITY MODERATION - MongoDB ─── */
    const [communityPosts, setCommunityPosts] = useState([])

    const fetchCommunityPosts = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/community/posts`)
            const data = await res.json()
            if (data.success) setCommunityPosts(data.data)
        } catch (e) { console.warn('Community posts fetch failed', e) }
    }

    useEffect(() => { fetchCommunityPosts() }, [])

    /* --- MESSAGING LOGIC --- */
    const fetchContacts = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/messages/expert-contacts`)
            const data = await res.json()
            if (data.success) setExpertContacts(data.data)
        } catch (e) { console.error("Contacts fetch failed") }
    }

    const fetchChat = async (expertId) => {
        if (!expertId || !adminProfile?._id) return
        try {
            const res = await fetch(`${API_BASE}/api/messages/history/${adminProfile._id}/${expertId}`)
            const data = await res.json()
            if (data.success) setChatHistory(data.data)
        } catch (e) { console.error("Chat fetch failed") }
    }

    useEffect(() => {
        if (tab === 'messages') {
            fetchContacts()
            if (selectedExpert) fetchChat(selectedExpert._id)
            const interval = setInterval(() => {
                fetchContacts()
                if (selectedExpert) fetchChat(selectedExpert._id)
            }, 4000)
            return () => clearInterval(interval)
        }
    }, [tab, selectedExpert?._id, adminProfile?._id])

    const handleSendReply = async () => {
        if (!adminReply.trim() || !selectedExpert || !adminProfile?._id) return
        setIsSendingReply(true)
        try {
            const res = await fetch(`${API_BASE}/api/messages/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: adminProfile._id,
                    recipientId: selectedExpert._id,
                    content: adminReply
                })
            })
            if (res.ok) {
                setAdminReply('')
                fetchChat(selectedExpert._id)
            }
        } catch (e) { showToast('❌ Message failed') }
        finally { setIsSendingReply(false) }
    }

    const handleDeleteMessage = async (msgId) => {
        try {
            const res = await fetch(`${API_BASE}/api/messages/${msgId}`, { method: 'DELETE' })
            if (res.ok && selectedExpert) {
                fetchChat(selectedExpert._id)
            }
        } catch (e) {
            console.error("Failed to delete message", e)
        }
    }

    /* ─── BROWSER BACK BUTTON INTERCEPTION ─── */
    // Prevent "Back" from navigating away when modals are open
    useEffect(() => {
        const handlePopState = (e) => {
            if (docViewer || viewExpert || viewFarmer || confirmDel || confirmRemove || resetInfo) {
                // If any modal is open, close them and stay on page
                setDocViewer(null)
                setViewExpert(null)
                setViewFarmer(null)
                setConfirmDel(null)
                setConfirmRemove(null)
                setResetInfo(null)
                // Stay on current page
                window.history.pushState(null, '', window.location.pathname);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [docViewer, viewExpert, viewFarmer, confirmDel, confirmRemove, resetInfo]);

    // Push state when opening a modal
    useEffect(() => {
        if (docViewer || viewExpert || viewFarmer || confirmDel || confirmRemove || resetInfo) {
            window.history.pushState({ modal: true }, '', window.location.pathname);
        }
    }, [docViewer, viewExpert, viewFarmer, confirmDel, confirmRemove, resetInfo]);

    const deletePost = async (postId) => {
        const confirmStr = window.confirm("Are you sure you want to permanently delete this community post?")
        if (!confirmStr) return
        try {
            const res = await fetch(`${API_BASE}/api/community/posts/${postId}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setCommunityPosts(prev => prev.filter(p => (p._id || p.id) !== postId))
                showToast('🗑️ Post deleted successfully.')
            } else {
                showToast('❌ Failed to delete post.')
            }
        } catch (e) { showToast('❌ Network error deleting post.') }
    }

    /* ─── SCHEMES MANAGEMENT - MongoDB ─── */
    const [schemesList, setSchemesList] = useState([])
    const [showSchemeForm, setShowSchemeForm] = useState(false)
    const [newScheme, setNewScheme] = useState({
        name: '', category: 'All', description: '', eligibility: '', benefit: '', deadline: '', ministry: '', icon: '📜', color: '#1565C0', featured: false, applyUrl: ''
    })
    const [isSyncing, setIsSyncing] = useState(false)

    const fetchSchemes = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/schemes`)
            const data = await res.json()
            if (data.success) setSchemesList(data.data)
        } catch (e) { console.warn('Schemes fetch failed', e) }
    }

    useEffect(() => { fetchSchemes() }, [])

    const handleAutoSync = async () => {
        setIsSyncing(true)
        try {
            const res = await fetch(`${API_BASE}/api/schemes/sync`, { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                setSchemesList(data.data)
                showToast(data.added > 0 ? `✅ Synced ${data.added} new schemes from Central Server.` : `ℹ️ Database already up to date.`)
            }
        } catch (e) { showToast('❌ Sync failed. Check connection.') }
        setIsSyncing(false)
    }

    const deleteScheme = async (id) => {
        const confirmStr = window.confirm("Delete this scheme permanently?")
        if (!confirmStr) return
        try {
            await fetch(`${API_BASE}/api/schemes/${id}`, { method: 'DELETE' })
            setSchemesList(prev => prev.filter(s => s._id !== id))
            showToast('🗑️ Scheme removed.')
        } catch (e) { showToast('❌ Delete failed.') }
    }

    const handleAddScheme = async (e) => {
        e.preventDefault()
        if (!newScheme.name || !newScheme.description) return showToast('⚠️ Name and Description are required!')
        try {
            if (editingScheme) {
                // UPDATE existing scheme in MongoDB
                const res = await fetch(`${API_BASE}/api/schemes/${editingScheme._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newScheme)
                })
                const data = await res.json()
                if (data.success) {
                    setSchemesList(prev => prev.map(s => s._id === editingScheme._id ? data.data : s))
                    showToast('✅ Scheme updated successfully.')
                }
                setEditingScheme(null)
            } else {
                // ADD new scheme to MongoDB
                const res = await fetch(`${API_BASE}/api/schemes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newScheme)
                })
                const data = await res.json()
                if (data.success) {
                    setSchemesList(prev => [data.data, ...prev])
                    showToast('✅ Scheme added successfully.')
                }
            }
        } catch (e) { showToast('❌ Failed to save scheme.') }
        setShowSchemeForm(false)
        setNewScheme({ name: '', category: 'Income Support', description: '', eligibility: '', benefit: '', deadline: '', ministry: '', icon: '📜', color: '#1565C0', featured: false, applyUrl: '' })
    }

    const handleEditScheme = (scheme) => {
        setEditingScheme(scheme)
        setNewScheme({ ...scheme })
        setShowSchemeForm(true)
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
    }

    /* ─── OPEN DOCUMENT FULL-SCREEN (via backend proxy to fix 401) ─── */
    const openDocViewer = (url, name = 'Document') => {
        if (!url) return
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || url.startsWith('data:image')
        const isPdf = /\.pdf$/i.test(url) || url.startsWith('data:application/pdf')
        // Route through backend proxy to avoid Cloudinary 401 auth errors
        const proxyUrl = url.startsWith('http') ? `${API_BASE}/api/admin/doc-proxy?url=${encodeURIComponent(url)}` : url
        setDocViewer({ url: proxyUrl, originalUrl: url, name, type: isImage ? 'image' : isPdf ? 'pdf' : 'link' })
    }



    /* ─── ADMIN PROFILE PICTURE UPLOAD ─── */
    const handleAdminPicUpload = async (file) => {
        if (!file) return
        setAdminPicUploading(true)
        try {
            const { uploadToCloudinary } = await import('../../utils/cloudinary')
            const url = await uploadToCloudinary(file)
            const updated = { ...adminProfile, profilePic: url }
            setAdminProfile(updated)
            localStorage.setItem('fasalCurrentUser', JSON.stringify(updated))
            // Also persist to backend if we have an ID
            if (updated._id) {
                await fetch(`${API_BASE}/api/user/${updated._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profilePic: url })
                })
            }
            showToast('✅ Profile picture updated!')
        } catch (e) {
            showToast('❌ Upload failed. Try again.')
        } finally {
            setAdminPicUploading(false)
        }
    }

    /* ─── USER MANAGEMENT ─── */
    const suspendUser = async (user) => {
        try {
            await fetch(`${API_BASE}/api/user/${user._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suspended: !user.suspended })
            })
            refresh()
            showToast(!user.suspended ? `⛔ ${user.name} suspended.` : `✅ ${user.name} restored.`)
        } catch(e) { showToast('Error suspending user') }
    }

    const deleteUser = async (user) => {
        try {
            await fetch(`${API_BASE}/api/user/${user._id}`, { method: 'DELETE' })
            setConfirmDel(null)
            showToast('🗑️ User deleted permanently.')
            refresh()
            const cu = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')
            if (cu?._id === user._id) { localStorage.removeItem('fasalCurrentUser'); navigate('/login') }
        } catch(e) { showToast('Error deleting user') }
    }

    const changeRole = async (user, newRole) => {
        try {
            await fetch(`${API_BASE}/api/user/${user._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            })
            refresh()
            showToast(`🔁 Role changed to "${newRole}".`)
        } catch(e) {}
    }

    /* ─── EXPERT APPROVAL ─── */
    const approveExpert = async (user) => {
        try {
            await fetch(`${API_BASE}/api/user/${user._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved: true, rejected: false })
            })
            refresh()
            setExpandedRow(null)
            setViewExpert(null)
            showToast('✅ Expert approved successfully!')
            addNotification({ email: user.email }, 'Profile Approved', 'Congratulations! Your expert profile has been approved. You can now consult farmers.', 'success')
        } catch(e) {}
    }

    const rejectExpert = async (user) => {
        try {
            await fetch(`${API_BASE}/api/user/${user._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved: false, rejected: true })
            })
            refresh()
            setExpandedRow(null)
            setViewExpert(null)
            showToast('❌ Expert request rejected.')
            addNotification({ email: user.email }, 'Profile Rejected', 'Your expert application was reviewed but has been rejected or revoked. Please contact support.', 'error')
        } catch(e) {}
    }

    /* ─── RESET USER PASSWORD (Actual backend sync) ─── */
    const resetUserPassword = async (user) => {
        const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefghjkmnpqrstwxyz23456789@#!'
        const tempPass = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        
        try {
            const res = await fetch(`${API_BASE}/api/user/${user._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: tempPass })
            })
            const data = await res.json()
            if (data.success) {
                setResetInfo({ email: user.email, tempPass })
                showToast(`✅ Password reset for ${user.email}`)
            } else {
                showToast(`❌ Reset failed: ${data.message}`)
            }
        } catch (e) {
            showToast('❌ Backend connection error during reset.')
        }
    }

    const removeExpert = async (user) => {
        try {
            await fetch(`${API_BASE}/api/user/${user._id}`, { method: 'DELETE' })
            refresh()
            setConfirmRemove(null)
            showToast('🗑️ Expert removed permanently.')
            const cu = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')
            if (cu?._id === user._id) { localStorage.removeItem('fasalCurrentUser'); navigate('/login') }
        } catch(e) {}
    }

    /* ─── SITE CONTROLS - MongoDB ─── */
    const saveAnnouncement = async () => {
        setAnnouncement(announcementInput)
        await persistSettings({ announcement: announcementInput })
        localStorage.setItem('fasalAnnouncement', announcementInput) // keep LS in sync for other pages
        showToast('📢 Announcement published!')
        addNotification({}, 'Site Announcement 📢', announcementInput, 'warning')
    }
    const clearAnnouncement = async () => {
        setAnnouncement(''); setAnnouncementInput('')
        await persistSettings({ announcement: '' })
        localStorage.removeItem('fasalAnnouncement')
        showToast('🗑️ Announcement cleared.')
    }
    const toggleMaintenance = async () => {
        const val = !maintenanceMode
        setMaintenanceMode(val)
        await persistSettings({ maintenanceMode: val })
        localStorage.setItem('fasalMaintenance', String(val))
        showToast(val ? '🔧 Maintenance mode ON — site restricted.' : '✅ Site restored to normal.')
    }
    const toggleRegistration = async () => {
        const val = !allowRegistration
        setAllowRegistration(val)
        await persistSettings({ allowRegistration: val })
        localStorage.setItem('fasalRegOpen', String(val))
        showToast(val ? '✅ User registration enabled.' : '🔒 User registration disabled.')
    }
    const toggleAutoApprove = async () => {
        const val = !expertAutoApprove
        setExpertAutoApprove(val)
        await persistSettings({ expertAutoApprove: val })
        localStorage.setItem('fasalAutoApprove', String(val))
        showToast(val ? '⚡ Experts auto-approved on register.' : '🔒 Expert manual approval required.')
    }
    const saveSiteContent = async () => {
        await persistSettings({ siteContent })
        localStorage.setItem('fasalSiteContent', JSON.stringify(siteContent))
        showToast('✅ Site content updated successfully!')
    }

    /* ─── DERIVED STATS ─── */
    const farmers = users.filter(u => u.role === 'farmer')
    const experts = users.filter(u => u.role === 'expert')
    const pendingExperts = experts.filter(e => !e.approved && !e.rejected)
    const approvedExperts = experts.filter(e => e.approved)
    const suspended = users.filter(u => u.suspended)
    
    const todayStr = new Date().toDateString()
    const todayUsers = users.filter(u => new Date(u.joinedDate).toDateString() === todayStr)
    const todayFarmers = todayUsers.filter(u => u.role === 'farmer').length
    const todayExperts = todayUsers.filter(u => u.role === 'expert').length

    const analytics = [
        { icon: '👥', label: 'Total Users', value: users.length, sub: `${farmers.length} farmers, ${experts.length} experts`, color: '#4CAF50' },
        { icon: '📅', label: 'Registered Today', value: todayUsers.length, sub: `${todayFarmers} farmers, ${todayExperts} experts newly joined`, color: '#9C27B0' },
        { icon: '👨‍⚕️', label: 'Approved Experts', value: approvedExperts.length, sub: `${pendingExperts.length} pending review`, color: '#2196F3' },
        { icon: '⏳', label: 'Expert Requests', value: pendingExperts.length, sub: 'awaiting approval', color: '#FF9800' },
        { icon: '📢', label: 'Announcement', value: announcement ? 'Active' : 'None', sub: announcement ? 'published' : 'no active alert', color: announcement ? '#9C27B0' : '#90A4AE' },
        { icon: '🔧', label: 'Maintenance', value: maintenanceMode ? 'ON' : 'OFF', sub: maintenanceMode ? 'site restricted' : 'site normal', color: maintenanceMode ? '#F44336' : '#4CAF50' },
    ]

    const TABS = [
        { id: 'overview', label: '📊 Overview' },
        { id: 'users', label: '👥 Users' },
        { id: 'experts', label: `👨‍💼 Experts ${pendingExperts.length > 0 ? `(${pendingExperts.length})` : ''}` },
        { id: 'community', label: '🗣️ Community' },
        { id: 'schemes', label: '📜 Gov Schemes & Portals' },
        { id: 'control', label: '⚙️ Site Control' },
        { id: 'content', label: '📝 Site Content' },
        { id: 'messages', label: '💬 Messages' },
        { id: 'profile', label: '👤 My Profile' },
    ]

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header" style={{ cursor: 'pointer' }} onClick={() => setTab('profile')}>
                    <input
                        type="file" ref={adminPicRef} hidden accept="image/*"
                        onChange={e => e.target.files[0] && handleAdminPicUpload(e.target.files[0])}
                    />
                    <div className="admin-avatar" style={{ position: 'relative', overflow: 'visible' }}
                        onClick={e => { e.stopPropagation(); adminPicRef.current?.click() }}>
                        {adminProfile?.profilePic ? (
                            <img src={adminProfile.profilePic} alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                            <span style={{ fontSize: '1.5rem' }}>👤</span>
                        )}
                        <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#3b82f6', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white', border: '2px solid white', cursor: 'pointer' }}>✒️</span>
                    </div>
                    <div className="admin-info">
                        <h3>{adminProfile?.name || 'ADMIN'}</h3>
                        <p>ADMIN PANEL</p>
                    </div>
                </div>
                <nav className="admin-sidebar-menu">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`sidebar-link ${tab === t.id ? 'active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <span className="sidebar-icon">{t.label.split(' ')[0]}</span>
                            <span className="sidebar-label">{t.label.substring(t.label.indexOf(' ') + 1)}</span>
                        </button>
                    ))}
                </nav>
                <div className="admin-sidebar-footer">
                    <button className="sidebar-logout-btn" onClick={() => {
                        localStorage.removeItem('fasalCurrentUser'); navigate('/login')
                    }}>
                        <span className="sidebar-icon" style={{ color: '#ef4444' }}>🚪</span>
                        <span className="sidebar-label" style={{ color: '#ef4444' }}>LOGOUT</span>
                    </button>
                </div>
            </aside>
            <main className="admin-main">
                <div className="admin-content-container">

                        {/* Toast */}
                        {toast && <div className="admin-action-toast">{toast}</div>}

                        {/* ── FULL-SCREEN DOCUMENT VIEWER ── */}
                        {docViewer && (
                            <div
                                className="admin-confirm-overlay"
                                style={{ background: 'rgba(0,0,0,0.92)', zIndex: 999999 }}
                                onClick={() => setDocViewer(null)}
                            >
                                <div
                                    style={{
                                        position: 'relative',
                                        width: '95vw', height: '92vh',
                                        display: 'flex', flexDirection: 'column',
                                        background: '#0f172a', borderRadius: '16px',
                                        overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
                                    }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '1.5rem' }}>📄</span>
                                            <div>
                                                <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '1rem' }}>{docViewer.name}</p>
                                                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>Expert Uploaded Document</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <a
                                                href={getSafeDownloadUrl(docViewer.url)}
                                                target="_blank" rel="noreferrer"
                                                download
                                                style={{ background: '#3b82f6', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                ⬇️ Download
                                            </a>
                                            <button
                                                onClick={() => setDocViewer(null)}
                                                style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}
                                            >
                                                ✕ Close
                                            </button>
                                        </div>
                                    </div>
                                    {/* Content */}
                                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#0f172a' }}>
                                        {docViewer.type === 'image' ? (
                                            <img
                                                src={docViewer.url}
                                                alt={docViewer.name}
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}
                                            />
                                        ) : docViewer.type === 'pdf' ? (
                                            <iframe
                                                src={docViewer.url}
                                                title={docViewer.name}
                                                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                                            />
                                        ) : (
                                            <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📄</div>
                                                <h3 style={{ marginBottom: '1rem' }}>Unable to preview this document directly</h3>
                                                <p style={{ marginBottom: '1.5rem', color: '#94a3b8', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                                                    The document may be restricted or hosted on a secure server. Please download it to view correctly.
                                                </p>
                                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                                    <a
                                                        href={getSafeDownloadUrl(docViewer.originalUrl)}
                                                        target="_blank" rel="noreferrer"
                                                        style={{ background: '#3b82f6', color: 'white', padding: '0.75rem 2rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}
                                                    >
                                                        ⬇️ Download Document
                                                    </a>
                                                    <a
                                                        href={docViewer.originalUrl}
                                                        target="_blank" rel="noreferrer"
                                                        style={{ background: '#475569', color: 'white', padding: '0.75rem 2rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}
                                                    >
                                                        👁️ Open Original Link
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Delete confirm modal */}
                        {confirmDel && (
                            <div className="admin-confirm-overlay">
                                <div className="admin-confirm-box">
                                    <p className="acb-icon">⚠️</p>
                                    <h3>Delete User?</h3>
                                    <p>This will permanently remove <strong>{confirmDel}</strong> from the system. This cannot be undone.</p>
                                    <div className="acb-actions">
                                        <button className="acb-btn danger" onClick={() => deleteUser(confirmDel)}>Yes, Delete</button>
                                        <button className="acb-btn cancel" onClick={() => setConfirmDel(null)}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Remove Expert confirm modal */}
                        {confirmRemove && (
                            <div className="admin-confirm-overlay">
                                <div className="admin-confirm-box">
                                    <p className="acb-icon">🗑️</p>
                                    <h3>Remove Expert?</h3>
                                    <p>This will permanently delete <strong>{confirmRemove}</strong>'s expert account. This cannot be undone.</p>
                                    <div className="acb-actions">
                                        <button className="acb-btn danger" onClick={() => removeExpert(confirmRemove)}>Yes, Remove</button>
                                        <button className="acb-btn cancel" onClick={() => setConfirmRemove(null)}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reset password info modal */}
                        {resetInfo && (
                            <div className="admin-confirm-overlay">
                                <div className="admin-confirm-box">
                                    <p className="acb-icon">🔄</p>
                                    <h3>Password Reset Done!</h3>
                                    <p style={{ marginBottom: '0.5rem' }}>Temporary password for <strong>{resetInfo.email}</strong>:</p>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            background: '#f8fafc', border: '2px solid #e2e8f0',
                                            borderRadius: '12px', padding: '1rem',
                                            fontFamily: 'monospace', fontSize: '1.25rem',
                                            fontWeight: 800, color: '#0f172a', letterSpacing: '1.5px',
                                            textAlign: 'center', marginBottom: '1rem',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                                        }}>
                                            {resetInfo.tempPass}
                                        </div>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(resetInfo.tempPass);
                                                showToast('📋 Copied to clipboard!');
                                            }}
                                            style={{
                                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-75%)',
                                                background: '#3b82f6', color: 'white', border: 'none',
                                                borderRadius: '6px', padding: '4px 10px', fontSize: '11px',
                                                fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                                            }}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>
                                        ⚠️ Share this with the expert. They should change it after login.
                                    </p>
                                    <div className="acb-actions">
                                        <button className="acb-btn cancel" onClick={() => setResetInfo(null)}>Close</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Expert detail / verification modal popup */}
                        {viewExpert && (
                            <div className="admin-confirm-overlay" onClick={() => setViewExpert(null)}>
                                <div className="expert-modal-box em-modal-premium animate-fadeInUp" style={{ maxWidth: '850px' }} onClick={e => e.stopPropagation()}>
                                    <div className="em-cover-banner"></div>
                                    <button className="em-close em-close-premium" onClick={() => setViewExpert(null)}>✕</button>

                                    <div className="em-header-premium">
                                        <img
                                            src={viewExpert.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewExpert.name || 'Expert')}&background=random&color=fff&bold=true&size=120`}
                                            alt={viewExpert.name}
                                            className="em-avatar-large"
                                        />
                                        <div className="em-title-area">
                                            <h3>{viewExpert.name}</h3>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span className={`em-status-badge ${viewExpert.approved ? 'approved' : viewExpert.rejected ? 'rejected' : 'pending'}`}>
                                                    {viewExpert.approved ? '✅ Approved' : viewExpert.rejected ? '❌ Rejected' : '⏳ Pending'}
                                                </span>
                                                <button 
                                                    onClick={() => resetUserPassword(viewExpert)}
                                                    style={{ padding: '4px 12px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '16px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    🔑 Reset Password
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="em-body em-body-premium">
                                        <div className="em-grid-cards">
                                            {/* LEFT: Info */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div className="em-grid-card">
                                                    <h4>📋 Personal & Professional</h4>
                                                    <p><strong>Email:</strong> {viewExpert.email}</p>
                                                    <p><strong>Mobile:</strong> {viewExpert.mobile || '—'}</p>
                                                    <p><strong>Qualification:</strong> {viewExpert.qualification} {viewExpert.passingYear ? `(${viewExpert.passingYear})` : ''}</p>
                                                    <p><strong>Specialization:</strong> {viewExpert.specialization}</p>
                                                    {viewExpert.experience && <p><strong>Experience:</strong> {viewExpert.experience} Years</p>}
                                                </div>
                                                <div className="em-grid-card">
                                                    <h4>🛡️ Identity Info</h4>
                                                    <p><strong>ID Type:</strong> {viewExpert.idProofType || 'Govt. ID'}</p>
                                                    <p><strong>ID Number:</strong> {viewExpert.idProof || '—'}</p>
                                                </div>
                                            </div>

                                            {/* RIGHT: Sequential Documents */}
                                            <div className="em-grid-card em-grid-full" style={{ background: '#f8fafc' }}>
                                                <h4>📄 VERIFICATION DOCUMENTS (SERIAL VIEW)</h4>
                                                <div className="em-serial-docs" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                                                    
                                                    {/* DOC 1 */}
                                                    <div className="serial-doc-item" style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                            <div style={{ width: '40px', height: '40px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>1</div>
                                                            <div>
                                                                <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Government ID Proof</p>
                                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Aadhar / PAN / Driving License</p>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            {viewExpert.idProof && viewExpert.idProof.startsWith('http') ? (
                                                                <>
                                                                    <button onClick={() => openDocViewer(viewExpert.idProof, 'ID Proof')} className="em-doc-link-btn" style={{ background: '#0ea5e9', fontSize: '0.8rem' }}>👁️ Preview</button>
                                                                    <a href={getSafeDownloadUrl(viewExpert.idProof)} target="_blank" rel="noreferrer" download className="em-doc-link-btn" style={{ background: '#1e293b', fontSize: '0.8rem' }}>⬇️ Save</a>
                                                                </>
                                                            ) : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No URL</span>}
                                                        </div>
                                                    </div>

                                                    {/* DOC 2 */}
                                                    <div className="serial-doc-item" style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                            <div style={{ width: '40px', height: '40px', background: '#059669', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>2</div>
                                                            <div>
                                                                <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Highest Degree Certificate</p>
                                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Medical / Agriculture Graduation</p>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            {viewExpert.docLink ? (
                                                                <>
                                                                    <button onClick={() => openDocViewer(viewExpert.docLink, 'Degree Certificate')} className="em-doc-link-btn" style={{ background: '#0ea5e9', fontSize: '0.8rem' }}>👁️ Preview</button>
                                                                    <a href={getSafeDownloadUrl(viewExpert.docLink)} target="_blank" rel="noreferrer" download className="em-doc-link-btn" style={{ background: '#1e293b', fontSize: '0.8rem' }}>⬇️ Save</a>
                                                                </>
                                                            ) : <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>Missing Document</span>}
                                                        </div>
                                                    </div>

                                                    {/* DOC 3 */}
                                                    <div className="serial-doc-item" style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                            <div style={{ width: '40px', height: '40px', background: '#9333ea', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>3</div>
                                                            <div>
                                                                <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Secondary Verification Doc</p>
                                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Registration / Experience Letter</p>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            {viewExpert.secondaryDocLink ? (
                                                                <>
                                                                    <button onClick={() => openDocViewer(viewExpert.secondaryDocLink, 'Secondary Document')} className="em-doc-link-btn" style={{ background: '#0ea5e9', fontSize: '0.8rem' }}>👁️ Preview</button>
                                                                    <a href={getSafeDownloadUrl(viewExpert.secondaryDocLink)} target="_blank" rel="noreferrer" download className="em-doc-link-btn" style={{ background: '#1e293b', fontSize: '0.8rem' }}>⬇️ Save</a>
                                                                </>
                                                            ) : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Not Uploaded</span>}
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!viewExpert.approved && !viewExpert.rejected && (
                                        <div className="em-footer em-footer-premium">
                                            <button className="em-btn reject-btn" onClick={() => rejectExpert(viewExpert)}>❌ Reject Application</button>
                                            <button className="em-btn approve-btn" onClick={() => approveExpert(viewExpert)}>✅ Approve Expert</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Farmer Profile Modal */}
                        {viewFarmer && (
                            <div className="admin-confirm-overlay" onClick={() => setViewFarmer(null)}>
                                <div className="expert-modal-box em-modal-premium animate-fadeInUp" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                                    <div className="em-cover-banner" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)' }}></div>
                                    <button className="em-close em-close-premium" onClick={() => setViewFarmer(null)}>✕</button>

                                    <div className="em-header-premium">
                                        <img
                                            src={viewFarmer.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewFarmer.name || 'Farmer')}&background=random&color=fff&bold=true&size=120`}
                                            alt={viewFarmer.name}
                                            className="em-avatar-large"
                                            style={{ borderColor: '#22c55e' }}
                                        />
                                        <div className="em-title-area">
                                            <h3>{viewFarmer.name}</h3>
                                            <span className="em-status-badge approved">🌾 Farmer</span>
                                        </div>
                                    </div>

                                    <div className="em-body em-body-premium">
                                        <div className="em-grid-cards">
                                            <div className="em-grid-card">
                                                <h4>Personal Info</h4>
                                                <p><strong>Email:</strong> {viewFarmer.email}</p>
                                                <p><strong>Mobile:</strong> {viewFarmer.mobile || '—'}</p>
                                                <p><strong>Address:</strong> {viewFarmer.addressLine || viewFarmer.village || '—'}</p>
                                                <p><strong>Location:</strong> {viewFarmer.district ? `${viewFarmer.district}, ` : ''}{viewFarmer.state || '—'}</p>
                                            </div>

                                            <div className="em-grid-card">
                                                <h4>Farm Details</h4>
                                                <p><strong>Land Area:</strong> {viewFarmer.landArea ? `${viewFarmer.landArea} Acres` : '—'}</p>
                                                <p><strong>Soil Type:</strong> {viewFarmer.soilType || '—'}</p>
                                                <p><strong>Irrigation:</strong> {viewFarmer.irrigationType || '—'}</p>
                                                <p><strong>Experience:</strong> {viewFarmer.experience ? `${viewFarmer.experience} Years` : '—'}</p>
                                            </div>

                                            {viewFarmer.crops && viewFarmer.crops.length > 0 && (
                                                <div className="em-grid-card em-grid-full">
                                                    <h4>Crops Tracked</h4>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                        {viewFarmer.crops.map(crop => (
                                                            <span key={crop} style={{ background: '#f0fdf4', color: '#166534', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                                                                {crop}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {viewFarmer.bio && (
                                                <div className="em-grid-card em-grid-full">
                                                    <h4>Bio / About</h4>
                                                    <p style={{ fontStyle: 'italic', color: '#475569' }}>"{viewFarmer.bio}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="em-footer em-footer-premium" style={{ borderTop: '1px solid #f1f5f9' }}>
                                        <button className="em-btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={() => setViewFarmer(null)}>Close Profile</button>
                                        <button className="em-btn approve-btn" style={{ background: '#16a34a' }} onClick={() => {
                                            const mailto = `mailto:${viewFarmer.email}?subject=Farming Support System Admin Assistance`;
                                            window.location.href = mailto;
                                        }}>📧 Contact Farmer</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tabs moved to sidebar */}

                        {/* ── OVERVIEW TAB ── */}
                        {tab === 'overview' && (
                            <div className="animate-fadeInUp">
                                <div className="admin-analytics">
                                    {analytics.map(a => (
                                        <div key={a.label} className="analytics-card" style={{ borderTop: `3px solid ${a.color}` }}>
                                            <div className="analytics-icon">{a.icon}</div>
                                            <div className="analytics-value" style={{ color: a.color }}>{a.value}</div>
                                            <div className="analytics-label">{a.label}</div>
                                            <div className="analytics-change neutral">{a.sub}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Quick summary table */}
                                <div className="admin-panel">
                                    <div className="admin-panel-header">
                                        <h2>📋 Recent Registrations</h2>
                                        <button className="admin-action-btn" onClick={() => setTab('users')}>View All →</button>
                                    </div>
                                    {users.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>No users registered yet.</p>
                                    ) : (
                                        <div className="users-table-wrapper">
                                            <table className="users-table">
                                                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                                                <tbody>
                                                    {[...users].reverse().slice(0, 6).map((u, i) => (
                                                        <tr key={i}>
                                                            <td className="user-name-cell">
                                                                <span className="user-table-avatar">{u.role === 'expert' ? '👨‍⚕️' : '👨‍🌾'}</span>
                                                                <span 
                                                                    style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}
                                                                    onClick={() => u.role === 'expert' ? setViewExpert(u) : setViewFarmer(u)}
                                                                >
                                                                    {u.name || '—'}
                                                                </span>
                                                            </td>
                                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{u.email}</td>
                                                            <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                                                            <td>
                                                                <span className={`user-status ${u.suspended ? 'suspended' : u.role === 'expert' ? (u.approved ? 'active' : u.rejected ? 'suspended' : 'pending') : 'active'}`}>
                                                                    {u.suspended ? 'Suspended' : u.role === 'expert' ? (u.approved ? 'Approved' : u.rejected ? 'Rejected' : 'Pending') : 'Active'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── USERS TAB ── */}
                        {tab === 'users' && (
                            <div className="animate-fadeInUp admin-panel">
                                <div className="admin-panel-header">
                                    <h2>👥 All Users ({users.length})</h2>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span className="admin-stat-pill">🌾 {farmers.length} Farmers</span>
                                        <span className="admin-stat-pill">👨‍⚕️ {experts.length} Experts</span>
                                        <span className="admin-stat-pill" style={{ background: '#ffebee', color: '#c62828' }}>⛔ {suspended.length} Suspended</span>
                                    </div>
                                </div>

                                {users.length === 0 ? (
                                    <div className="no-experts-msg">📭 No users registered yet.</div>
                                ) : (
                                    <div className="users-table-wrapper">
                                        <table className="users-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Mobile</th>
                                                    <th>Role</th>
                                                    <th>State</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map((u, i) => (
                                                    <tr key={i} className={u.suspended ? 'row-suspended' : ''}>
                                                        <td className="user-name-cell">
                                                            <img
                                                                className="user-table-avatar-img"
                                                                src={u.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=random&color=fff&bold=true`}
                                                                alt={u.name}
                                                            />
                                                            <span
                                                                style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}
                                                                onClick={() => u.role === 'expert' ? setViewExpert(u) : setViewFarmer(u)}
                                                                title={u.role === 'expert' ? "Click to view Expert Card" : "Click to view Farmer Profile"}
                                                            >
                                                                {u.name || '—'}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</td>
                                                        <td style={{ fontSize: '0.78rem' }}>{u.mobile || '—'}</td>
                                                        <td>
                                                            <select
                                                                className="role-select"
                                                                value={u.role}
                                                                onChange={e => changeRole(u, e.target.value)}
                                                            >
                                                                <option value="farmer">farmer</option>
                                                                <option value="expert">expert</option>
                                                            </select>
                                                        </td>
                                                        <td style={{ fontSize: '0.82rem' }}>{u.state || '—'}</td>
                                                        <td>
                                                            <span className={`user-status ${u.suspended ? 'suspended' : u.role === 'expert' ? (u.approved ? 'active' : u.rejected ? 'suspended' : 'pending') : 'active'}`}>
                                                                {u.suspended ? 'Suspended' : u.role === 'expert' ? (u.approved ? 'Approved' : u.rejected ? 'Rejected' : 'Pending') : 'Active'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="table-actions">
                                                                <button
                                                                    className={`tbl-btn ${u.suspended ? 'restore' : 'suspend'}`}
                                                                    title={u.suspended ? 'Restore User' : 'Suspend User'}
                                                                    onClick={() => suspendUser(u)}
                                                                >
                                                                    {u.suspended ? '✅' : '⛔'}
                                                                </button>
                                                                <button
                                                                    className="tbl-btn delete"
                                                                    title="Delete User"
                                                                    onClick={() => setConfirmDel(u)}
                                                                >🗑️</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── EXPERTS TAB ── */}
                        {tab === 'experts' && (
                            <div className="animate-fadeInUp">
                                {['pending', 'approved', 'rejected'].map(status => {
                                    const group = experts.filter(e =>
                                        status === 'pending' ? (!e.approved && !e.rejected) :
                                            status === 'approved' ? e.approved :
                                                e.rejected
                                    )
                                    if (group.length === 0) return null
                                    return (
                                        <div key={status} className="admin-panel" style={{ marginBottom: '1.25rem' }}>
                                            <div className="admin-panel-header">
                                                <h2>
                                                    {status === 'pending' ? '⏳ Pending Approval' : status === 'approved' ? '✅ Approved Experts' : '❌ Rejected Experts'}
                                                    <span className="pending-count" style={{ marginLeft: '0.5rem' }}>{group.length}</span>
                                                </h2>
                                            </div>
                                            <div className="users-table-wrapper">
                                                <table className="users-table expert-verify-table">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>NAME</th>
                                                            <th>EMAIL</th>
                                                            <th>SPECIALTY</th>
                                                            <th>MOBILE</th>
                                                            <th>STATUS</th>
                                                            <th>ACTIONS</th>
                                                            <th>PROFILE</th>
                                                            <th>DOCS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.map((ev, i) => (
                                                            <React.Fragment key={i}>
                                                                <tr className={`evt-row ${expandedRow === ev.email ? 'evt-expanded' : ''}`}>
                                                                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                                                    <td
                                                                        style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}
                                                                        onClick={() => setViewExpert(ev)}
                                                                        title="Click to view full verification card"
                                                                    >
                                                                        {ev.name}
                                                                    </td>
                                                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ev.email}</td>
                                                                    <td style={{ fontSize: '0.85rem' }}>{ev.specialization || 'General'}</td>
                                                                    <td style={{ fontSize: '0.85rem' }}>{ev.mobile || '—'}</td>
                                                                    <td>
                                                                        <span className={`evt-status evt-status-${status}`}>
                                                                            {status === 'pending' ? '⏳ Pending' : status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <div className="evt-actions">
                                                                            {status !== 'approved' && (
                                                                                <button className="evt-action-btn evt-approve" onClick={() => approveExpert(ev)}>✅ Approve</button>
                                                                            )}
                                                                            {status !== 'rejected' && (
                                                                                <button className="evt-action-btn evt-reject" onClick={() => rejectExpert(ev)}>❌ Reject</button>
                                                                            )}
                                                                            {status !== 'pending' && (
                                                                                <button className="evt-action-btn evt-reset" onClick={() => approveExpert(ev)}>⏳ Reset</button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <button
                                                                            className="evt-toggle-btn"
                                                                            onClick={() => setExpandedRow(expandedRow === ev.email ? null : ev.email)}
                                                                        >
                                                                            👁️ Profile
                                                                        </button>
                                                                    </td>
                                                                    <td>
                                                                        <button
                                                                            className="evt-toggle-btn"
                                                                            onClick={() => setExpandedRow(expandedRow === ev.email ? null : ev.email)}
                                                                        >
                                                                            {expandedRow === ev.email ? '▲ Hide' : '🔍 Verify'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                                {/* Inline Expanded Row */}
                                                                {expandedRow === ev.email && (
                                                                    <tr className="evt-details-row animate-fadeInUp">
                                                                        <td colSpan="9">
                                                                            <div className="evt-details-grid">
                                                                                <div className="evt-detail-col">
                                                                                    <h4>🪪 GOVERNMENT ID</h4>
                                                                                    <p><span>Type:</span> {ev.idProofType || 'Aadhaar Card'}</p>
                                                                                    <p><span>Number:</span> {ev.idProof || '—'}</p>

                                                                                    {ev.docLink && ev.docLink.startsWith('data:image') && (
                                                                                        <div className="evt-inline-preview-wrap">
                                                                                            <a href={ev.docLink} target="_blank" rel="noreferrer" className="evt-inline-link">🔍 View ID</a>
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Support external links like Cloudinary for Primary ID/Doc rendering */}
                                                                                    {ev.docLink && ev.docLink.startsWith('http') && (
                                                                                        <div className="evt-inline-preview-wrap" style={{ marginTop: '5px' }}>
                                                                                            <a href={getSafeDownloadUrl(ev.docLink)} target="_blank" rel="noreferrer" className="evt-inline-link">🔍 Download Primary Doc</a>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="evt-detail-col">
                                                                                    <h4>🏫 MEDICAL/AGRI COUNCIL</h4>
                                                                                    <p><span>Council/Institution:</span> {ev.institution || '—'}</p>
                                                                                    <p><span>Reg. Year:</span> {ev.passingYear || '—'}</p>
                                                                                    <p><span>Reg. No/Cert:</span> {ev.certNumber || '—'}</p>
                                                                                    <p><span>Qualification:</span> {ev.qualification || '—'}</p>
                                                                                </div>
                                                                                <div className="evt-detail-col">
                                                                                    <h4>📄 UPLOADED DOCUMENTS</h4>
                                                                                    <div className="evt-doc-list">
                                                                                        <div className="evt-doc-item">
                                                                                            <span>Degree/Certificate:</span>
                                                                                            {ev.docLink ? (
                                                                                                <a href={getSafeDownloadUrl(ev.docLink)} target="_blank" rel="noreferrer" className="evt-inline-link">📄 🔍 View</a>
                                                                                            ) : (
                                                                                                <span style={{ color: '#c62828' }}>Missing</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="evt-doc-item">
                                                                                            <span>Secondary Certificate:</span>
                                                                                            {ev.secondaryDocLink ? (
                                                                                                <a href={getSafeDownloadUrl(ev.secondaryDocLink)} target="_blank" rel="noreferrer" className="evt-inline-link">📄 🔍 View</a>
                                                                                            ) : (
                                                                                                <span style={{ color: '#c62828' }}>Missing</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="evt-doc-item">
                                                                                            <span>LinkedIn Profile:</span>
                                                                                            {ev.linkedinUrl ? (
                                                                                                <a href={ev.linkedinUrl} target="_blank" rel="noreferrer" className="evt-inline-link">🔗 Open</a>
                                                                                            ) : (
                                                                                                <span style={{ color: '#c62828' }}>Not provided</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )
                                })}
                                {experts.length === 0 && (
                                    <div className="admin-panel no-experts-msg">📭 No expert registrations yet.</div>
                                )}

                                {/* ── APPROVED EXPERTS PROFILE CARDS ── */}
                                {experts.filter(e => e.approved).length > 0 && (
                                    <div className="admin-panel" style={{ marginTop: '0.5rem' }}>
                                        <div className="admin-panel-header">
                                            <h2>🏅 Approved Expert Profiles
                                                <span className="pending-count" style={{ marginLeft: '0.5rem' }}>
                                                    {experts.filter(e => e.approved).length}
                                                </span>
                                            </h2>
                                        </div>
                                        <div className="expert-cards-grid">
                                            {experts.filter(e => e.approved).map((ev, i) => (
                                                <div key={i} className="expert-profile-card">
                                                    <div className="epc-top" style={{ cursor: 'pointer' }} onClick={() => setViewExpert(ev)}>
                                                        <img
                                                            src={ev.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(ev.name || 'Expert')}&background=random&color=fff&bold=true`}
                                                            className="epc-avatar-img"
                                                            alt={ev.name}
                                                        />
                                                        <div className="epc-title">
                                                            <p className="epc-name">{ev.name}</p>
                                                            <span className="role-badge role-expert epc-role-badge">Expert</span>
                                                        </div>
                                                        <button
                                                            className="epc-revoke-btn"
                                                            title="Revoke approval"
                                                            onClick={(e) => { e.stopPropagation(); rejectExpert(ev); }}>✕</button>
                                                    </div>
                                                    <div className="epc-body" onClick={() => setViewExpert(ev)} style={{ cursor: 'pointer' }}>
                                                        {ev.qualification && (
                                                            <div className="epc-row">
                                                                <span className="epc-label">🎓</span>
                                                                <span className="epc-value epc-qual-highlight">{ev.qualification} {ev.passingYear ? `(${ev.passingYear})` : ''}</span>
                                                            </div>
                                                        )}
                                                        {ev.institution && (
                                                            <div className="epc-row">
                                                                <span className="epc-label">🏫</span>
                                                                <span className="epc-value">{ev.institution}</span>
                                                            </div>
                                                        )}
                                                        {ev.specialization && (
                                                            <div className="epc-row">
                                                                <span className="epc-label">🌿</span>
                                                                <span className="epc-value">{ev.specialization}</span>
                                                            </div>
                                                        )}
                                                        {ev.occupation && (
                                                            <div className="epc-row">
                                                                <span className="epc-label">🏢</span>
                                                                <span className="epc-value">{ev.occupation}</span>
                                                            </div>
                                                        )}
                                                        {ev.experience && (
                                                            <div className="epc-row">
                                                                <span className="epc-label">📅</span>
                                                                <span className="epc-value">{ev.experience}</span>
                                                            </div>
                                                        )}
                                                        <div className="epc-row">
                                                            <span className="epc-label">📱</span>
                                                            <span className="epc-value">{ev.mobile || '—'}</span>
                                                        </div>
                                                        {ev.languages && (
                                                            <div className="epc-row">
                                                                <span className="epc-label">🗣️</span>
                                                                <span className="epc-value">{ev.languages}</span>
                                                            </div>
                                                        )}
                                                        {ev.consultFee && (
                                                            <div className="epc-row">
                                                                <span className="epc-label">💰</span>
                                                                <span className="epc-value epc-fee">₹{ev.consultFee}/hr</span>
                                                            </div>
                                                        )}
                                                        <div className="epc-row">
                                                            <span className="epc-label">📍</span>
                                                            <span className="epc-value">{ev.state || '—'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="epc-footer">
                                                        <span>✅ {ev.approvedAt || 'Recently approved'}</span>
                                                    </div>
                                                    <div className="epc-admin-actions">
                                                        <button
                                                            className="epc-action-btn reset"
                                                            title="Reset expert's password"
                                                            onClick={() => resetUserPassword(ev)}
                                                        >
                                                            🔄 Reset Password
                                                        </button>
                                                        <button
                                                            className="epc-action-btn remove"
                                                            title="Remove expert permanently"
                                                            onClick={() => setConfirmRemove(ev.email)}
                                                        >
                                                            🗑️ Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                        }

                        {/* ── COMMUNITY MODERATION TAB ── */}
                        {tab === 'community' && (
                            <>
                            <div className="animate-fadeInUp admin-panel">
                                <div className="admin-panel-header">
                                    <h2>🗣️ Community Moderation</h2>
                                    <span className="admin-stat-pill">{communityPosts.length} Total Posts</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                    Monitor and manage discussions on the Krishi Charcha community board. Delete inappropriate or spam posts here.
                                </p>

                                {communityPosts.length === 0 ? (
                                    <div className="no-experts-msg">📭 No posts in the community yet.</div>
                                ) : (
                                    <div className="users-table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                        <table className="users-table">
                                            <thead>
                                                <tr>
                                                    <th>Author</th>
                                                    <th>Date/Time</th>
                                                    <th style={{ width: '45%' }}>Content Preview</th>
                                                    <th>Engagement</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {communityPosts.map((post) => (
                                                    <tr key={post._id || post.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                {post.avatar === 'PICTURE' && post.profilePic ? (
                                                                    <img src={post.profilePic} alt="Author" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <span style={{ fontSize: '1.5rem' }}>{post.avatar}</span>
                                                                )}
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontWeight: 600 }}>{post.author}</span>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{post.expert ? '⭐ Expert' : 'Farmer'}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{post.time}</td>
                                                        <td>
                                                            <div style={{
                                                                fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-primary)',
                                                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                                            }} title={post.content}>
                                                                {post.content}
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: '0.8rem' }}>
                                                            ❤️ {post.likes} &nbsp; 💬 {post.comments}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="tbl-btn delete"
                                                                title="Delete Post"
                                                                onClick={() => deletePost(post._id || post.id)}
                                                            >
                                                                🗑️ Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ── COMMUNITY WIDGETS ADMIN ── */}
                            <div className="animate-fadeInUp admin-panel" style={{ marginTop: '2rem' }}>
                                <div className="admin-panel-header">
                                    <h2>🛠️ Community Sidebar Widgets</h2>
                                </div>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Edit the sidebar components displayed on the Community page.</p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

                                    {/* Experts */}
                                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <h3 style={{ marginTop: 0 }}>👨‍⚕️ Online Experts</h3>
                                        {expertsWidgets.map((ew, idx) => (
                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #cbd5e1' }}>
                                                <input type="text" className="input-field" value={ew.name} onChange={e => { const newE = [...expertsWidgets]; newE[idx].name = e.target.value; setExpertsWidgets(newE) }} placeholder="Name" style={{ padding: '0.5rem' }} />
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input type="text" className="input-field" value={ew.spec} onChange={e => { const newE = [...expertsWidgets]; newE[idx].spec = e.target.value; setExpertsWidgets(newE) }} placeholder="Specialty" style={{ width: '70%', padding: '0.5rem' }} />
                                                    <input type="text" className="input-field" value={ew.rating} onChange={e => { const newE = [...expertsWidgets]; newE[idx].rating = e.target.value; setExpertsWidgets(newE) }} placeholder="Rating" style={{ width: '30%', padding: '0.5rem' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Stats */}
                                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <h3 style={{ marginTop: 0 }}>📊 Community Stats</h3>
                                        {statsWidgets.map((sw, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <input type="text" className="input-field" value={sw.label} onChange={e => { const newS = [...statsWidgets]; newS[idx].label = e.target.value; setStatsWidgets(newS) }} placeholder="Label" style={{ width: '60%', padding: '0.5rem' }} />
                                                <input type="text" className="input-field" value={sw.value} onChange={e => { const newS = [...statsWidgets]; newS[idx].value = e.target.value; setStatsWidgets(newS) }} placeholder="Value" style={{ width: '40%', padding: '0.5rem' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                                    <button className="ctrl-btn publish" onClick={async () => {
                                        await persistSettings({ 
                                            communityWidgets: {
                                                trending: trendingWidgets,
                                                experts: expertsWidgets,
                                                stats: statsWidgets
                                            }
                                        })
                                        localStorage.setItem('fasalCommunityTrending', JSON.stringify(trendingWidgets))
                                        localStorage.setItem('fasalCommunityExperts', JSON.stringify(expertsWidgets))
                                        localStorage.setItem('fasalCommunityStats', JSON.stringify(statsWidgets))
                                        showToast('✅ Community widgets saved!')
                                    }} style={{ padding: '0.8rem 2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        💾 Save Widgets
                                    </button>
                                </div>
                            </div>
                            </>
                        )}

                        {/* ── MESSAGING TAB (WhatsApp Style) ── */}
                        {tab === 'messages' && (
                            <div className="admin-chat-container animate-fadeIn" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', height: 'calc(100vh - 120px)', gap: '1px', background: '#e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                {/* Sidebar: Expert List */}
                                <div className="chat-sidebar" style={{ background: 'white', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0', background: '#1e293b', color: 'white' }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>💬 Expert Messaging</h3>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>All approved experts</p>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        {expertContacts.length > 0 ? expertContacts.map(exp => (
                                            <div 
                                                key={exp._id} 
                                                onClick={() => { 
                                                    setSelectedExpert(exp); 
                                                    fetchChat(exp._id);
                                                    // Mark all messages from this expert as read
                                                    fetch(`${API_BASE}/api/messages/history/${adminProfile?._id}/${exp._id}`)
                                                        .then(r => r.json())
                                                        .then(d => {
                                                            if (d.success) {
                                                                d.data.filter(m => m.sender !== adminProfile?._id && !m.isRead)
                                                                    .forEach(m => fetch(`${API_BASE}/api/messages/${m._id}/read`, { method: 'PUT' }))
                                                            }
                                                        })
                                                        .catch(console.error)
                                                }}
                                                style={{ 
                                                    padding: '0.85rem 1rem', 
                                                    borderBottom: '1px solid #f1f5f9', 
                                                    cursor: 'pointer',
                                                    background: selectedExpert?._id === exp._id ? '#eff6ff' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden' }}>
                                                        {exp.profilePic ? <img src={exp.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : exp.name?.[0]?.toUpperCase()}
                                                    </div>
                                                    {exp.unreadCount > 0 && (
                                                        <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '0.6rem', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                                            {exp.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{exp.name}</span>
                                                        {exp.lastTime && <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(exp.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.73rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {exp.lastMessage || exp.specialization || exp.email}
                                                    </p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                                                <p style={{ fontSize: '0.85rem' }}>No approved experts yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Main Chat Area */}
                                <div className="chat-main" style={{ background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
                                    {selectedExpert ? (
                                        <>
                                            <div style={{ background: 'white', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                                        {selectedExpert.name?.[0]}
                                                    </div>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>{selectedExpert.name}</h4>
                                                        <span style={{ fontSize: '0.7rem', color: '#10b981' }}>🟢 Active Conversation</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedExpert(null)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Close</button>
                                            </div>

                                            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {chatHistory.map((msg, idx) => {
                                                    const isMe = msg.sender === adminProfile?._id;
                                                    // Auto-mark as read if unread and from expert
                                                    if (!isMe && !msg.isRead) {
                                                        fetch(`${API_BASE}/api/messages/${msg._id}/read`, { method: 'PUT' })
                                                            .catch(console.error)
                                                    }
                                                    return (
                                                        <div key={idx} style={{ 
                                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                            maxWidth: '70%',
                                                            background: isMe ? '#1e293b' : 'white',
                                                            color: isMe ? 'white' : '#1e1e1e',
                                                            padding: '0.8rem 1.2rem',
                                                            borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                                            fontSize: '0.92rem'
                                                        }}>
                                                            {msg.content}
                                                            <div style={{ fontSize: '0.65rem', marginTop: '5px', opacity: 0.6, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                                                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                <button onClick={() => handleDeleteMessage(msg._id)} style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0}} title="Delete message">🗑️</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div style={{ padding: '1.2rem', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem' }}>
                                                <input 
                                                    className="input-field"
                                                    value={adminReply}
                                                    onChange={(e) => setAdminReply(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                                    placeholder={`Reply to ${selectedExpert.name}...`}
                                                    style={{ flex: 1, borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px' }}
                                                />
                                                <button 
                                                    onClick={handleSendReply}
                                                    disabled={isSendingReply || !adminReply.trim()}
                                                    style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0 1.5rem', fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    {isSendingReply ? '...' : 'Send'}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✉️</div>
                                            <h3>Select an expert to view conversation</h3>
                                            <p>All private messages from experts will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── SCHEMES MANAGEMENT TAB ── */}

                        {tab === 'schemes' && (
                            <div className="animate-fadeInUp">
                                <div className="admin-panel" style={{ marginBottom: '1.5rem' }}>
                                    <div className="admin-panel-header">
                                        <h2>📜 Government Schemes & Portals</h2>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                className="admin-action-btn"
                                                onClick={handleAutoSync}
                                                disabled={isSyncing}
                                                style={{ background: isSyncing ? '#94a3b8' : 'var(--primary-color)', opacity: isSyncing ? 0.7 : 1 }}
                                            >
                                                {isSyncing ? '⏳ Syncing Data...' : '🔄 Sync with Central Portal'}
                                            </button>
                                            <button className="admin-action-btn" onClick={() => setShowSchemeForm(!showSchemeForm)}>
                                                {showSchemeForm ? '✕ Close Form' : '+ Add New Scheme (Manual)'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Add Scheme Form */}
                                    {showSchemeForm && (
                                        <div style={{
                                            background: '#ffffff',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            padding: '2rem',
                                            marginBottom: '2rem',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                                            animation: 'fadeInUp 0.3s ease-out'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>
                                                        {editingScheme ? `✏️ Editing: ${editingScheme.name}` : '✨ Create New Program'}
                                                    </h3>
                                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        {editingScheme ? 'Update the details below to save changes to this scheme.' : 'Fill in the details to publish a new government scheme.'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setNewScheme({ name: '', category: 'Income Support', description: '', eligibility: '', benefit: '', deadline: '', ministry: '', icon: '📜', color: '#1565C0', featured: false })}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    ♻️ Reset Form
                                                </button>
                                            </div>

                                            <div className="admin-scheme-form-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '2.5rem' }}>
                                                {/* Left: Form Fields */}
                                                <form onSubmit={handleAddScheme} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Scheme Name *</label>
                                                            <input type="text" className="input-field" value={newScheme.name} onChange={e => setNewScheme({ ...newScheme, name: e.target.value })} placeholder="e.g. PM-KISAN" required />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Program Category</label>
                                                            <select className="input-field" value={newScheme.category} onChange={e => setNewScheme({ ...newScheme, category: e.target.value })}>
                                                                <option>Income Support</option><option>Crop Insurance</option><option>Solar Energy</option><option>Credit</option><option>Horticulture</option><option>Marketing</option><option>Subsidies</option><option>Infrastructure</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Detailed Description *</label>
                                                        <textarea className="input-field" value={newScheme.description} onChange={e => setNewScheme({ ...newScheme, description: e.target.value })} rows="3" placeholder="Explain the scheme objectives and goals..." required />
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Eligibility Focus</label>
                                                            <input type="text" className="input-field" value={newScheme.eligibility} onChange={e => setNewScheme({ ...newScheme, eligibility: e.target.value })} placeholder="e.g. All landholding farmers" />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Financial Benefit</label>
                                                            <input type="text" className="input-field" value={newScheme.benefit} onChange={e => setNewScheme({ ...newScheme, benefit: e.target.value })} placeholder="e.g. ₹6,000/year" />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Scheme Icon</label>
                                                            <input type="text" className="input-field" value={newScheme.icon} onChange={e => setNewScheme({ ...newScheme, icon: e.target.value })} placeholder="e.g. 📜" />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Accent Color</label>
                                                            <input type="color" className="input-field" value={newScheme.color} onChange={e => setNewScheme({ ...newScheme, color: e.target.value })} style={{ height: '42px', padding: '2px' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Application URL</label>
                                                            <input type="url" className="input-field" value={newScheme.applyUrl} onChange={e => setNewScheme({ ...newScheme, applyUrl: e.target.value })} placeholder="https://..." />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Application Deadline</label>
                                                            <input type="text" className="input-field" value={newScheme.deadline} onChange={e => setNewScheme({ ...newScheme, deadline: e.target.value })} placeholder="e.g. Ongoing / Mar 31" />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Issuing Ministry</label>
                                                            <input type="text" className="input-field" value={newScheme.ministry} onChange={e => setNewScheme({ ...newScheme, ministry: e.target.value })} placeholder="e.g. Ministry of Agriculture" />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Visual Assets (Icon & Color)</label>
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', flex: 1 }}>
                                                                {['📜', '💰', '🛡️', '☀️', '💳', '🌾', '🚜', '💧', '🐄', '🏥'].map(icon => (
                                                                    <button
                                                                        key={icon}
                                                                        type="button"
                                                                        onClick={() => setNewScheme({ ...newScheme, icon })}
                                                                        style={{
                                                                            fontSize: '1.2rem',
                                                                            width: '36px', height: '36px',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            borderRadius: '6px',
                                                                            background: newScheme.icon === icon ? 'white' : 'transparent',
                                                                            border: newScheme.icon === icon ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                                                                            cursor: 'pointer',
                                                                            transition: '0.2s'
                                                                        }}
                                                                    >
                                                                        {icon}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '1rem', borderLeft: '1px solid #e2e8f0' }}>
                                                                <input type="color" value={newScheme.color} onChange={e => setNewScheme({ ...newScheme, color: e.target.value })} style={{ cursor: 'pointer', height: '36px', width: '36px', border: 'none', borderRadius: '4px', padding: '0', background: 'none' }} />
                                                            </div>
                                                        </div>
                                                    </div>



                                                    <div>

                                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>

                                                            🔗 Apply URL (Government Site Link) *

                                                        </label>

                                                        <input

                                                            type="url"

                                                            className="input-field"

                                                            value={newScheme.applyUrl || ''}

                                                            onChange={e => setNewScheme({ ...newScheme, applyUrl: e.target.value })}

                                                            placeholder="e.g. https://pmkisan.gov.in/"

                                                        />

                                                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>

                                                            ℹ️ Farmers will be redirected to this URL when they click Apply.

                                                        </p>

                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                                                            <input type="checkbox" checked={newScheme.featured} onChange={e => setNewScheme({ ...newScheme, featured: e.target.checked })} />
                                                            ⭐ Feature this Program at the top
                                                        </label>
                                                        <button type="submit" className="sc-apply-btn" style={{ padding: '0.8rem 2.5rem', boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)' }}>
                                                            {editingScheme ? '💾 Update Scheme' : '🚀 Publish Scheme'}
                                                        </button>
                                                    </div>
                                                </form>

                                                {/* Right: Live Preview */}
                                                <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '1rem' }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Live Appearance Preview</label>
                                                    <div className="preview-container" style={{ perspective: '1000px' }}>
                                                        {/* Simulated Frontend Card */}
                                                        <div style={{
                                                            background: 'white',
                                                            borderRadius: '12px',
                                                            padding: '1.5rem',
                                                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                                                            border: '1px solid #e2e8f0',
                                                            borderTop: `4px solid ${newScheme.color || 'var(--primary-color)'}`,
                                                            width: '100%',
                                                            maxWidth: '320px',
                                                            margin: '0 auto',
                                                            transition: '0.3s'
                                                        }}>
                                                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                                                <div style={{ fontSize: '1.75rem' }}>{newScheme.icon}</div>
                                                                <div style={{ overflow: 'hidden' }}>
                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: newScheme.color }}>{newScheme.category}</span>
                                                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{newScheme.name || 'New Scheme Name'}</h3>
                                                                </div>
                                                            </div>
                                                            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5', margin: '0 0 1rem', height: '3.6em', overflow: 'hidden' }}>
                                                                {newScheme.description || 'Provide a description to see it appear here in the live card preview...'}
                                                            </p>
                                                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>💰 Benefit:</div>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: newScheme.color }}>{newScheme.benefit || '---'}</div>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{newScheme.ministry || 'Dept of Agriculture'}</span>
                                                                <div style={{ background: newScheme.color, color: 'white', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>Apply →</div>
                                                            </div>
                                                        </div>
                                                        <center style={{ marginTop: '1.5rem', opacity: 0.6, fontSize: '0.8rem' }}>
                                                            💡 This is how it will look to Farmers
                                                        </center>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                    )}

                                    {/* Schemes Table */}
                                    <div className="users-table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                        <table className="users-table">
                                            <thead>
                                                <tr>
                                                    <th>Program Name</th>
                                                    <th>Category</th>
                                                    <th>Benefits</th>
                                                    <th>Deadline</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {schemesList.map((scheme) => (
                                                    <tr key={scheme._id || scheme.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{ fontSize: '1.2rem' }}>{scheme.icon}</span>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                                        {scheme.name} {scheme.featured && <span title="Featured" style={{ fontSize: '0.8rem' }}>⭐</span>}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{scheme.ministry}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td><span className="role-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{scheme.category}</span></td>
                                                        <td style={{ fontSize: '0.85rem' }}>{scheme.benefit}</td>
                                                        <td style={{ fontSize: '0.8rem', color: scheme.deadline === 'Ongoing' ? '#059669' : '#d97706' }}>{scheme.deadline}</td>
                                                        <td>

                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>

                                                                <button className="tbl-btn" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }} title="Edit Scheme" onClick={() => handleEditScheme(scheme)}>

                                                                    ✏️ Edit

                                                                </button>

                                                                <button className="tbl-btn delete" title="Delete Scheme" onClick={() => deleteScheme(scheme._id || scheme.id)}>
                                                                    🗑️ Delete
                                                                </button>

                                                            </div>

                                                        </td>

                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {schemesList.length === 0 && <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No schemes available.</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── CONTROL TAB ── */}
                        {tab === 'control' && (
                            <div className="animate-fadeInUp admin-control-grid">

                                {/* Broadcast Announcement */}
                                <div className="admin-panel control-panel">
                                    <h2 className="ctrl-heading">📢 Broadcast Announcement</h2>
                                    <p className="ctrl-hint">This message will appear as a banner to ALL users on the site.</p>
                                    {announcement && (
                                        <div className="active-announcement-preview">
                                            <span className="aap-dot" />
                                            <strong>Active:</strong> {announcement}
                                        </div>
                                    )}
                                    <textarea
                                        className="ctrl-textarea"
                                        value={announcementInput}
                                        onChange={e => setAnnouncementInput(e.target.value)}
                                        placeholder="e.g. 🚨 Scheduled maintenance on Feb 25. Service may be unavailable from 2–4 AM IST."
                                        rows={3}
                                    />
                                    <div className="ctrl-btn-row">
                                        <button className="ctrl-btn publish" onClick={saveAnnouncement} disabled={!announcementInput.trim()}>
                                            📢 Publish
                                        </button>
                                        {announcement && (
                                            <button className="ctrl-btn clear" onClick={clearAnnouncement}>
                                                🗑️ Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Site Toggles */}
                                <div className="admin-panel control-panel">
                                    <h2 className="ctrl-heading">⚙️ Site Settings</h2>

                                    <div className="ctrl-toggle-row">
                                        <div className="ctr-left">
                                            <p className="ctr-title">🔧 Maintenance Mode</p>
                                            <p className="ctr-desc">Shows maintenance page to all non-admin users.</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={maintenanceMode} onChange={toggleMaintenance} />
                                            <span className="toggle-knob" />
                                        </label>
                                    </div>

                                    <div className="ctrl-toggle-row">
                                        <div className="ctr-left">
                                            <p className="ctr-title">📝 User Registration</p>
                                            <p className="ctr-desc">Allow new users to register on the platform.</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={allowRegistration} onChange={toggleRegistration} />
                                            <span className="toggle-knob" style={{ '--on-color': '#4CAF50' }} />
                                        </label>
                                    </div>

                                    <div className="ctrl-toggle-row">
                                        <div className="ctr-left">
                                            <p className="ctr-title">⚡ Auto-Approve Experts</p>
                                            <p className="ctr-desc">Experts are approved automatically on registration.</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={expertAutoApprove} onChange={toggleAutoApprove} />
                                            <span className="toggle-knob" />
                                        </label>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="admin-panel control-panel danger-zone">
                                    <h2 className="ctrl-heading" style={{ color: '#c62828' }}>⚠️ Danger Zone</h2>
                                    <p className="ctrl-hint">These actions are irreversible. Use with extreme caution.</p>
                                    <div className="danger-actions">
                                        <button className="danger-btn" onClick={async () => {
                                            const confirm = window.confirm('Delete ALL farmers? This cannot be undone!')
                                            if (!confirm) return
                                            try {
                                                const res = await fetch(`${API_BASE}/api/admin/bulk-users`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ action: 'delete', role: 'farmer' })
                                                })
                                                if ((await res.json()).success) {
                                                    setUsers(prev => prev.filter(u => u.role !== 'farmer'))
                                                    showToast('🗑️ All farmer accounts deleted.')
                                                }
                                            } catch (e) { showToast('❌ Operation failed.') }
                                        }}>
                                            🗑️ Delete All Farmers
                                        </button>
                                        <button className="danger-btn" onClick={async () => {
                                            const confirm = window.confirm('Suspend ALL users? They will not be able to login!')
                                            if (!confirm) return
                                            try {
                                                const res = await fetch(`${API_BASE}/api/admin/bulk-users`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ action: 'suspend' })
                                                })
                                                if ((await res.json()).success) {
                                                    setUsers(prev => prev.map(u => ({ ...u, suspended: true })))
                                                    showToast('⛔ All users suspended.')
                                                }
                                            } catch (e) { showToast('❌ Operation failed.') }
                                        }}>
                                            ⛔ Suspend All Users
                                        </button>
                                        <button className="danger-btn restore-btn" onClick={async () => {
                                            try {
                                                const res = await fetch(`${API_BASE}/api/admin/bulk-users`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ action: 'restore' })
                                                })
                                                if ((await res.json()).success) {
                                                    setUsers(prev => prev.map(u => ({ ...u, suspended: false })))
                                                    showToast('✅ All users restored.')
                                                }
                                            } catch (e) { showToast('❌ Operation failed.') }
                                        }}>
                                            ✅ Restore All Users
                                        </button>
                                    </div>
                                </div>

                            </div>
                        )}

                        {tab === 'content' && (
                            <div className="animate-fadeInUp admin-control-grid">
                                <div className="admin-panel control-panel" style={{ gridColumn: '1 / -1' }}>
                                    <h2 className="ctrl-heading">📝 Site Content Management</h2>
                                    <p className="ctrl-hint">Edit the text content shown across various pages of the website.</p>
                                    
                                    <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
                                        {/* Home Page Content */}
                                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1e293b' }}>🏠 Home Page</h3>
                                            
                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Hero Title (e.g. Smart-Fasal)</label>
                                                <input type="text" className="input-field" style={{ width: '100%', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                                    value={siteContent.homeTitle || ''}
                                                    onChange={e => setSiteContent({ ...siteContent, homeTitle: e.target.value })}
                                                    placeholder="Leave empty for default" />
                                            </div>
                                            
                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Hero Subtitle (e.g. Suraksha)</label>
                                                <input type="text" className="input-field" style={{ width: '100%', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                                    value={siteContent.homeSubtitle || ''}
                                                    onChange={e => setSiteContent({ ...siteContent, homeSubtitle: e.target.value })}
                                                    placeholder="Leave empty for default" />
                                            </div>

                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Hero Tagline</label>
                                                <input type="text" className="input-field" style={{ width: '100%', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                                    value={siteContent.homeTagline || ''}
                                                    onChange={e => setSiteContent({ ...siteContent, homeTagline: e.target.value })}
                                                    placeholder="Leave empty for default" />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Hero Description</label>
                                                <textarea className="input-field" style={{ width: '100%', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} rows="3"
                                                    value={siteContent.homeDesc || ''}
                                                    onChange={e => setSiteContent({ ...siteContent, homeDesc: e.target.value })}
                                                    placeholder="Leave empty for default" />
                                            </div>
                                        </div>

                                        {/* Contact / Footer Info */}
                                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1e293b' }}>📞 Footer / Contact Info</h3>
                                            
                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Contact Email</label>
                                                <input type="email" className="input-field" style={{ width: '100%', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                                    value={siteContent.contactEmail || ''}
                                                    onChange={e => setSiteContent({ ...siteContent, contactEmail: e.target.value })}
                                                    placeholder="Leave empty for default" />
                                            </div>

                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Contact Phone</label>
                                                <input type="text" className="input-field" style={{ width: '100%', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                                    value={siteContent.contactPhone || ''}
                                                    onChange={e => setSiteContent({ ...siteContent, contactPhone: e.target.value })}
                                                    placeholder="Leave empty for default" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="ctrl-btn publish" onClick={saveSiteContent} style={{ padding: '0.8rem 2rem', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                            💾 Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── ADMIN PROFILE TAB ── */}
                        {tab === 'profile' && (
                            <div className="animate-fadeInUp">
                                <div className="admin-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: 0, overflow: 'hidden', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                                    <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', height: '140px', position: 'relative' }}></div>
                                    
                                    <div style={{ padding: '0 2.5rem 2.5rem 2.5rem', marginTop: '-60px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ width: '130px', height: '130px', borderRadius: '50%', border: '5px solid white', background: '#f1f5f9', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                                                    {adminProfile?.profilePic ? (
                                                        <img src={adminProfile.profilePic} alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : <span style={{ fontSize: '3.5rem', display: 'flex', justifyContent: 'center', marginTop: '20px' }}>👤</span>}
                                                </div>
                                                <button 
                                                    onClick={() => adminPicRef.current?.click()}
                                                    style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}
                                                    title="Change Photo"
                                                >
                                                    {adminPicUploading ? '⏳' : '✏️'}
                                                </button>
                                            </div>
                                            <div style={{ paddingBottom: '1rem' }}>
                                                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>{adminProfile?.name || 'Admin User'}</h1>
                                                <p style={{ margin: 0, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>🛡️ System Administrator</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📝 Account Information</h3>
                                                <div className="premium-profile-grid">
                                                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Full Display Name</label>
                                                        <input 
                                                            type="text" 
                                                            className="input-field" 
                                                            style={{ width: '100%', padding: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem' }}
                                                            value={adminProfile?.name || ''} 
                                                            onChange={e => setAdminProfile(prev => ({ ...prev, name: e.target.value }))}
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Login Email</label>
                                                        <input type="text" className="input-field" value={adminProfile?.email || ''} readOnly style={{ width: '100%', padding: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', cursor: 'not-allowed', color: '#94a3b8' }} />
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            localStorage.setItem('fasalCurrentUser', JSON.stringify(adminProfile))
                                                            showToast('✅ Admin identity updated!')
                                                        }}
                                                        style={{ width: '100%', padding: '1rem', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', marginTop: '1rem', boxShadow: '0 4px 12px rgba(5,150,105,0.2)', transition: '0.2s' }}
                                                    >
                                                        💾 Save Identity Changes
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📊 Identity Stats</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    <div className="profile-stat-box">
                                                        <div className="profile-stat-icon">📅</div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>JOINED DATE</p>
                                                            <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{adminProfile?.joinedDate ? new Date(adminProfile.joinedDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Jan 2024'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="profile-stat-box">
                                                        <div className="profile-stat-icon">🛡️</div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>SECURITY LEVEL</p>
                                                            <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Full Access (Root Admin)</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                </div>
            </main>
        </div>
    )
}

export default AdminDashboard

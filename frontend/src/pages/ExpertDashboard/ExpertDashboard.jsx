import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Footer from '../../components/Footer/Footer'
import Navbar from '../../components/Navbar/Navbar'
import { useNotifications } from '../../context/NotificationContext'
import { uploadToCloudinary } from '../../utils/cloudinary'
import './ExpertDashboard.css'

function ExpertDashboard() {
    const [activeTab, setActiveTab] = useState('overview')
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [farmerQueries, setFarmerQueries] = useState([])
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const [appointments, setAppointments] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [editForm, setEditForm] = useState({})
    const [replyingTo, setReplyingTo] = useState(null)
    const [replyText, setReplyText] = useState('')
    const [otherExperts, setOtherExperts] = useState([])
    const [adminMsg, setAdminMsg] = useState('')  // kept for backward compat
    const [messages, setMessages] = useState([])   // kept for backward compat
    const [adminId, setAdminId] = useState(null)
    const [isSendingMsg, setIsSendingMsg] = useState(false)

    // Full chat system state
    const [chatContacts, setChatContacts] = useState([])
    const [selectedChat, setSelectedChat] = useState(null)  // the selected contact object
    const [chatMessages, setChatMessages] = useState([])
    const [chatInput, setChatInput] = useState('')

    // Media Posting States
    const [postFile, setPostFile] = useState(null)
    const [postFilePreview, setPostFilePreview] = useState(null)
    const [myPosts, setMyPosts] = useState([])
    const [selectedCrop, setSelectedCrop] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState(null)
    const [audioUrl, setAudioUrl] = useState(null)
    const [recorder, setRecorder] = useState(null)
    const [isUploadingMedia, setIsUploadingMedia] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(null)

    const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'))

    const [replyImage, setReplyImage] = useState(null)
    const [replyImageUrl, setReplyImageUrl] = useState('')
    const [isRecordingReply, setIsRecordingReply] = useState(false)
    const [replyMediaRecorder, setReplyMediaRecorder] = useState(null)
    const [replyAudioUrl, setReplyAudioUrl] = useState('')
    const [replyAudioBlob, setReplyAudioBlob] = useState(null)
    const [uploadingReply, setUploadingReply] = useState(false)

    // Dashboard Stats Calculation
    const dashboardStats = {
        daysActive: currentUser?.stats?.daysActive || 0,
        incomeGrowth: currentUser?.stats?.incomeGrowth || '0%',
        pendingMeetings: appointments.filter(a => a.status === 'pending').length,
        feedbackCount: currentUser?.feedback?.length || 0,
        averageRating: currentUser?.feedback?.length ? (currentUser.feedback.reduce((sum, f) => sum + f.rating, 0) / currentUser.feedback.length).toFixed(1) : 0,
        callsToday: currentUser?.stats?.calls || 0,
        communityPosts: myPosts.length
    }

    useEffect(() => {
        const loggedUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')
        if (loggedUser && loggedUser.role !== 'expert') {
            navigate('/')
            return
        }

        const fetchAppointments = async () => {
            if (!loggedUser?._id) return
            try {
                const res = await fetch(`${API_BASE}/api/appointments/user/${loggedUser._id}`)
                const data = await res.json()
                if (data.success) {
                    setAppointments(data.data)
                }
            } catch (err) {
                console.error("Failed to fetch appointments:", err)
            }
        }

        // Profile 3.0 Data Initialization
        const defaultData = {
            qualifications: [{ degree: '', university: '', year: '' }],
            achievements: [''],
            skillTags: [''],
            services: [{ title: '', price: '', description: '' }],
            availability: 'Mon-Fri, 9AM-5PM',
            github: '',
            website: '',
            ...loggedUser
        }

        setCurrentUser(defaultData)
        setEditForm(defaultData)

        // Fetch latest profile from DB to get new feedback, etc.
        const fetchLatestProfile = async () => {
            if (!loggedUser?._id) return
            try {
                const res = await fetch(`${API_BASE}/api/user/${loggedUser._id}`)
                const data = await res.json()
                if (data.success) {
                    const mergedData = { ...defaultData, ...data.data }
                    setCurrentUser(mergedData)
                    setEditForm(mergedData)
                    localStorage.setItem('fasalCurrentUser', JSON.stringify(data.data))
                }
            } catch (err) {
                console.error("Failed to fetch latest profile:", err)
            }
        }
        
        const fetchPosts = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/community/posts`)
                const json = await res.json()
                if (json.success && loggedUser?._id) {
                    const allPosts = json.data;
                    setMyPosts(allPosts.filter(p => p.authorId === loggedUser._id))
                    
                    // Filter posts not made by this expert and map to farmerQueries format
                    const otherPosts = allPosts.filter(p => p.authorId !== loggedUser._id && (!p.authorRole || p.authorRole !== 'expert'))
                    const mappedQueries = otherPosts.map(p => ({
                        id: p._id,
                        farmer: p.author,
                        crop: p.tags?.[0] || 'General',
                        urgent: p.tags?.includes('Urgent') || false,
                        status: p.commentList?.length > 0 ? 'answered' : 'pending',
                        time: new Date(p.time).toLocaleDateString(),
                        query: p.content,
                        audio: p.audio,
                        image: p.image,
                        originalPost: p
                    }))
                    setFarmerQueries(mappedQueries)
                }
            } catch(e) { console.error('Failed to fetch posts', e) }
        }

        fetchLatestProfile()
        fetchAppointments()
        fetchPosts()

        // Set up polling for automatic live updates every 10 seconds
        const pollInterval = setInterval(() => {
            fetchLatestProfile()
            fetchAppointments()
            fetchPosts()
        }, 10000)

        return () => clearInterval(pollInterval)
    }, [navigate, API_BASE])

    // --- Array Handlers for Profile 3.0 ---
    const handleArrayChange = (field, index, key, value) => {
        const updatedList = [...editForm[field]]
        if (key) {
            updatedList[index][key] = value
        } else {
            updatedList[index] = value
        }
        setEditForm({ ...editForm, [field]: updatedList })
    }

    const addArrayItem = (field, template) => {
        setEditForm({ ...editForm, [field]: [...editForm[field], template] })
    }

    const removeArrayItem = (field, index) => {
        const updatedList = editForm[field].filter((_, i) => i !== index)
        setEditForm({ ...editForm, [field]: updatedList })
    }

    const handleAccept = async (id, farmerEmail) => {
        try {
            const res = await fetch(`${API_BASE}/api/appointments/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            })
            if (res.ok) {
                setAppointments(appointments.map(a => a._id === id ? { ...a, status: 'approved' } : a))
                addNotification({ email: farmerEmail }, 'Appointment Accepted', 'Your video consultation request was accepted by the expert.', 'success')
            }
        } catch (e) {
            console.error('Failed to accept:', e)
        }
    }

    const handleReject = async (id, farmerEmail) => {
        try {
            const res = await fetch(`${API_BASE}/api/appointments/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' })
            })
            if (res.ok) {
                setAppointments(appointments.map(a => a._id === id ? { ...a, status: 'rejected' } : a))
                addNotification({ email: farmerEmail }, 'Appointment Declined', 'Your video consultation request was declined by the expert.', 'error')
            }
        } catch (e) {
            console.error('Failed to reject:', e)
        }
    }

    const isPending = currentUser && !currentUser.approved && !currentUser.rejected;

    const handleProfileUpdate = async (e) => {
        if (e) e.preventDefault()
        const userId = currentUser?._id || currentUser?.id;
        if (!userId) {
            addNotification({ email: currentUser?.email }, 'Error', 'User ID not found. Please re-login.', 'error')
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/user/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })
            const data = await res.json()
            if (data.success) {
                setCurrentUser(data.data)
                localStorage.setItem('fasalCurrentUser', JSON.stringify(data.data))
                setIsEditingProfile(false)
                addNotification({ email: data.data.email }, 'Profile Updated', 'Your expert profile has been updated successfully.', 'success')
                // Clear password fields
                setEditForm({ ...editForm, oldPassword: '', newPassword: '' })
            } else {
                addNotification({ email: currentUser.email }, 'Update Failed', data.message || 'Error updating profile', 'error')
            }
        } catch (err) {
            console.error("Profile update failed:", err)
            addNotification({ email: currentUser.email }, 'Connection Error', 'Failed to reach server', 'error')
        }
    }

    const handleReply = async (query) => {
        if (!replyText.trim() && !replyImageUrl && !replyAudioUrl) return
        setUploadingReply(true)
        try {
            let finalImageUrl = ''
            let finalAudioUrl = ''
            if (replyImage) finalImageUrl = await uploadToCloudinary(replyImage)
            if (replyAudioBlob) {
                const audioFile = new File([replyAudioBlob], `reply_voice_${Date.now()}.webm`, { type: 'audio/webm' })
                finalAudioUrl = await uploadToCloudinary(audioFile)
            }

            const res = await fetch(`${API_BASE}/api/community/posts/${query.id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author: currentUser.name || 'Expert',
                    text: replyText || 'Voice/Image Reply',
                    image: finalImageUrl || null,
                    audio: finalAudioUrl || null
                })
            })
            if (res.ok) {
                addNotification({ email: currentUser.email }, 'Reply Sent', `Your response has been sent to ${query.farmer}.`, 'success')
                setFarmerQueries(farmerQueries.map(q => q.id === query.id ? { ...q, status: 'answered' } : q))
                setReplyingTo(null)
                setReplyText('')
                setReplyImage(null)
                setReplyImageUrl('')
                setReplyAudioBlob(null)
                setReplyAudioUrl('')
            } else {
                addNotification({ email: currentUser.email }, 'Reply Failed', 'Could not send the reply.', 'error')
            }
        } catch (e) {
            console.error('Failed to reply', e)
            addNotification({ email: currentUser.email }, 'Error', 'Failed to connect to server.', 'error')
        } finally {
            setUploadingReply(false)
        }
    }

    const startReplyRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            const chunks = []
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                setReplyAudioBlob(blob)
                setReplyAudioUrl(URL.createObjectURL(blob))
                stream.getTracks().forEach(track => track.stop())
            }
            recorder.start()
            setReplyMediaRecorder(recorder)
            setIsRecordingReply(true)
            setReplyAudioUrl('')
        } catch (err) {
            console.error(err)
            addNotification({ email: currentUser?.email }, 'Error', 'Microphone access denied.', 'error')
        }
    }

    const stopReplyRecording = () => {
        if (replyMediaRecorder && isRecordingReply) {
            replyMediaRecorder.stop()
            setIsRecordingReply(false)
        }
    }

    const handleReplyImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setReplyImage(file)
            setReplyImageUrl(URL.createObjectURL(file))
        }
    }

    // --- Expert Messaging / Connectivity ---
    const fetchChatContacts = async () => {
        if (!currentUser?._id) return
        try {
            const res = await fetch(`${API_BASE}/api/messages/contacts/${currentUser._id}`)
            const json = await res.json()
            if (json.success) {
                setChatContacts(json.data)
                // Backward compat - set adminId
                const admin = json.data.find(c => c.role === 'admin')
                if (admin) setAdminId(admin._id)
            }
        } catch (e) { console.warn('Failed to load contacts', e) }
    }

    const fetchChatHistory = async (contactId) => {
        if (!currentUser?._id || !contactId) return
        try {
            const res = await fetch(`${API_BASE}/api/messages/history/${currentUser._id}/${contactId}`)
            const json = await res.json()
            if (json.success) setChatMessages(json.data)
        } catch (e) { console.warn('Chat history failed', e) }
    }

    useEffect(() => {
        if (currentUser?._id) fetchChatContacts()
    }, [currentUser?._id])

    useEffect(() => {
        if (!selectedChat || activeTab !== 'connect') return
        fetchChatHistory(selectedChat._id)
        const interval = setInterval(() => {
            fetchChatHistory(selectedChat._id)
            fetchChatContacts() // refresh unread badges
        }, 4000)
        return () => clearInterval(interval)
    }, [selectedChat?._id, activeTab])

    useEffect(() => {
        if (activeTab === 'community') {
            const fetchPosts = async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/community/posts`)
                    const json = await res.json()
                    if (json.success && currentUser?._id) {
                        setMyPosts(json.data.filter(p => p.authorId === currentUser._id))
                    }
                } catch(e) { console.error('Failed to fetch posts', e) }
            }
            fetchPosts()
        }
    }, [activeTab, currentUser?._id])

    // Lightbox Logic for Expert Dashboard
    const allImages = myPosts
        .filter(p => p.image)
        .map(p => ({ src: p.image, author: p.author || 'Me', content: p.content }))

    const openLightbox = (imageSrc) => {
        const idx = allImages.findIndex(img => img.src === imageSrc)
        setLightboxIndex(idx >= 0 ? idx : 0)
    }

    const closeLightbox = () => setLightboxIndex(null)
    const lightboxPrev = () => setLightboxIndex(i => (i - 1 + allImages.length) % allImages.length)
    const lightboxNext = () => setLightboxIndex(i => (i + 1) % allImages.length)

    useEffect(() => {
        if (lightboxIndex !== null) {
            document.body.style.overflow = 'hidden'
            const onKey = (e) => {
                if (e.key === 'Escape') closeLightbox()
                if (e.key === 'ArrowLeft') lightboxPrev()
                if (e.key === 'ArrowRight') lightboxNext()
            }
            window.addEventListener('keydown', onKey)
            return () => {
                window.removeEventListener('keydown', onKey)
                document.body.style.overflow = 'auto'
            }
        } else {
            document.body.style.overflow = 'auto'
        }
    }, [lightboxIndex, allImages.length])

    const handleSendMessage = async () => {
        const target = selectedChat || { _id: adminId }
        const text = chatInput || adminMsg
        if (!text.trim() || !target?._id || !currentUser?._id) return
        setIsSendingMsg(true)
        try {
            const res = await fetch(`${API_BASE}/api/messages/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: currentUser._id,
                    recipientId: target._id,
                    content: text
                })
            })
            if (res.ok) {
                setChatInput('')
                setAdminMsg('')
                await fetchChatHistory(target._id)
                await fetchChatContacts()
            }
        } catch (e) {
            addNotification({ email: currentUser.email }, 'Chat Error', 'Message could not be sent.', 'error')
        } finally {
            setIsSendingMsg(false)
        }
    }

    const handleDeleteMessage = async (msgId) => {
        try {
            const res = await fetch(`${API_BASE}/api/messages/${msgId}`, { method: 'DELETE' })
            if (res.ok && adminId) {
                const resH = await fetch(`${API_BASE}/api/messages/history/${currentUser._id}/${adminId}`)
                const jsonH = await resH.json()
                if (jsonH.success) setMessages(jsonH.data)
            }
        } catch (e) {
            console.error("Failed to delete message", e)
        }
    }


    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setEditForm({ ...editForm, profilePic: reader.result })
            }
            reader.readAsDataURL(file)
        }
    }

    // --- Voice Recording Logic ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            const chunks = []

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                setAudioBlob(blob)
                setAudioUrl(URL.createObjectURL(blob))
            }

            mediaRecorder.start()
            setRecorder(mediaRecorder)
            setIsRecording(true)
            addNotification({ email: currentUser.email }, 'Recording Started', 'Recording your professional advice...', 'info')
        } catch (err) {
            addNotification({ email: currentUser.email }, 'Microphone Error', 'Please allow microphone access to record.', 'error')
        }
    }

    const stopRecording = () => {
        if (recorder) {
            recorder.stop()
            setIsRecording(false)
            addNotification({ email: currentUser.email }, 'Recording Saved', 'Preview your voice note before sharing.', 'success')
        }
    }

    const handlePostFileSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            setPostFile(file)
            setPostFilePreview(URL.createObjectURL(file))
        }
    }

    if (isPending) {
        return (
            <div className="approval-overlay-full">
                <div className="approval-premium-card animate-scaleUp">
                    <div className="approval-glow-effect"></div>
                    <div className="approval-content">
                        <div className="approval-icon-wrapper">
                            <div className="approval-main-icon">🛡️</div>
                            <div className="approval-pulse"></div>
                        </div>
                        <h2 className="approval-title">Verification in Progress</h2>
                        <p className="approval-subtitle">
                            Welcome to the elite panel of <strong>Smart-Fasal</strong> experts. Our administrators are currently reviewing your credentials and ICAR licensure.
                        </p>
                        
                        <div className="approval-process-steps">
                            <div className="ap-step completed">
                                <span className="ap-step-num">✓</span>
                                <span className="ap-step-label">Application Received</span>
                            </div>
                            <div className="ap-step active">
                                <span className="ap-step-num">2</span>
                                <span className="ap-step-label">Document Verification</span>
                            </div>
                            <div className="ap-step">
                                <span className="ap-step-num">3</span>
                                <span className="ap-step-label">Account Activation</span>
                            </div>
                        </div>

                        <div className="approval-info-box">
                            <span className="info-icon">ℹ️</span>
                            <p>This process usually takes <strong>24-48 hours</strong>. You will be notified via email once access is granted.</p>
                        </div>

                        <button className="approval-logout-btn-premium" onClick={() => {
                            localStorage.removeItem('fasalCurrentUser');
                            navigate('/login');
                        }}>
                            🚪 Logout from Portal
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`expert-dash ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
            {/* Sidebar */}
            <aside className={`expert-sidebar ${sidebarOpen ? 'mobile-show' : ''}`}>
                <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>×</button>
                <div className="expert-sidebar-header">
                    <div className="expert-avatar-small">
                        {currentUser?.profilePic ? (
                            <img src={currentUser.profilePic} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : '👨‍⚕️'}
                    </div>
                    <div className="expert-info">
                        <h3>{currentUser?.name || currentUser?.fullName || 'Expert'}</h3>
                        <p>{currentUser?.specialization || 'Agriculture Expert'}</p>
                    </div>
                </div>

                <nav className="expert-sidebar-menu">
                    <button
                        className={`expert-sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                        onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
                    >
                        <span>📊</span> Overview
                    </button>
                    <button
                        className={`expert-sidebar-link ${activeTab === 'queries' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('queries');
                                setSidebarOpen(false);
                            }}
                    >
                        <span>❓</span> Farmer Queries
                    </button>
                    <button
                        className={`expert-sidebar-link ${activeTab === 'community' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('community'); setSidebarOpen(false); }}
                    >
                        <span>🌾</span> Community Moderation
                    </button>
                    <button
                        className={`expert-sidebar-link ${activeTab === 'schedule' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('schedule'); setSidebarOpen(false); }}
                    >
                        <span>📅</span> My Schedule
                    </button>
                    <button
                        className={`expert-sidebar-link ${activeTab === 'feedback' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('feedback'); setSidebarOpen(false); }}
                    >
                        <span>💬</span> Farmer Feedback
                    </button>
                    <button
                        className={`expert-sidebar-link ${activeTab === 'connect' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('connect'); setSidebarOpen(false); }}
                    >
                        <span>🤝</span> Connect
                    </button>
                </nav>

                <div className="expert-sidebar-footer">
                    <button
                        className={`expert-sidebar-link ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('profile'); setIsEditingProfile(false); setSidebarOpen(false); }}
                        style={{ marginBottom: '1rem', background: activeTab === 'profile' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                    >
                        <span>👤</span> My Profile
                    </button>
                    <button className="expert-logout-btn" onClick={() => {
                        localStorage.removeItem('fasalCurrentUser');
                        navigate('/login');
                    }}>
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="expert-main">
                <header className="expert-main-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(true)}>☰</button>
                        <h2>
                            {activeTab === 'overview' && '📊 Dashboard Overview'}
                            {activeTab === 'queries' && '❓ Farmer Queries'}
                            {activeTab === 'community' && '🌾 Community Moderation'}
                            {activeTab === 'schedule' && '📅 My Schedule'}
                            {activeTab === 'feedback' && '💬 Farmer Feedback'}
                            {activeTab === 'connect' && '🤝 Expert & Admin Connection'}
                            {activeTab === 'profile' && '👤 My Profile'}
                        </h2>
                    </div>
                    <div className="expert-header-actions">
                        <div className="expert-status-toggle">
                            <span className="status-dot" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Online</span>
                        </div>
                        {activeTab !== 'profile' && activeTab !== 'overview' && (
                            <Link to="/video-consultation" className="join-call-btn">
                                📹 Video Call
                            </Link>
                        )}
                    </div>
                </header>

                <div className="expert-content">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="overview-panel animate-fadeIn">
                            <div className="welcome-banner-expert">
                                <div className="welcome-content">
                                    <h1>Welcome back, {currentUser?.name?.split(' ')[0] || 'Expert'}! 🌟</h1>
                                    <p>Your expertise is making a difference for <strong>{dashboardStats.queriesResolved}</strong> farmers this month.</p>
                                </div>
                                <div className="welcome-actions">
                                    <button className="premium-btn-outline" onClick={() => setActiveTab('queries')}>View New Queries</button>
                                </div>
                            </div>

                            <div className="stats-grid-premium">
                                <div className="premium-stat-card color-purple" onClick={() => setActiveTab('overview')} style={{ cursor: 'pointer' }}>
                                    <div className="psc-header">
                                        <span className="psc-icon">📈</span>
                                        <span className="psc-badge positive">+12.5%</span>
                                    </div>
                                    <div className="psc-main">
                                        <h3 className="psc-val">{dashboardStats.incomeGrowth}</h3>
                                        <p className="psc-label">Income Growth</p>
                                    </div>
                                    <div className="psc-chart">
                                        <div className="sparkline">
                                            {[30, 45, 35, 60, 50, 80, 70, 90].map((h, i) => (
                                                <div key={i} className="spark-bar" style={{ height: `${h}%` }}></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="premium-stat-card color-blue" onClick={() => setActiveTab('schedule')} style={{ cursor: 'pointer' }}>
                                    <div className="psc-icon">📅</div>
                                    <div className="psc-main">
                                        <h3 className="psc-val">{dashboardStats.pendingMeetings}</h3>
                                        <p className="psc-label">Pending Meetings</p>
                                    </div>
                                    <div className="psc-footer">Next: 3:30 PM Today</div>
                                </div>

                                <div className="premium-stat-card color-green" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}>
                                    <div className="psc-icon">🛡️</div>
                                    <div className="psc-main">
                                        <h3 className="psc-val">{dashboardStats.daysActive}</h3>
                                        <p className="psc-label">Days Active</p>
                                    </div>
                                    <div className="psc-footer">Top 5% Performance</div>
                                </div>

                                <div className="premium-stat-card color-orange" onClick={() => setActiveTab('feedback')} style={{ cursor: 'pointer' }}>
                                    <div className="psc-icon">💬</div>
                                    <div className="psc-main">
                                        <h3 className="psc-val">{dashboardStats.feedbackCount}</h3>
                                        <p className="psc-label">Feedback Msg</p>
                                    </div>
                                    <div className="psc-footer">avg rating ⭐ {dashboardStats.averageRating}</div>
                                </div>

                                <div className="premium-stat-card color-cyan" onClick={() => setActiveTab('schedule')} style={{ cursor: 'pointer' }}>
                                    <div className="psc-icon">📹</div>
                                    <div className="psc-main">
                                        <h3 className="psc-val">{dashboardStats.callsToday}</h3>
                                        <p className="psc-label">Calls Today</p>
                                    </div>
                                    <div className="psc-footer">Farmer Video Calls</div>
                                </div>

                                <div className="premium-stat-card color-teal" onClick={() => setActiveTab('community')} style={{ cursor: 'pointer' }}>
                                    <div className="psc-icon">🌾</div>
                                    <div className="psc-main">
                                        <h3 className="psc-val">{dashboardStats.communityPosts}</h3>
                                        <p className="psc-label">Community Post</p>
                                    </div>
                                    <div className="psc-footer">Krishi Charcha Activity</div>
                                </div>
                            </div>

                            <div className="quick-access-sections">
                                <div className="qa-card" onClick={() => setActiveTab('queries')}>
                                    <div className="qa-icon">📥</div>
                                    <div className="qa-info">
                                        <h4>Farmer Queries</h4>
                                        <p>Manage pending doubts</p>
                                    </div>
                                    <span className="qa-arrow">→</span>
                                </div>
                                <div className="qa-card" onClick={() => setActiveTab('community')}>
                                    <div className="qa-icon">🌾</div>
                                    <div className="qa-info">
                                        <h4>Moderation</h4>
                                        <p>Clean community content</p>
                                    </div>
                                    <span className="qa-arrow">→</span>
                                </div>
                                <div className="qa-card" onClick={() => setActiveTab('schedule')}>
                                    <div className="qa-icon">📅</div>
                                    <div className="qa-info">
                                        <h4>Planner</h4>
                                        <p>Check your schedule</p>
                                    </div>
                                    <span className="qa-arrow">→</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Schedule Tab */}
                    {activeTab === 'schedule' && (
                        <div className="schedule-panel animate-fadeIn">
                            <div className="section-header-premium">
                                <h3>📅 My Consultation Schedule</h3>
                                <p>Manage your upcoming video consultation sessions with farmers</p>
                            </div>
                            <div className="appointments-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {appointments && appointments.length > 0 ? appointments.map(appt => (
                                    <div key={appt._id} className={`appointment-card-premium ${appt.status}`} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                        <div className="appt-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <span className="farmer-name" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>👨‍🌾 {appt.farmerName || appt.farmerEmail}</span>
                                            <span className={`status-badge ${appt.status}`} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: appt.status === 'pending' ? '#fef3c7' : appt.status === 'approved' ? '#dcfce7' : '#fee2e2', color: appt.status === 'pending' ? '#d97706' : appt.status === 'approved' ? '#166534' : '#991b1b' }}>
                                                {appt.status === 'pending' ? '⏳ PENDING' : appt.status === 'approved' ? '✅ APPROVED' : '❌ DECLINED'}
                                            </span>
                                        </div>
                                        <div className="appt-body" style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', gap: '2rem' }}>
                                            <p><strong>📅 Date:</strong> {appt.date}</p>
                                            <p><strong>⏰ Slot:</strong> {appt.slot}</p>
                                            <p><strong>🔬 Issue:</strong> {appt.disease}</p>
                                        </div>
                                        {appt.status === 'pending' && (
                                            <div className="appt-actions" style={{ display: 'flex', gap: '1rem' }}>
                                                <button className="accept-btn" onClick={() => handleAccept(appt._id, appt.farmerEmail)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Accept</button>
                                                <button className="reject-btn" onClick={() => handleReject(appt._id, appt.farmerEmail)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Decline</button>
                                            </div>
                                        )}
                                        {appt.status === 'approved' && (
                                            <div className="appt-actions">
                                                <Link to="/video-consultation" state={{ callFarmerId: appt.farmerId, farmerName: appt.farmerName }} className="join-call-btn" style={{ display: 'inline-block', background: '#3b82f6', color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold' }}>📹 Go to Video Call</Link>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '4rem', background: '#f8fafc', borderRadius: '12px' }}>
                                        <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                                        <h3 style={{ color: '#1e293b' }}>No Appointments Yet</h3>
                                        <p style={{ color: '#64748b' }}>You have no scheduled consultations at the moment.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Queries Tab */}
                    {activeTab === 'queries' && (
                        <div className="queries-list">
                            {farmerQueries.length > 0 ? farmerQueries.map(q => (
                                <div key={q.id} className={`query-card ${q.urgent ? 'urgent' : ''}`}>
                                    <div className="query-header">
                                        <div className="query-farmer">
                                            <span className="query-avatar">👨‍🌾</span>
                                            <div>
                                                <p className="query-farmer-name">{q.farmer}</p>
                                                <p className="query-crop">🌾 Crop: {q.crop}</p>
                                            </div>
                                        </div>
                                        <div className="query-right">
                                            {q.urgent && <span className="urgent-badge">🔴 Urgent</span>}
                                            <span className={`query-status-badge ${q.status}`}>{q.status}</span>
                                            <span className="query-time">{q.time}</span>
                                        </div>
                                    </div>
                                    <p className="query-text">"{q.query}"</p>
                                    {q.audio && <div style={{marginTop: '10px'}}><audio controls src={q.audio} style={{height: '35px'}} /></div>}
                                    {q.image && <div style={{marginTop: '10px'}}><img src={q.image} alt="Query image" style={{maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover'}} /></div>}
                                    <div className="query-actions">
                                        {q.status === 'pending' ? (
                                            <button className="reply-btn" onClick={() => setReplyingTo(q)}>✉️ Reply</button>
                                        ) : (
                                            <span style={{ color: '#2e7d32', fontWeight: 700, fontSize: '0.9rem' }}>✅ Answered</span>
                                        )}
                                    </div>
                                    
                                    {replyingTo?.id === q.id && (
                                        <div className="query-reply-box animate-fadeIn" style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <textarea 
                                                className="reply-textarea" 
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder={`Reply to ${q.farmer}'s query... (You can also send a voice note)`}
                                                style={{ width: '100%', borderRadius: '6px', padding: '10px', border: '1px solid #cbd5e1', minHeight: '80px' }}
                                            />
                                            
                                            {(replyImageUrl || replyAudioUrl || isRecordingReply) && (
                                                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {replyImageUrl && <div style={{position: 'relative'}}><img src={replyImageUrl} alt="preview" style={{width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover'}} /><button onClick={() => {setReplyImage(null); setReplyImageUrl('');}} style={{position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', fontSize: '10px'}}>X</button></div>}
                                                    {isRecordingReply && <div style={{color: 'red', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}><span className="live-dot"></span>Recording...</div>}
                                                    {replyAudioUrl && <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}><audio controls src={replyAudioUrl} style={{height: '30px'}} /><button onClick={() => setReplyAudioUrl('')} style={{background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', fontSize: '14px'}}>✖</button></div>}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', alignItems: 'center' }}>
                                                <button className="reply-send-btn" onClick={() => handleReply(q)} disabled={uploadingReply} style={{ background: '#22c55e', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: uploadingReply ? 'not-allowed' : 'pointer' }}>{uploadingReply ? 'Sending...' : 'Send Advice'}</button>
                                                
                                                <input type="file" id={`reply-img-${q.id}`} hidden accept="image/*" onChange={handleReplyImageChange} />
                                                <button onClick={() => document.getElementById(`reply-img-${q.id}`).click()} style={{ background: '#f1f5f9', color: '#334155', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Attach Photo">📷</button>
                                                
                                                {isRecordingReply ? (
                                                    <button onClick={stopReplyRecording} style={{ background: '#fee2e2', color: '#dc2626', padding: '8px', borderRadius: '6px', border: '1px solid #fecaca', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Stop Recording">⏹️</button>
                                                ) : (
                                                    <button onClick={startReplyRecording} style={{ background: '#f1f5f9', color: '#334155', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Record Voice">🎙️</button>
                                                )}

                                                <button className="reply-cancel-btn" onClick={() => {setReplyingTo(null); setReplyImageUrl(''); setReplyAudioUrl(''); setIsRecordingReply(false);}} style={{ background: 'transparent', color: '#64748b', padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="empty-state" style={{ textAlign: 'center', padding: '4rem', background: '#f8fafc', borderRadius: '12px' }}>
                                    <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
                                    <h3 style={{ color: '#1e293b' }}>No Farmer Queries</h3>
                                    <p style={{ color: '#64748b' }}>There are no community questions from farmers right now.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Community Tab */}
                    {activeTab === 'community' && (
                        <div className="moderation-panel animate-fadeIn">
                            {/* NEW: Quick Post Section for Experts */}
                            <div className="expert-quick-post-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '1.5rem' }}>✍️</div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Share Professional Advice</h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Post a helpful tip or update for the farming community</p>
                                    </div>
                                </div>
                                <textarea 
                                    className="quick-post-textarea"
                                    value={replyText} // Reuse replyText state for simplicity or add a new one
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write something expert... (e.g., Best time to sow wheat in North India)"
                                    style={{ width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem', minHeight: '100px', background: '#f8fafc', fontSize: '0.95rem', marginBottom: '1rem' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="post-options" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: postFile ? '#059669' : '#64748b', fontSize: '0.9rem' }}>
                                            🖼️ {postFile ? 'Photo Attached' : 'Photo'}
                                            <input type="file" accept="image/*" hidden onChange={handlePostFileSelect} />
                                        </label>

                                        <div className="crop-selector-inline" style={{ position: 'relative' }}>
                                            <select 
                                                value={selectedCrop} 
                                                onChange={(e) => setSelectedCrop(e.target.value)}
                                                style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}
                                            >
                                                <option value="">🏷️ Tag Crop</option>
                                                {['Wheat', 'Rice', 'Tomato', 'Cotton', 'Soybean', 'Maize', 'Sugarcane'].map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="voice-recorder-inline">
                                            {!isRecording ? (
                                                <button 
                                                    onClick={startRecording}
                                                    style={{ background: 'none', border: 'none', color: audioBlob ? '#059669' : '#64748b', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                >
                                                    🎙️ {audioBlob ? 'Voice Ready' : 'Voice Note'}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={stopRecording}
                                                    style={{ background: '#ef4444', color: 'white', border: 'none', fontSize: '0.8rem', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                                                >
                                                    ⏹️ Stop
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Previews Area */}
                                    <div className="media-previews-inline" style={{ display: 'flex', gap: '0.5rem' }}>
                                        {postFilePreview && (
                                            <div style={{ position: 'relative' }}>
                                                <img src={postFilePreview} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                                                <button onClick={() => {setPostFile(null); setPostFilePreview(null)}} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '15px', height: '15px', fontSize: '10px', cursor: 'pointer' }}>×</button>
                                            </div>
                                        )}
                                        {audioUrl && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                                                <span style={{ fontSize: '0.9rem' }}>🎵</span>
                                                <button onClick={() => {setAudioBlob(null); setAudioUrl(null)}} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        className="post-submit-btn"
                                        disabled={isUploadingMedia}
                                        onClick={async () => {
                                            if (!replyText.trim() && !audioBlob && !postFile) return;
                                            
                                            setIsUploadingMedia(true);
                                            try {
                                                let finalImageUrl = '';
                                                let finalAudioUrl = '';

                                                if (postFile) {
                                                    finalImageUrl = await uploadToCloudinary(postFile);
                                                }
                                                if (audioBlob) {
                                                    const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
                                                    finalAudioUrl = await uploadToCloudinary(audioFile);
                                                }

                                                const res = await fetch(`${API_BASE}/api/community/posts`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        content: replyText || 'Expert Voice Note Advice 🎙️',
                                                        author: currentUser.name,
                                                        authorId: currentUser._id,
                                                        authorRole: 'expert',
                                                        avatar: currentUser.profilePic,
                                                        image: finalImageUrl,
                                                        audio: finalAudioUrl,
                                                        tags: selectedCrop ? [selectedCrop] : []
                                                    })
                                                });
                                                if (res.ok) {
                                                    addNotification({ email: currentUser.email }, 'Advice Published', 'Your professional advice is now live.', 'success');
                                                    setReplyText('');
                                                    setPostFile(null);
                                                    setPostFilePreview(null);
                                                    setAudioBlob(null);
                                                    setAudioUrl(null);
                                                    setSelectedCrop('');
                                                    // Refresh posts
                                                    const resP = await fetch(`${API_BASE}/api/community/posts`);
                                                    const jsonP = await resP.json();
                                                    if (jsonP.success) setMyPosts(jsonP.data.filter(p => p.authorId === currentUser._id));
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                addNotification({ email: currentUser.email }, 'Post Failed', 'Could not upload media. Please try again.', 'error');
                                            } finally {
                                                setIsUploadingMedia(false);
                                            }
                                        }}
                                        style={{ background: isUploadingMedia ? '#94a3b8' : '#059669', color: 'white', padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: 600, cursor: isUploadingMedia ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }}
                                    >
                                        {isUploadingMedia ? 'Uploading...' : 'Share Now 🚀'}
                                    </button>
                                </div>
                            </div>

                            <div className="section-header-premium" style={{marginTop: '2rem'}}>
                                <h3>📝 My Recent Posts</h3>
                                <p>Manage the advice you've shared with the community</p>
                            </div>
                            <div className="my-posts-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                                {myPosts.length > 0 ? myPosts.map(post => (
                                    <div key={post._id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem', position: 'relative' }}>
                                        <button 
                                            onClick={async () => {
                                                if(confirm('Delete this post?')) {
                                                    const res = await fetch(`${API_BASE}/api/community/posts/${post._id}`, { method: 'DELETE' })
                                                    if(res.ok) setMyPosts(myPosts.filter(p => p._id !== post._id))
                                                }
                                            }}
                                            style={{ position: 'absolute', top: '10px', right: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                            🗑️ Delete
                                        </button>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                                            {new Date(post.createdAt).toLocaleDateString()}
                                        </div>
                                        <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>{post.content}</p>
                                        {post.image && (
                                            <div onClick={() => openLightbox(post.image)} style={{ cursor: 'zoom-in', position: 'relative' }}>
                                                <img src={post.image} alt="post" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, borderRadius: '8px' }} className="hover-zoom">🔍 View Full</div>
                                            </div>
                                        )}
                                        {post.tags?.length > 0 && (
                                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                                {post.tags.map(t => <span key={t} style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px' }}>#{t}</span>)}
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="empty-state">
                                        <p style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>You haven't posted any advice yet.</p>
                                    </div>
                                )}
                            </div>

                            <div className="section-header-premium" style={{marginTop: '3rem'}}>
                                <h3>🛡️ Moderation Queue</h3>
                                <p>Review community reported content and ensure quality</p>
                            </div>
                            <div className="empty-state">
                                <p style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No reported content pending moderation.</p>
                            </div>
                        </div>
                    )}

                    {/* Feedback Tab */}
                    {activeTab === 'feedback' && (
                        <div className="feedback-panel animate-fadeIn">
                            <div className="section-header-premium">
                                <h3>⭐ Farmer Appreciation & Feedback</h3>
                                <p>Direct reviews from farmers you have assisted</p>
                            </div>
                            <div className="feedback-grid">
                                {(currentUser?.feedback && currentUser.feedback.length > 0) ? currentUser.feedback.map((f, i) => (
                                    <div key={i} className="feedback-card-premium">
                                        <div className="fcp-header">
                                            <span className="farmer-initial">{f.farmerName?.[0]}</span>
                                            <div>
                                                <h4>{f.farmerName}</h4>
                                                <div className="rating-stars">{'⭐'.repeat(f.rating)}</div>
                                            </div>
                                            <span className="fcp-date">{new Date(f.date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="fcp-comment">"{f.comment}"</p>
                                    </div>
                                )) : (
                                    <div className="empty-feedback-state">
                                        <div className="empty-icon">🎖️</div>
                                        <h3>No Feedback Yet</h3>
                                        <p>Keep resolving queries and helping farmers to see your growth here!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Connect Tab — WhatsApp-style Messaging */}
                    {activeTab === 'connect' && (
                        <div className="connect-panel animate-fadeIn">
                            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '680px', background: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
                                
                                {/* Left: Contacts Sidebar */}
                                <div style={{ borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                                    <div style={{ padding: '1rem 1.2rem', background: '#1e293b', color: 'white' }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>💬 Messages</h3>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>Admin & Expert Network</p>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        {chatContacts.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                                                <p style={{ fontSize: '0.85rem' }}>Loading contacts...</p>
                                            </div>
                                        ) : chatContacts.map(contact => (
                                            <div
                                                key={contact._id}
                                                onClick={() => { setSelectedChat(contact); setChatMessages([]); fetchChatHistory(contact._id); }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    padding: '0.85rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                                    background: selectedChat?._id === contact._id ? '#e0f2fe' : 'transparent',
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: contact.role === 'admin' ? '#1e293b' : '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', overflow: 'hidden' }}>
                                                        {contact.profilePic
                                                            ? <img src={contact.profilePic} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : contact.name?.[0]?.toUpperCase()
                                                        }
                                                    </div>
                                                    {contact.unreadCount > 0 && (
                                                        <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '0.6rem', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                                            {contact.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{contact.name}</span>
                                                        {contact.lastTime && <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(contact.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '10px', background: contact.role === 'admin' ? '#fee2e2' : '#dcfce7', color: contact.role === 'admin' ? '#ef4444' : '#059669', fontWeight: 600 }}>
                                                            {contact.role === 'admin' ? '🛡️ Admin' : '👨‍⚕️ Expert'}
                                                        </span>
                                                        {contact.lastMessage && <span style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.lastMessage}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: Chat Area */}
                                {selectedChat ? (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {/* Chat header */}
                                        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white' }}>
                                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: selectedChat.role === 'admin' ? '#1e293b' : '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden' }}>
                                                {selectedChat.profilePic
                                                    ? <img src={selectedChat.profilePic} alt={selectedChat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : selectedChat.name?.[0]?.toUpperCase()
                                                }
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{selectedChat.name}</p>
                                                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                                                    {selectedChat.role === 'admin' ? '🛡️ System Administrator' : `👨‍⚕️ Expert · ${selectedChat.specialization || 'Agriculture'}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Messages */}
                                        <div style={{ flex: 1, padding: '1.2rem', overflowY: 'auto', background: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {chatMessages.length === 0 ? (
                                                <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '5rem' }}>
                                                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💬</div>
                                                    <p>Start conversation with {selectedChat.name}</p>
                                                </div>
                                            ) : chatMessages.map((m, idx) => {
                                                const isMe = m.sender === currentUser?._id || m.sender?.toString() === currentUser?._id
                                                // Auto-mark as read if unread and from other party
                                                if (!isMe && !m.isRead) {
                                                    fetch(`${API_BASE}/api/messages/${m._id}/read`, { method: 'PUT' })
                                                        .catch(console.error)
                                                }
                                                return (
                                                    <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', background: isMe ? '#0D47A1' : 'white', color: isMe ? 'white' : '#1e293b', padding: '0.65rem 1rem', borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', fontSize: '0.9rem', border: isMe ? 'none' : '1px solid #e2e8f0' }}>
                                                        {m.content}
                                                        <div style={{ fontSize: '0.62rem', marginTop: '4px', opacity: 0.7, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                                                            <span>{new Date(m.timestamp || m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            {isMe && (
                                                                <button onClick={async () => {
                                                                    await fetch(`${API_BASE}/api/messages/${m._id}`, { method: 'DELETE' })
                                                                    fetchChatHistory(selectedChat._id)
                                                                }} style={{ background: 'none', border: 'none', color: '#ffcccc', cursor: 'pointer', padding: 0 }} title="Delete">🗑️</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Input */}
                                        <div style={{ padding: '0.85rem 1rem', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                                            <textarea
                                                value={chatInput}
                                                onChange={e => setChatInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                                placeholder={`Message ${selectedChat.name}...`}
                                                style={{ flex: 1, borderRadius: '10px', border: '1px solid #e2e8f0', padding: '10px 14px', minHeight: '44px', maxHeight: '100px', resize: 'none', fontSize: '0.9rem', outline: 'none' }}
                                            />
                                            <button
                                                disabled={isSendingMsg || !chatInput.trim()}
                                                onClick={handleSendMessage}
                                                style={{ background: '#0D47A1', color: 'white', border: 'none', borderRadius: '10px', padding: '0 1.2rem', height: '44px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', opacity: (!chatInput.trim() || isSendingMsg) ? 0.5 : 1 }}
                                            >
                                                {isSendingMsg ? '...' : '➤'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '1rem' }}>
                                        <div style={{ fontSize: '4rem' }}>💬</div>
                                        <h3 style={{ color: '#64748b', margin: 0 }}>Select a contact to start chatting</h3>
                                        <p style={{ fontSize: '0.85rem', margin: 0 }}>Message Admin or any expert from the list</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}




                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="profile-panel-2-0 animate-fadeInUp">
                            <div className="profile-header-premium">
                                <div className="php-left">
                                    <h3>Professional Identity</h3>
                                    <p>Manage your expert credentials and public presence</p>
                                </div>
                                {!isEditingProfile ? (
                                    <button className="edit-mode-btn-premium" onClick={() => setIsEditingProfile(true)}>
                                        <span>✎</span> Edit Profile
                                    </button>
                                ) : (
                                    <div className="edit-actions-premium">
                                        <button className="cancel-btn-premium" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                                        <button className="save-btn-premium" onClick={handleProfileUpdate}>Save Changes</button>
                                    </div>
                                )}
                            </div>

                            {isEditingProfile ? (
                                <form className="profile-edit-form-2-0" onSubmit={handleProfileUpdate}>
                                    <div className="pef-grid">
                                        {/* Photo Section */}
                                        <div className="pef-photo-section">
                                            <div className="pef-photo-preview">
                                                {editForm.profilePic ? (
                                                    <img src={editForm.profilePic} alt="Preview" />
                                                ) : (
                                                    <div className="pef-photo-placeholder">📸</div>
                                                )}
                                                <label className="pef-photo-upload-label">
                                                    Change Photo
                                                    <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                                                </label>
                                            </div>
                                            <p className="pef-photo-hint">Best size: 400x400px. formats: JPG, PNG</p>
                                        </div>

                                        {/* Core Identity (Locked) */}
                                        <div className="pef-section-title">Verified Credentials 🔒</div>
                                        <div className="pef-fields-row">
                                            <div className="pef-group disabled">
                                                <label>Specialization (Locked)</label>
                                                <input type="text" value={editForm.specialization || ''} readOnly title="Core specialization cannot be changed once verified." />
                                            </div>
                                            <div className="pef-group disabled">
                                                <label>ICAR License ID (Locked)</label>
                                                <input type="text" value={editForm.licenseId || ''} readOnly title="License ID is permanent for verification." />
                                            </div>
                                        </div>

                                        {/* Security Verification */}
                                        <div className="pef-section-title">Account Security 🛡️</div>
                                        <div className="pef-fields-row">
                                            <div className="pef-group">
                                                <label>Current Password (to verify)</label>
                                                <input type="password" value={editForm.oldPassword || ''} onChange={(e) => setEditForm({...editForm, oldPassword: e.target.value})} placeholder="••••••••" />
                                            </div>
                                            <div className="pef-group">
                                                <label>New Password (leave blank to keep)</label>
                                                <input type="password" value={editForm.newPassword || ''} onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})} placeholder="Set new password" />
                                            </div>
                                        </div>

                                        {/* Personal Info */}
                                        <div className="pef-section-title">Personal Information</div>
                                        <div className="pef-fields-row">
                                            <div className="pef-group">
                                                <label>Full Name</label>
                                                <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} placeholder="e.g. Dr. Ajay Mehta" />
                                            </div>
                                            <div className="pef-group">
                                                <label>Years of Experience</label>
                                                <input type="text" value={editForm.experience || ''} onChange={(e) => setEditForm({...editForm, experience: e.target.value})} placeholder="e.g. 15 Years" />
                                            </div>
                                        </div>
                                        <div className="pef-fields-row">
                                            <div className="pef-group">
                                                <label>Consultation Charge (₹)</label>
                                                <input type="number" value={editForm.consultFee || ''} onChange={(e) => setEditForm({...editForm, consultFee: e.target.value})} placeholder="e.g. 500" />
                                            </div>
                                            <div className="pef-group">
                                                <label>General Availability</label>
                                                <input type="text" value={editForm.availability || ''} onChange={(e) => setEditForm({...editForm, availability: e.target.value})} placeholder="e.g. Mon - Fri, 10 AM to 6 PM" />
                                            </div>
                                        </div>

                                        {/* Education History (Dynamic Array) */}
                                        <div className="pef-section-title">Education & Degrees</div>
                                        {editForm.qualifications?.map((q, idx) => (
                                            <div key={idx} className="pef-array-item pef-fields-row">
                                                <div className="pef-group">
                                                    <label>Degree / Qualification</label>
                                                    <input type="text" value={q.degree} onChange={(e) => handleArrayChange('qualifications', idx, 'degree', e.target.value)} placeholder="e.g. Ph.D. Agronomy" />
                                                </div>
                                                <div className="pef-group">
                                                    <label>University & Year</label>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <input type="text" value={q.university} onChange={(e) => handleArrayChange('qualifications', idx, 'university', e.target.value)} placeholder="University Name" style={{ flex: 2 }} />
                                                        <input type="text" value={q.year} onChange={(e) => handleArrayChange('qualifications', idx, 'year', e.target.value)} placeholder="Year" style={{ flex: 1 }} />
                                                        {idx > 0 && <button type="button" className="pef-remove-btn" onClick={() => removeArrayItem('qualifications', idx)}>✕</button>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" className="pef-add-btn" onClick={() => addArrayItem('qualifications', { degree: '', university: '', year: '' })}>+ Add Another Degree</button>

                                        {/* Achievements & Skills */}
                                        <div className="pef-section-title">Skills & Achievements</div>
                                        <div className="pef-fields-row">
                                            <div className="pef-group">
                                                <label>Key Skills (Tags)</label>
                                                {editForm.skillTags?.map((skill, idx) => (
                                                    <div key={idx} className="pef-skill-input-row">
                                                        <input type="text" value={skill} onChange={(e) => handleArrayChange('skillTags', idx, null, e.target.value)} placeholder="Skill name..." />
                                                        {idx > 0 && <button type="button" onClick={() => removeArrayItem('skillTags', idx)}>✕</button>}
                                                    </div>
                                                ))}
                                                <button type="button" className="pef-mini-add-btn" onClick={() => addArrayItem('skillTags', '')}>+ Add Skill</button>
                                            </div>
                                            <div className="pef-group">
                                                <label>Major Achievements</label>
                                                {editForm.achievements?.map((award, idx) => (
                                                    <div key={idx} className="pef-skill-input-row">
                                                        <input type="text" value={award} onChange={(e) => handleArrayChange('achievements', idx, null, e.target.value)} placeholder="e.g. Best Scientist 2023" />
                                                        {idx > 0 && <button type="button" onClick={() => removeArrayItem('achievements', idx)}>✕</button>}
                                                    </div>
                                                ))}
                                                <button type="button" className="pef-mini-add-btn" onClick={() => addArrayItem('achievements', '')}>+ Add Achievement</button>
                                            </div>
                                        </div>

                                        {/* Services & Availability */}
                                        <div className="pef-section-title">Services & Availability</div>
                                        {editForm.services?.map((s, idx) => (
                                            <div key={idx} className="pef-service-edit-card">
                                                <div className="pef-fields-row">
                                                    <input type="text" value={s.title} onChange={(e) => handleArrayChange('services', idx, 'title', e.target.value)} placeholder="Service Title (e.g. Soil Consultation)" />
                                                    <input type="text" value={s.price} onChange={(e) => handleArrayChange('services', idx, 'price', e.target.value)} placeholder="Price/Session" />
                                                </div>
                                                <textarea value={s.description} onChange={(e) => handleArrayChange('services', idx, 'description', e.target.value)} placeholder="Description of what you offer in this service..." />
                                                {idx > 0 && <button type="button" className="pef-remove-link" onClick={() => removeArrayItem('services', idx)}>Remove Service</button>}
                                            </div>
                                        ))}
                                        <button type="button" className="pef-add-btn" onClick={() => addArrayItem('services', { title: '', price: '', description: '' })}>+ List a New Service</button>

                                        {/* Social Links */}
                                        <div className="pef-section-title">Web & Social Presence</div>
                                        <div className="pef-fields-row">
                                            <div className="pef-group">
                                                <label>LinkedIn URL</label>
                                                <input type="url" value={editForm.linkedin || ''} onChange={(e) => setEditForm({...editForm, linkedin: e.target.value})} placeholder="https://linkedin.com/in/..." />
                                            </div>
                                            <div className="pef-group">
                                                <label>Personal Website</label>
                                                <input type="url" value={editForm.website || ''} onChange={(e) => setEditForm({...editForm, website: e.target.value})} placeholder="https://www.expert.com" />
                                            </div>
                                        </div>

                                        <div className="pef-group full-width">
                                            <label>Deep Bio / Professional Background</label>
                                            <textarea value={editForm.bio || ''} onChange={(e) => setEditForm({...editForm, bio: e.target.value})} placeholder="Write a detailed summary of your expertise..." />
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="profile-view-grid-3-0">
                                    {/* Sidebar Column */}
                                    <div className="pvg-sidebar-3-0">
                                        <div className="pvg-avatar-wrapper">
                                            {currentUser?.profilePic ? (
                                                <img src={currentUser.profilePic} alt="Expert" className="pvg-img" />
                                            ) : (
                                                <div className="pvg-placeholder">👨‍⚕️</div>
                                            )}
                                        </div>
                                        
                                        <div className="pvg-identity">
                                            <h4>{currentUser?.name || 'Authorized Expert'}</h4>
                                            <span className="pvg-verified-badge">✓ Verified Specialist</span>
                                            <p className="pvg-main-spec">{currentUser?.specialization || 'Agronomy & Soil Science'}</p>
                                        </div>

                                        <div className="pvg-sidebar-section">
                                            <h5>Skills & Expertise</h5>
                                            <div className="pvg-skill-cloud">
                                                {currentUser?.skillTags?.filter(s => s).map((skill, i) => (
                                                    <span key={i} className="pvg-skill-tag">{skill}</span>
                                                )) || <span className="pvg-empty-text">No skills listed</span>}
                                            </div>
                                        </div>

                                        <div className="pvg-sidebar-section">
                                            <h5>Achievements</h5>
                                            <ul className="pvg-achievement-list">
                                                {currentUser?.achievements?.filter(a => a).map((award, i) => (
                                                    <li key={i}><span>🏆</span> {award}</li>
                                                )) || <li>No achievements listed</li>}
                                            </ul>
                                        </div>

                                        <div className="pvg-sidebar-section">
                                            <h5>Connect</h5>
                                            <div className="pvg-social-links-3-0">
                                                {currentUser?.linkedin && (
                                                    <a href={currentUser.linkedin} target="_blank" rel="noopener noreferrer" className="pvg-social-icon linkedin">
                                                        LinkedIn
                                                    </a>
                                                )}
                                                {currentUser?.website && (
                                                    <a href={currentUser.website} target="_blank" rel="noopener noreferrer" className="pvg-social-icon website">
                                                        Website
                                                    </a>
                                                )}
                                            </div>
                                            <div className="pvg-location-3-0">📍 {currentUser?.location || 'India'}</div>
                                        </div>
                                    </div>

                                    {/* Main Content Column */}
                                    <div className="pvg-main-3-0">
                                        <div className="pvg-main-section">
                                            <div className="pvg-section-header-3-0">
                                                <span className="pvg-sh-icon">📅</span>
                                                <h5>Professional Overview</h5>
                                            </div>
                                            <div className="pvg-metrics-3-0">
                                                <div className="pvg-metric-card">
                                                    <span className="pvg-m-label">Experience</span>
                                                    <span className="pvg-m-val">{currentUser?.experience || '10+ Years'}</span>
                                                </div>
                                                <div className="pvg-metric-card">
                                                    <span className="pvg-m-label">Expert Rating</span>
                                                    <span className="pvg-m-val">⭐ 4.9/5.0</span>
                                                </div>
                                                <div className="pvg-metric-card">
                                                    <span className="pvg-m-label">Availability</span>
                                                    <span className="pvg-m-val">{currentUser?.availability || 'Limited'}</span>
                                                </div>
                                                <div className="pvg-metric-card">
                                                    <span className="pvg-m-label">Consultation Fee</span>
                                                    <span className="pvg-m-val">{currentUser?.consultFee ? `₹${currentUser.consultFee}` : 'Free'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pvg-main-section">
                                            <div className="pvg-section-header-3-0">
                                                <span className="pvg-sh-icon">🎓</span>
                                                <h5>Education & Qualifications</h5>
                                            </div>
                                            <div className="pvg-education-timeline">
                                                {currentUser?.qualifications?.filter(q => q.degree).map((q, i) => (
                                                    <div key={i} className="pvg-edu-item">
                                                        <div className="pvg-edu-year">{q.year}</div>
                                                        <div className="pvg-edu-details">
                                                            <h6>{q.degree}</h6>
                                                            <p>{q.university}</p>
                                                        </div>
                                                    </div>
                                                )) || <div className="pvg-edu-item"><p>No degrees listed</p></div>}
                                            </div>
                                        </div>

                                        <div className="pvg-main-section">
                                            <div className="pvg-section-header-3-0">
                                                <span className="pvg-sh-icon">🛠️</span>
                                                <h5>Services & Portfolio</h5>
                                            </div>
                                            <div className="pvg-services-grid-3-0">
                                                {currentUser?.services?.filter(s => s.title).map((service, i) => (
                                                    <div key={i} className="pvg-service-card-3-0">
                                                        <h6>{service.title}</h6>
                                                        <p className="pvg-s-desc">{service.description}</p>
                                                        <div className="pvg-s-footer">
                                                            <span className="pvg-s-price">{service.price}</span>
                                                            <button className="pvg-s-book">Consult Now</button>
                                                        </div>
                                                    </div>
                                                )) || <p className="pvg-empty-text">No services listed yet.</p>}
                                            </div>
                                        </div>

                                        <div className="pvg-main-section">
                                            <div className="pvg-section-header-3-0">
                                                <span className="pvg-sh-icon">📝</span>
                                                <h5>Professional Biography</h5>
                                            </div>
                                            <div className="pvg-bio-box-3-0">
                                                {currentUser?.bio || 'Professional background details not provided.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Lightbox Overlay */}
            {lightboxIndex !== null && allImages.length > 0 && (
                <div
                    onClick={closeLightbox}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.96)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', 
                        overflowY: 'auto',
                        padding: '60px 0'
                    }}
                >
                    <button
                        onClick={closeLightbox}
                        style={{ position: 'fixed', top: '20px', right: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '1.4rem', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', zIndex: 100 }}
                        title="Close (Esc)"
                    >✕</button>

                    <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', background: 'rgba(0,0,0,0.4)', padding: '4px 14px', borderRadius: '20px', backdropFilter: 'blur(4px)', zIndex: 100 }}>
                        📷 {lightboxIndex + 1} / {allImages.length}
                    </div>

                    {allImages.length > 1 && (
                        <>
                            <button
                                onClick={e => { e.stopPropagation(); lightboxPrev(); }}
                                style={{ position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '1.8rem', width: '52px', height: '52px', borderRadius: '50%', cursor: 'pointer', zIndex: 100 }}
                            >‹</button>
                            <button
                                onClick={e => { e.stopPropagation(); lightboxNext(); }}
                                style={{ position: 'fixed', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '1.8rem', width: '52px', height: '52px', borderRadius: '50%', cursor: 'pointer', zIndex: 100 }}
                            >›</button>
                        </>
                    )}

                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '1000px', padding: '0 20px', gap: '1.5rem' }}
                    >
                        <img
                            src={allImages[lightboxIndex].src}
                            alt="Post full"
                            style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 10px 50px rgba(0,0,0,0.8)' }}
                        />
                        <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.95rem', textAlign: 'center', maxWidth: '700px', background: 'rgba(0,0,0,0.5)', padding: '15px 25px', borderRadius: '15px', backdropFilter: 'blur(10px)' }}>
                            <p style={{ margin: 0 }}>{allImages[lightboxIndex].content}</p>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    )
}

export default ExpertDashboard

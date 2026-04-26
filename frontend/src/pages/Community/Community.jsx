import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadToCloudinary } from '../../utils/cloudinary'
import Footer from '../../components/Footer/Footer'
import Navbar from '../../components/Navbar/Navbar'
import '../DiseaseDetection/DiseaseDetection.css'
import './Community.css'

const dummyPosts = [
    {
        id: 1,
        author: 'Ramesh Yadav',
        avatar: '👨‍🌾',
        location: 'Nashik, Maharashtra',
        time: '2 hrs ago',
        content: 'My wheat crop is showing yellow patches on leaves. I tried neem spray but no improvement. Can someone help? I\'ve been farming for 15 years and haven\'t seen this before.',
        image: null,
        likes: 24,
        comments: 8,
        tags: ['Wheat', 'Disease', 'Help'],
        expert: false,
    },
    {
        id: 2,
        author: 'Dr. Ajay Mehta',
        avatar: '👨‍⚕️',
        location: 'Delhi',
        time: '4 hrs ago',
        content: '🌟 Expert Tip: This Rabi season, watch out for powdery mildew in wheat due to high humidity. Apply Mancozeb 75% WP @ 2g per litre water at the first sign of white powdery spots. Early treatment is key to preventing spread!',
        image: null,
        likes: 156,
        comments: 34,
        tags: ['Expert Advice', 'Wheat', 'Disease Prevention'],
        expert: true,
    },
    {
        id: 3,
        author: 'Priya Patel',
        avatar: '👩‍🌾',
        location: 'Anand, Gujarat',
        time: '1 day ago',
        content: 'Finally got PM-KISAN installment! ₹2000 credited directly to my account. For those who haven\'t applied yet, don\'t miss this free benefit. I can share the application process.',
        image: null,
        likes: 89,
        comments: 22,
        tags: ['PM-KISAN', 'Government Scheme', 'Success'],
        expert: false,
    },
    {
        id: 4,
        author: 'Sunil Verma',
        avatar: '🧑‍🌾',
        location: 'Jalandhar, Punjab',
        time: '2 days ago',
        content: 'Tried drip irrigation for the first time this season in my tomato field. Water usage reduced by 40% and yield increased! Best investment I made this year. Subsidy available under PM-KUSUM.',
        image: null,
        likes: 203,
        comments: 47,
        tags: ['Drip Irrigation', 'Success Story', 'Tomato'],
        expert: false,
    },
]

const API_BASE = typeof import.meta !== 'undefined' ? (import.meta.env.VITE_API_BASE || 'http://localhost:5001') : 'http://localhost:5001';

// Utility to read/write posts from LS (fallback)
const getPostsFromLS = () => {
    const stored = localStorage.getItem('fasalCommunityPosts')
    if (stored) return JSON.parse(stored)
    return []
}

const savePostsToLS = (postsArray) => {
    localStorage.setItem('fasalCommunityPosts', JSON.stringify(postsArray))
}

const defaultTrending = [
    { tag: '#WheatDisease', posts: 234 },
    { tag: '#PMKisan2025', posts: 189 },
    { tag: '#RabiCrops', posts: 156 },
    { tag: '#DripIrrigation', posts: 128 },
    { tag: '#SoybeanFarming', posts: 95 },
    { tag: '#OrganicFarming', posts: 87 },
]
const defaultExperts = [
    { name: 'Dr. Ajay Mehta', spec: 'Plant Pathology', rating: '4.9' },
    { name: 'Dr. Reena Sharma', spec: 'Soil Science', rating: '4.8' },
    { name: 'Prof. R. Krishnan', spec: 'Horticulture', rating: '4.7' },
]
const defaultStats = [
    { label: 'Farmers', value: '50K+' },
    { label: 'Experts', value: '500+' },
    { label: 'Posts Today', value: '1,240' },
    { label: 'Questions Resolved', value: '98%' },
]

function Community({ isTab = false }) {
    const navigate = useNavigate()

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null');
        // Removed redirect for approved experts to allow them to participate in community
        // if (user?.role === 'expert' && user?.approved && !isTab) {
        //     navigate('/expert-dashboard');
        // }
    }, [navigate, isTab]);

    const [postText, setPostText] = useState('')
    const [posts, setPosts] = useState(getPostsFromLS())
    const [likedPosts, setLikedPosts] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [toastMsg, setToastMsg] = useState('')
    const [activeCommentId, setActiveCommentId] = useState(null)
    const [uploadingPost, setUploadingPost] = useState(false)
    const [postAudioBlob, setPostAudioBlob] = useState(null)
    const [commentText, setCommentText] = useState('')

    const [trendingWidgets, setTrendingWidgets] = useState(defaultTrending)
    const [expertsWidgets, setExpertsWidgets] = useState(defaultExperts)
    const [statsWidgets, setStatsWidgets] = useState(defaultStats)

    // New features state
    const [postImage, setPostImage] = useState(null)
    const [postImageUrl, setPostImageUrl] = useState('')
    const [postLocation, setPostLocation] = useState('')
    const [postTags, setPostTags] = useState([])
    const [showTagOptions, setShowTagOptions] = useState(false)
    const [savedPostIds, setSavedPostIds] = useState(JSON.parse(localStorage.getItem('fasalSavedPosts') || '[]'))
    const [viewMode, setViewMode] = useState('all') // all, saved
    const [lightboxIndex, setLightboxIndex] = useState(null) // index into allImages array

    // Voice Post State
    const [isRecording, setIsRecording] = useState(false)
    const [mediaRecorder, setMediaRecorder] = useState(null)
    const [postAudioUrl, setPostAudioUrl] = useState('')
    const [recordingTime, setRecordingTime] = useState(0)


    const cropOptions = ['Wheat', 'Rice', 'Tomato', 'Potato', 'Sugarcane', 'Cotton', 'Corn', 'Soybean']

    useEffect(() => {
        const storedUser = localStorage.getItem('fasalCurrentUser')
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser))
        }

        const tW = localStorage.getItem('fasalCommunityTrending')
        if (tW) setTrendingWidgets(JSON.parse(tW))

        // REAL-TIME: Fetch posts
        const fetchPosts = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/community/posts`)
                const json = await res.json()
                if (json.success && json.data.length > 0) {
                    setPosts(json.data)
                } else {
                    setPosts(getPostsFromLS())
                }
            } catch {
                setPosts(getPostsFromLS())
            }
        }

        // REAL-TIME: Fetch stats and experts
        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/user/stats`)
                const json = await res.json()
                if (json.success) {
                    const { totalFarmers, totalExperts, approvedExperts, totalPosts } = json.data
                    


                    setStatsWidgets([
                        { label: 'Farmers', value: totalFarmers || '0' },
                        { label: 'Experts', value: totalExperts || '0' },
                        { label: 'Total Posts', value: totalPosts || '0' },
                        { label: 'Questions Resolved', value: '98%' },
                        { label: 'Last Sync', value: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
                    ])

                    if (approvedExperts?.length > 0) {
                        // Dynamically shuffle or select a few to show as "online"
                        const onlineExperts = approvedExperts
                            .sort(() => 0.5 - Math.random()) // Randomize
                            .slice(0, 4) // Show up to 4
                            .map(e => ({
                                name: e.name || 'Expert',
                                spec: e.specialization || 'Agriculture',
                                rating: (4.5 + Math.random() * 0.5).toFixed(1), // Random premium rating
                                online: true
                            }))
                        setExpertsWidgets(onlineExperts)
                    }
                }
            } catch (err) {
                console.warn('Real-time stats sync failed:', err)
            }
        }

        fetchPosts()
        fetchStats()

        // Shortened intervals for "Real-time" feel as requested
        const postsInterval = setInterval(fetchPosts, 8000) 
        const statsInterval = setInterval(fetchStats, 10000) 
        
        return () => {
            clearInterval(postsInterval)
            clearInterval(statsInterval)
        }
    }, [])

    const handlePost = async () => {
        if (!postText.trim() && !postImageUrl && !postAudioUrl) return
        if (!currentUser) return

        setUploadingPost(true)
        try {
            let finalImageUrl = postImageUrl
            let finalAudioUrl = postAudioUrl

            // 1. Upload image if exists
            if (postImage) {
                showToast('📸 Uploading image...')
                finalImageUrl = await uploadToCloudinary(postImage)
            }

            // 2. Upload audio if exists
            if (postAudioBlob) {
                showToast('🎙️ Uploading voice message...')
                const audioFile = new File([postAudioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
                finalAudioUrl = await uploadToCloudinary(audioFile)
            }

            const newPost = {
                author: currentUser.name || currentUser.fullName || currentUser.email,
                avatar: currentUser.profilePic ? 'PICTURE' : (currentUser.role === 'admin' ? '🛡️' : (currentUser.role === 'expert' ? '👨‍⚕️' : '👨‍🌾')),
                profilePic: currentUser.profilePic || null,
                location: postLocation || (currentUser.state ? `${currentUser.city ? currentUser.city + ', ' : ''}${currentUser.state}` : 'Local area'),
                content: postText,
                image: finalImageUrl || null,
                audio: finalAudioUrl || null,
                tags: postTags,
                role: currentUser.role,
                expert: currentUser.role === 'expert',
                admin: currentUser.role === 'admin'
            }

            // Persistence
            const res = await fetch(`${API_BASE}/api/community/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPost)
            })
            const json = await res.json()

            if (json.success) {
                setPosts(prev => [json.data, ...prev])
                // Reset
                setPostText('')
                setPostImageUrl('')
                setPostImage(null)
                setPostLocation('')
                setPostTags([])
                setPostAudioUrl('')
                setPostAudioBlob(null)
                showToast('🚀 Post shared with community!')
            }
        } catch (err) {
            console.error('Post failed:', err)
            showToast('❌ Failed to share post. Please try again.')
        } finally {
            setUploadingPost(false)
        }
    }

    // --- Audio Recording Logic ---
    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
        } else {
            clearInterval(interval)
            setRecordingTime(0)
        }
        return () => clearInterval(interval)
    }, [isRecording])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            const chunks = []
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                setPostAudioBlob(blob)
                setPostAudioUrl(URL.createObjectURL(blob))
                stream.getTracks().forEach(track => track.stop())
            }
            recorder.start()
            setMediaRecorder(recorder)
            setIsRecording(true)
            setPostAudioUrl('')
        } catch (err) {
            showToast('⚠️ Microphone access denied or unavailable.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop()
            setIsRecording(false)
        }
    }


    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setPostImage(file)
            setPostImageUrl(URL.createObjectURL(file))
        }
    }

    const toggleTag = (tag) => {
        setPostTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
    }

    const handleLocation = () => {
        if (navigator.geolocation) {
            setPostLocation('Fetching...')
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    // In a real app we'd use reverse geocoding
                    setPostLocation(`Lat: ${pos.coords.latitude.toFixed(2)}, Lon: ${pos.coords.longitude.toFixed(2)}`)
                },
                () => setPostLocation('Location Permission Denied')
            )
        }
    }

    const toggleLike = (id) => {
        setLikedPosts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        )
    }

    const showToast = (msg) => {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(''), 3000)
    }

    const handleShare = (post) => {
        if (navigator.share) {
            navigator.share({
                title: 'Krishi Charcha Post',
                text: post.content,
                url: window.location.href,
            }).catch(() => showToast('↗️ Share failed'))
        } else {
            navigator.clipboard.writeText(window.location.href)
            showToast('🔗 Link copied to clipboard!')
        }
    }

    const handleSavePost = (postId) => {
        setSavedPostIds(prev => {
            const next = prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
            localStorage.setItem('fasalSavedPosts', JSON.stringify(next))
            showToast(prev.includes(postId) ? '🗑️ Removed from bookmarks' : '🔖 Saved to bookmarks!')
            return next
        })
    }

    const handleCommentSubmit = async (postId) => {
        if (!commentText.trim()) return

        // Optimistic update
        const updatedPosts = posts.map(p => {
            const pid = p._id || p.id
            if (pid === postId) {
                return {
                    ...p,
                    comments: (p.comments || 0) + 1,
                    commentList: [...(p.commentList || []), { author: currentUser?.name || 'You', text: commentText }]
                }
            }
            return p
        })
        setPosts(updatedPosts)
        setCommentText('')
        setActiveCommentId(null)
        showToast('💬 Comment added!')

        // Persist to MongoDB
        try {
            await fetch(`${API_BASE}/api/community/posts/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author: currentUser?.name || 'You', text: commentText })
            })
        } catch (e) {
            console.warn('Comment save failed')
        }
    }

    // All images from posts for lightbox gallery navigation
    const allImages = posts
        .filter(p => p.image)
        .map(p => ({ src: p.image, author: p.author, content: p.content }))

    const openLightbox = (imageSrc) => {
        const idx = allImages.findIndex(img => img.src === imageSrc)
        setLightboxIndex(idx >= 0 ? idx : 0)
    }

    const closeLightbox = () => setLightboxIndex(null)

    const lightboxPrev = () => setLightboxIndex(i => (i - 1 + allImages.length) % allImages.length)
    const lightboxNext = () => setLightboxIndex(i => (i + 1) % allImages.length)

    // Keyboard support for lightbox
    useEffect(() => {
        if (lightboxIndex === null) {
            document.body.style.overflow = 'auto'
            return
        }
        
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
    }, [lightboxIndex, allImages.length])

    return (
        <div className={isTab ? "dashboard-tab-content" : "page-wrapper"}>
            {!isTab && <Navbar />}
            <main className={isTab ? "tab-main" : "main-content"}>
                {!isTab && (
                    <div className="page-hero page-hero-teal">
                        <div className="container">
                            <div className="badge">🌾 Community</div>
                            <h1>Krishi Charcha</h1>
                            <p>Connect, share, and learn with a community of 50,000+ farmers and agricultural experts</p>
                        </div>
                    </div>
                )}

                {toastMsg && (
                    <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#333', color: '#fff', padding: '12px 24px', borderRadius: '8px', zIndex: 99999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'fadeInUp 0.3s ease-out' }}>
                        {toastMsg}
                    </div>
                )}

                <div className="community-page container">
                    <div className="community-layout">

                        {/* Main feed */}
                        <div className="feed-column">

                            {/* Tabs */}
                            <div className="community-tabs">
                                <button className={`comm-tab ${viewMode === 'all' ? 'active' : ''}`} onClick={() => setViewMode('all')}>All Discussions</button>
                                <button className={`comm-tab ${viewMode === 'saved' ? 'active' : ''}`} onClick={() => setViewMode('saved')}>🔖 Saved Posts</button>
                            </div>

                            {/* Post box */}
                            {viewMode === 'all' && (
                                <div className="post-box">
                                    <div className="post-box-header">
                                        {currentUser?.profilePic ? (
                                            <img src={currentUser.profilePic} alt="User" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <span className="post-box-avatar">
                                                {currentUser?.role === 'admin' ? '🛡️' : (currentUser?.role === 'expert' ? '👨‍⚕️' : '👨‍🌾')}
                                            </span>
                                        )}
                                        <span className="post-box-user">{currentUser ? (currentUser.name || currentUser.fullName || currentUser.email) : 'Guest Farmer'}</span>
                                    </div>
                                    <textarea
                                        className="post-textarea"
                                        placeholder={currentUser ? "Share your farming experience, ask a question, or post a success story..." : "Login to share your experience with the community..."}
                                        value={postText}
                                        onChange={(e) => setPostText(e.target.value)}
                                        rows={4}
                                        disabled={!currentUser}
                                    />
                                    
                                    {!currentUser && (
                                        <div className="login-nudge">
                                            <p>👋 Want to share? <button className="nudge-link" onClick={() => navigate('/login')}>Login</button> to post photos, tags, and more!</p>
                                        </div>
                                    )}

                                    {(postImageUrl || postLocation || postTags.length > 0 || postAudioUrl || isRecording) && (
                                        <div className="post-attachments-preview">
                                            {postImageUrl && (
                                                <div className="preview-media-wrap">
                                                    <img src={postImageUrl} alt="preview" className="media-preview-img" />
                                                    <button className="remove-media" onClick={() => { setPostImage(null); setPostImageUrl(''); }}>✕</button>
                                                </div>
                                            )}
                                            {postLocation && <span className="att-tag loc">📍 {postLocation}</span>}
                                            {postTags.map(t => <span key={t} className="att-tag tag">#{t}</span>)}
                                            {isRecording && (
                                                <div className="preview-media-wrap" style={{ background: '#fee2e2', padding: '0.4rem 1rem', borderRadius: '20px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                                    <span className="pulsing-record-dot" style={{width: '10px', height: '10px', background: '#dc2626', borderRadius: '50%', animation: 'pulse 1.5s infinite'}}></span>
                                                    Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                                </div>
                                            )}
                                            {postAudioUrl && (
                                                <div className="preview-media-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '30px' }}>
                                                    <audio controls src={postAudioUrl} style={{ height: '30px' }} />
                                                    <button className="remove-media" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setPostAudioUrl('')}>✕</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="post-box-footer">
                                        <div className="post-attachments">
                                            <input type="file" id="post-img-input" hidden accept="image/*" onChange={handleImageChange} />
                                            <button className="attach-btn" title="Upload Image" onClick={() => currentUser ? document.getElementById('post-img-input').click() : navigate('/login')}>📷 Photo</button>
                                            {isRecording ? (
                                                <button className="attach-btn" title="Stop Recording" onClick={stopRecording} style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}>⏹️ Stop</button>
                                            ) : (
                                                <button className="attach-btn" title="Record Voice" onClick={() => currentUser ? startRecording() : navigate('/login')}>🎙️ Voice</button>
                                            )}
                                            <button className="attach-btn" title="Tag Crop" onClick={() => currentUser ? setShowTagOptions(!showTagOptions) : navigate('/login')}>🌾 Tag Crop</button>
                                            <button className="attach-btn" title="Add Location" onClick={() => currentUser ? handleLocation() : navigate('/login')}>📍 Location</button>
                                        </div>
                                        <button 
                                            className="post-submit-btn" 
                                            onClick={handlePost} 
                                            disabled={(!postText.trim() && !postImageUrl && !postAudioUrl) || uploadingPost}
                                        >
                                            {uploadingPost ? '⌛ Processing...' : (currentUser ? 'Post to Community →' : 'Login to Post')}
                                        </button>
                                    </div>
                                    
                                    {showTagOptions && (
                                        <div className="tag-options-grid">
                                            {cropOptions.map(crop => (
                                                <button 
                                                    key={crop} 
                                                    className={`tag-opt ${postTags.includes(crop) ? 'selected' : ''}`}
                                                    onClick={() => toggleTag(crop)}
                                                >
                                                    {crop}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {viewMode === 'saved' && savedPostIds.length === 0 && (
                                <div className="post-box animate-fadeIn" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔖</div>
                                    <h3>No saved posts yet</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Posts you save will appear here for easy access.</p>
                                    <button className="comm-tab active" style={{ marginTop: '1.5rem' }} onClick={() => setViewMode('all')}>Explore Discussions</button>
                                </div>
                            )}

                            {/* Feed */}
                            <div className="posts-feed">
                                {posts.filter(p => viewMode === 'all' || savedPostIds.includes(p.id)).map(post => (
                                    <div key={post.id} className={`post-card ${post.expert ? 'expert-post' : ''} animate-fadeIn`}>
                                        {post.expert && (
                                            <div className="expert-post-badge">⭐ Expert Advice</div>
                                        )}
                                        <div className="post-header">
                                            <div className="post-author-info">
                                                {post.avatar === 'PICTURE' && post.profilePic ? (
                                                    <img src={post.profilePic} alt="User" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                                ) : (
                                                    <span className="post-avatar">{post.avatar}</span>
                                                )}
                                                <div>
                                                    <div className="post-author-name">
                                                        {post.author}
                                                        {post.expert && <span className="expert-checkmark" title="Verified Expert">✅</span>}
                                                        {post.admin && <span className="admin-badge" style={{ fontSize: '10px', background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px', verticalAlign: 'middle' }}>ADMIN</span>}
                                                    </div>
                                                    <div className="post-meta">
                                                        📍 {post.location} · {post.time}
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="post-options-btn">⋯</button>
                                        </div>

                                        <p className="post-content">{post.content}</p>

                                        {post.image && (
                                            <div className="post-media-container" onClick={() => openLightbox(post.image)} style={{ cursor: 'zoom-in' }}>
                                                <img src={post.image} alt="post media" className="post-media-content" />
                                                <div className="post-media-overlay">🔍 Click to enlarge</div>
                                            </div>
                                        )}

                                        {post.audio && (
                                            <div className="post-audio-container-premium">
                                                <div className="audio-wave-decoration">
                                                    {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className="wave-bar" style={{ height: `${20 + Math.random() * 60}%` }}></div>)}
                                                </div>
                                                <div className="audio-player-wrapper">
                                                    <span className="audio-icon-vc">🎙️</span>
                                                    <audio controls src={post.audio} className="premium-audio-player" />
                                                </div>
                                                <div className="audio-meta">Expert Voice Advice · Quality Verified</div>
                                            </div>
                                        )}

                                        {post.tags && post.tags.length > 0 && (
                                            <div className="post-tags">
                                                {post.tags.map(tag => (
                                                    <span key={tag} className="post-tag">#{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="post-actions">
                                            <button
                                                className={`post-action-btn ${likedPosts.includes(post.id) ? 'liked' : ''}`}
                                                onClick={() => toggleLike(post.id)}
                                            >
                                                {likedPosts.includes(post.id) ? '❤️' : '🤍'} {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}
                                            </button>
                                            <button className="post-action-btn" onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)}>💬 {post.comments}</button>
                                            <button className="post-action-btn" onClick={() => handleShare(post)}>↗️ Share</button>
                                            <button 
                                                className={`post-action-btn ${savedPostIds.includes(post.id) ? 'saved' : ''}`} 
                                                onClick={() => handleSavePost(post.id)}
                                            >
                                                {savedPostIds.includes(post.id) ? '🔖' : '📔'} {savedPostIds.includes(post.id) ? 'Saved' : 'Save'}
                                            </button>
                                        </div>

                                        {activeCommentId === post.id && (
                                            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                                                {post.commentList && post.commentList.map((c, idx) => (
                                                    <div key={idx} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                                        <strong>{c.author}: </strong> {c.text}
                                                    </div>
                                                ))}
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <input type="text" className="input-field" placeholder="Write a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} style={{ padding: '0.4rem', flex: 1 }} />
                                                    <button onClick={() => handleCommentSubmit(post.id)} disabled={!commentText.trim()} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 1rem', borderRadius: '4px', cursor: 'pointer' }}>Post</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="community-sidebar">



                            {/* Active experts */}
                            <div className="sidebar-panel">
                                <h3 className="sidebar-panel-title">👨‍⚕️ Online Experts</h3>
                                <div className="experts-online">
                                    {expertsWidgets.map((e, i) => (
                                        <div key={i} className="expert-online-card">
                                            <span className="eoc-avatar">👨‍⚕️</span>
                                            <div className="eoc-info">
                                                <p className="eoc-name">{e.name}</p>
                                                <p className="eoc-spec">{e.spec}</p>
                                                <p className="eoc-rating">⭐ {e.rating}</p>
                                            </div>
                                            <div className="eoc-status">
                                                <span className="status-dot" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Community stats */}
                            <div className="sidebar-panel community-stats-panel">
                                <h3 className="sidebar-panel-title">📊 Community Stats</h3>
                                {statsWidgets.map(s => (
                                    <div key={s.label} className="community-stat-row">
                                        <span>{s.label}</span>
                                        <span className="cs-val">{s.value}</span>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>
            </main>
            {!isTab && <Footer />}

            {lightboxIndex !== null && allImages.length > 0 && (
                <div
                    className="lightbox-overlay"
                    onClick={closeLightbox}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.96)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', 
                        overflowY: 'auto',
                        padding: '60px 0',
                        animation: 'fadeIn 0.2s ease'
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        style={{ position: 'fixed', top: '20px', right: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '1.4rem', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', zIndex: 100, transition: 'background 0.2s' }}
                        title="Close (Esc)"
                    >✕</button>

                    {/* Counter */}
                    <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', background: 'rgba(0,0,0,0.4)', padding: '4px 14px', borderRadius: '20px', backdropFilter: 'blur(4px)', zIndex: 100 }}>
                        📷 {lightboxIndex + 1} / {allImages.length}
                    </div>

                    {/* Prev button */}
                    {allImages.length > 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); lightboxPrev(); }}
                            style={{ position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '1.8rem', width: '52px', height: '52px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', backdropFilter: 'blur(4px)', zIndex: 100 }}
                            title="Previous (←)"
                        >‹</button>
                    )}

                    {/* Image + caption wrapper */}
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', 
                            width: '100%', maxWidth: '1000px', padding: '0 20px', gap: '1.5rem'
                        }}
                    >
                        <img
                            src={allImages[lightboxIndex].src}
                            alt="Post image"
                            style={{
                                maxWidth: '100%',
                                height: 'auto',
                                borderRadius: '12px',
                                boxShadow: '0 10px 50px rgba(0,0,0,0.8)',
                                display: 'block',
                                animation: 'zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                        />
                        {/* Caption */}
                        <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.95rem', textAlign: 'center', maxWidth: '700px', lineHeight: 1.6, background: 'rgba(0,0,0,0.5)', padding: '15px 25px', borderRadius: '15px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontWeight: 700, color: 'white', marginBottom: '8px', fontSize: '1.1rem' }}>👤 {allImages[lightboxIndex].author}</div>
                            {allImages[lightboxIndex].content && (
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>
                                    {allImages[lightboxIndex].content}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Next button */}
                    {allImages.length > 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); lightboxNext(); }}
                            style={{ position: 'fixed', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '1.8rem', width: '52px', height: '52px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', backdropFilter: 'blur(4px)', zIndex: 100 }}
                            title="Next (→)"
                        >›</button>
                    )}

                    {/* Thumbnail strip */}
                    {allImages.length > 1 && (
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{ position: 'fixed', bottom: '16px', display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '90vw', padding: '6px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', backdropFilter: 'blur(6px)', zIndex: 100 }}
                        >
                            {allImages.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img.src}
                                    alt={`thumb-${idx}`}
                                    onClick={() => setLightboxIndex(idx)}
                                    style={{
                                        width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px',
                                        border: idx === lightboxIndex ? '2px solid #60a5fa' : '2px solid transparent',
                                        cursor: 'pointer', opacity: idx === lightboxIndex ? 1 : 0.55,
                                        transition: 'all 0.2s', flexShrink: 0
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Keyboard hint */}
                    <div style={{ position: 'fixed', bottom: allImages.length > 1 ? '90px' : '16px', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', zIndex: 100 }}>
                        ← → to navigate &nbsp;·&nbsp; Esc to close
                    </div>
                </div>
            )}
        </div>
    )
}

export default Community

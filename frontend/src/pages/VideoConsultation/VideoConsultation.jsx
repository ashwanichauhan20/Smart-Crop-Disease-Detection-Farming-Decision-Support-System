import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Footer from '../../components/Footer/Footer'
import Navbar from '../../components/Navbar/Navbar'
import { useNotifications } from '../../context/NotificationContext'
import { useVideoCall } from '../../context/VideoCallContext'
import { EXPERTS } from '../../data/translations'
import BookingModal from '../../components/BookingModal/BookingModal'
import '../DiseaseDetection/DiseaseDetection.css'
import './VideoConsultation.css'

function VideoConsultation({ isTab = false }) {
    const { callState: contextCallState, localStream, remoteStream, initiateCall, endCall: contextEndCall } = useVideoCall()
    const location = useLocation()
    const [callState, setCallState] = useState('idle') // idle, waiting, active, ended
    const [selectedExpert, setSelectedExpert] = useState(null)
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [myAppointments, setMyAppointments] = useState([])
    const [showBooking, setShowBooking] = useState(false)
    const [bookingExpert, setBookingExpert] = useState(null)
    const { addNotification } = useNotifications()
    const currentUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')

    const [experts, setExperts] = useState([])
    const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'))

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

    // Features State
    const [callDuration, setCallDuration] = useState(0)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const [chatMsg, setChatMsg] = useState('')
    const [chatLog, setChatLog] = useState([])
    const [rating, setRating] = useState(0)
    const [feedbackComment, setFeedbackComment] = useState('')

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    useEffect(() => {
        let timerId;
        if (callState === 'active') {
            timerId = setInterval(() => setCallDuration(d => d + 1), 1000)
        } else if (callState === 'ended' || callState === 'idle') {
            if (callState === 'idle') {
                setCallDuration(0)
                setRating(0)
                setFeedbackComment('')
                setChatLog([])
                setIsScreenSharing(false)
                setShowChat(false)
            }
        }
        return () => clearInterval(timerId)
    }, [callState])

    // Sync Context state with Local state
    useEffect(() => {
        if (contextCallState === 'active') setCallState('active')
        if (contextCallState === 'ended' || contextCallState === 'idle') {
            if (callState === 'active') setCallState('ended')
        }
    }, [contextCallState])

    // Attach streams to video elements
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream, callState])

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream, callState])

    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !isMuted)
            localStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff)
        }
    }, [isMuted, isVideoOff, localStream])

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!currentUser?._id) return
            try {
                const res = await fetch(`${API_BASE}/api/appointments/user/${currentUser._id}`)
                const data = await res.json()
                if (data.success) {
                    setMyAppointments(data.data)
                }
            } catch (err) {
                console.error("Failed to fetch appointments:", err)
            }
        }
        fetchAppointments()
        
        const apptInterval = setInterval(fetchAppointments, 10000)
        
        // Fetch dynamic experts
        const fetchExperts = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/user/all`)
                const data = await res.json()
                if (data.success) {
                    const approvedExperts = data.data.filter(u => u.role === 'expert' && u.approved)
                    setExperts(approvedExperts)
                }
            } catch (e) {
                console.error("Failed to fetch experts:", e)
            }
        }
        fetchExperts()

        return () => clearInterval(apptInterval)
    }, [currentUser])

    // Auto-dial farmer if navigated from ExpertDashboard with callFarmerId
    useEffect(() => {
        const { callFarmerId, farmerName } = location?.state || {}
        if (callFarmerId && callState === 'idle') {
            joinCall({ _id: callFarmerId, name: farmerName || 'Farmer', avatar: '🌾', spec: 'Farmer' })
        }
    }, [location?.state])

    const joinCall = async (expert) => {
        setSelectedExpert(expert)
        setCallState('waiting')
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: !isVideoOff, audio: !isMuted })
            const call = await initiateCall(expert._id, stream)
            if (!call) {
                setCallState('ended')
                addNotification({ email: currentUser?.email }, 'Call Failed', 'Could not connect to peer.', 'error')
            }
        } catch (err) {
            console.error(err)
            setCallState('ended')
            addNotification({ email: currentUser?.email }, 'Camera Error', 'Could not access camera.', 'error')
        }
    }

    const handleBook = (expert) => {
        setBookingExpert(expert)
        setShowBooking(true)
    }

    const endCall = () => {
        contextEndCall()
        setCallState('ended')
    }

    const submitFeedback = async () => {
        if (!rating) return addNotification({ email: currentUser?.email }, 'Rating Required', 'Please select a star rating.', 'error')
        try {
            if (selectedExpert?._id) {
                await fetch(`${API_BASE}/api/user/${selectedExpert._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        feedback: [{ farmerName: currentUser?.name || 'Farmer', rating: rating, comment: feedbackComment || 'Feedback via Video Consultation', date: new Date() }]
                    })
                })
            }
            addNotification({ email: currentUser?.email }, 'Feedback Submitted', 'Thank you for your feedback!', 'success')
            setCallState('idle')
        } catch(e) {
            setCallState('idle')
        }
    }

    const toggleScreenShare = async () => {
        addNotification({ email: currentUser?.email }, 'Coming Soon', 'Screen sharing is being upgraded to support peer-to-peer WebRTC streams.', 'info')
    }

    const handleSendChat = () => {
        if (!chatMsg.trim()) return
        setChatLog(prev => [...prev, { sender: 'You', msg: chatMsg }])
        setChatMsg('')
        setTimeout(() => {
            setChatLog(prev => [...prev, { sender: selectedExpert?.name || 'Expert', msg: 'Thanks for sharing. I am reviewing the details.' }])
        }, 1500)
    }

    return (
        <div className={isTab ? "dashboard-tab-content" : "page-wrapper"}>
            {!isTab && <Navbar />}
            <main className={isTab ? "tab-main" : "main-content"}>
                {!isTab && (
                    <div className="page-hero page-hero-blue">
                        <div className="container">
                            <div className="badge">📹 Live Video</div>
                            <h1>Expert Video Consultation</h1>
                            <p>Connect face-to-face with certified agricultural experts for personalized advice</p>
                        </div>
                    </div>
                )}

                <div className="video-page container">

                    {/* Video Room */}
                    {callState !== 'idle' && (
                        <div className="video-room animate-fadeInUp">
                            <div className="video-room-header">
                                <div className="vr-expert-info">
                                    <span>{selectedExpert?.avatar}</span>
                                    <div>
                                        <p className="vr-expert-name">{selectedExpert?.name}</p>
                                        <p className="vr-expert-spec">{selectedExpert?.spec}</p>
                                    </div>
                                </div>
                                <div className="vr-status">
                                    {callState === 'waiting' && (
                                        <span className="vr-status-badge waiting">
                                            <span className="spinner-small" />
                                            Connecting...
                                        </span>
                                    )}
                                    {callState === 'active' && (
                                        <span className="vr-status-badge active">
                                            <span className="live-dot" />
                                            Live · {formatTime(callDuration)}
                                        </span>
                                    )}
                                    {callState === 'ended' && (
                                        <span className="vr-status-badge ended">Call Ended</span>
                                    )}
                                </div>
                            </div>

                            <div className="video-area">
                                <div className="remote-video">
                                    {callState === 'waiting' ? (
                                        <div className="connecting-state">
                                            <div className="connecting-icon">{selectedExpert?.avatar}</div>
                                            <p>Connecting to {selectedExpert?.name}...</p>
                                            <div className="connecting-dots">
                                                <span />
                                                <span />
                                                <span />
                                            </div>
                                        </div>
                                    ) : callState === 'active' ? (
                                        <div className="expert-video-placeholder" style={{width: '100%', height: '100%', position: 'relative', background: '#000', padding: 0}}>
                                            <video ref={remoteVideoRef} autoPlay playsInline style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px'}} />
                                            {!remoteStream && (
                                                <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                                                    <span className="expert-video-avatar">{selectedExpert?.avatar || '👤'}</span>
                                                    <p style={{color: 'white', marginTop: '10px'}}>{selectedExpert?.name || 'Connected Peer'}</p>
                                                </div>
                                            )}
                                            <div className="video-live-indicator">🔴 LIVE</div>
                                        </div>
                                    ) : (
                                        <div className="call-ended-state">
                                            <span>✅</span>
                                            <p style={{fontWeight: 'bold', fontSize: '1.2rem'}}>Call Ended Successfully</p>
                                            <p className="call-ended-sub">Duration: {formatTime(callDuration)}</p>
                                            <div style={{marginTop: '1rem'}}>
                                                <p style={{marginBottom: '8px', fontWeight: '500'}}>Rate this consultation:</p>
                                                <div className="star-rating">
                                                    {[1, 2, 3, 4, 5].map(s => <button key={s} className={`star-btn ${rating >= s ? 'selected' : ''}`} onClick={() => setRating(s)} style={{ color: rating >= s ? '#FFD700' : '#ccc', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>⭐</button>)}
                                                </div>
                                                <textarea
                                                    value={feedbackComment}
                                                    onChange={e => setFeedbackComment(e.target.value)}
                                                    placeholder="Tell us what you liked or what could be improved..."
                                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1rem', minHeight: '80px', resize: 'vertical', fontSize: '0.9rem' }}
                                                />
                                                <button className="submit-feedback-btn" onClick={submitFeedback} style={{ marginTop: '1rem', background: '#3b82f6', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>Submit Feedback</button>
                                            </div>
                                        </div>
                                    )}

                                    {callState === 'active' && (
                                        <div className="local-video" style={{ padding: 0, overflow: 'hidden', background: '#000' }}>
                                            <video 
                                                ref={localVideoRef} 
                                                autoPlay 
                                                playsInline 
                                                muted 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isScreenSharing ? 'scaleX(1)' : 'scaleX(-1)' }}
                                            />
                                            <div style={{ position: 'absolute', bottom: '5px', left: '10px', color: 'white', fontSize: '0.8rem', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px', zIndex: 10 }}>You {isMuted ? '🔇' : ''} {isVideoOff && !isScreenSharing ? '📵' : ''} {isScreenSharing ? '(Screen Sharing)' : ''}</div>
                                        </div>
                                    )}

                                    {/* Chat Overlay */}
                                    {callState === 'active' && showChat && (
                                        <div style={{ position: 'absolute', right: '10px', bottom: '10px', width: '300px', height: '400px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 20 }}>
                                            <div style={{ padding: '10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ margin: 0 }}>Meeting Chat</h4>
                                                <button onClick={() => setShowChat(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                                            </div>
                                            <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {chatLog.map((m, i) => (
                                                    <div key={i} style={{ alignSelf: m.sender === 'You' ? 'flex-end' : 'flex-start', background: m.sender === 'You' ? '#3b82f6' : '#f1f5f9', color: m.sender === 'You' ? 'white' : 'black', padding: '6px 10px', borderRadius: '8px', maxWidth: '80%', fontSize: '0.85rem' }}>
                                                        <div style={{ fontSize: '0.65rem', opacity: 0.8, marginBottom: '2px' }}>{m.sender}</div>
                                                        <div>{m.msg}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ padding: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '5px' }}>
                                                <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="Type a message..." />
                                                <button onClick={handleSendChat} style={{ padding: '6px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Send</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {callState === 'active' && (
                                <div className="call-controls">
                                    <button
                                        className={`ctrl-btn ${isMuted ? 'ctrl-off' : ''}`}
                                        onClick={() => setIsMuted(!isMuted)}
                                        title={isMuted ? 'Unmute' : 'Mute'}
                                    >
                                        {isMuted ? '🔇' : '🎤'}
                                        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                                    </button>
                                    <button
                                        className={`ctrl-btn ${isVideoOff ? 'ctrl-off' : ''}`}
                                        onClick={() => setIsVideoOff(!isVideoOff)}
                                        title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                                    >
                                        {isVideoOff ? '📵' : '📹'}
                                        <span>{isVideoOff ? 'Camera Off' : 'Camera On'}</span>
                                    </button>
                                    <button className="ctrl-btn" onClick={() => setShowChat(!showChat)}>💬 <span>Chat</span></button>
                                    <button className="ctrl-btn" onClick={toggleScreenShare} style={{ background: isScreenSharing ? '#3b82f6' : '', color: isScreenSharing ? 'white' : '' }}>📤 <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span></button>
                                    <button className="ctrl-btn end-call-btn" onClick={endCall}>
                                        📵 <span>End Call</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {myAppointments.length > 0 && (
                        <div className="my-appointments-section animate-fadeInUp">
                            <h3 className="section-title-vc">📅 Your Appointments</h3>
                            <div className="appointments-list-farmer">
                                {myAppointments.map(appt => (
                                    <div key={appt._id} className={`farmer-appt-card ${appt.status}`}>
                                        <div className="fa-info">
                                            <p className="fa-expert">
                                                {currentUser?.role === 'expert'
                                                    ? `🌾 Farmer: ${appt.farmerName}`
                                                    : `👨‍⚕️ Expert: ${appt.expertName}`}
                                            </p>
                                            <p className="fa-time">⏰ {appt.date} | {appt.slot}</p>
                                            <p className="fa-reason">🔬 {appt.disease}</p>
                                            {appt.note && <p style={{fontSize: '0.8rem', color: '#64748b', marginTop: '4px'}}>📝 {appt.note}</p>}
                                        </div>
                                        <div className="fa-status">
                                            <span className={`status-badge ${appt.status}`}>
                                                {appt.status === 'pending' ? '⏳ PENDING'
                                                : appt.status === 'approved' ? '✅ APPROVED'
                                                : appt.status === 'rejected' ? '❌ REJECTED'
                                                : appt.status.toUpperCase()}
                                            </span>
                                            {appt.status === 'approved' && (
                                                <button className="join-now-btn" onClick={() => {
                                                    if (currentUser?.role === 'expert') {
                                                        // Expert calls the Farmer
                                                        joinCall({ _id: appt.farmerId, name: appt.farmerName, avatar: '🌾', spec: 'Farmer' })
                                                    } else {
                                                        // Farmer calls the Expert
                                                        joinCall({ _id: appt.expertId, name: appt.expertName, avatar: '👨‍⚕️', spec: 'Expert' })
                                                    }
                                                }}>📹 Join Now</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expert list */}
                    <div className="experts-section">
                        <h3 className="section-title-vc">
                            {callState === 'idle' ? '🩺 Available Experts' : '📋 Other Experts'}
                        </h3>
                        <div className="experts-grid">
                            {experts.length > 0 ? experts.map(expert => (
                                <div key={expert._id} className="expert-card">
                                    <div className="ec-header">
                                        <div className="ec-avatar-wrapper">
                                            {expert.profilePic ? (
                                                <img src={expert.profilePic} alt={expert.name} className="ec-avatar-img" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <span className="ec-avatar">👨‍⚕️</span>
                                            )}
                                            <span className="ec-online-dot online" />
                                        </div>
                                        <div className="ec-info">
                                            <p className="ec-name">{expert.name}</p>
                                            <p className="ec-spec">{expert.specialization || 'Agriculture Expert'}</p>
                                            <div className="ec-rating">
                                                <span className="ec-stars">⭐ 4.9</span>
                                                <span className="ec-reviews">(Available)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ec-details">
                                        <div className="ec-detail-chip">🌐 {expert.state || 'India'}</div>
                                        <div className="ec-detail-chip">💼 {expert.experience || '10+ yrs'} exp</div>
                                        <div className="ec-detail-chip fee">₹{expert.consultFee || 'Free'}/session</div>
                                    </div>

                                    <div className="ec-status-row">
                                        <span className="ec-status-text available">
                                            🟢 Active Consultant
                                        </span>
                                    </div>

                                    <div className="ec-actions-vc">
                                        <button className="ec-join-btn" onClick={() => joinCall({ _id: expert._id, name: expert.name, avatar: '👨‍⚕️', spec: expert.specialization })}> Start Live Chat</button>
                                        <button className="ec-book-btn-vc" onClick={() => handleBook(expert)}>📅 Book Session</button>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '3rem' }}>
                                    <p>No experts available at the moment. Please check back later.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* How it works */}
                    <div className="vc-how-it-works">
                        <h3 className="section-title-vc">📋 How Video Consultation Works</h3>
                        <div className="vc-steps">
                            {[
                                { icon: '🔍', step: '1', title: 'Choose an Expert', desc: 'Browse available agricultural experts filtered by specialization' },
                                { icon: '📹', step: '2', title: 'Start Video Call', desc: 'Click "Start Video Call" to instantly connect with the expert' },
                                { icon: '🌾', step: '3', title: 'Share Your Problem', desc: 'Show your crop, describe your issue, get personalized advice' },
                                { icon: '📋', step: '4', title: 'Get Action Plan', desc: 'Receive a written summary and treatment plan after the call' },
                            ].map(s => (
                                <div key={s.step} className="vc-step">
                                    <div className="vc-step-num">{s.step}</div>
                                    <div className="vc-step-icon">{s.icon}</div>
                                    <h4>{s.title}</h4>
                                    <p>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>
            {!isTab && <Footer />}

            {showBooking && (
                <BookingModal 
                    onClose={async () => {
                        setShowBooking(false);
                        // Refresh appointments after booking
                        if (currentUser?._id) {
                            const res = await fetch(`${API_BASE}/api/appointments/user/${currentUser._id}`)
                            const data = await res.json()
                            if (data.success) setMyAppointments(data.data)
                        }
                    }}
                    initialExpert={bookingExpert}
                    diseaseName="General Consultation" 
                />
            )}
        </div>
    )
}

export default VideoConsultation

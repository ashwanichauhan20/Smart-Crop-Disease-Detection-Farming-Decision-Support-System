import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Peer from 'peerjs'
import { useNotifications } from './NotificationContext'

const VideoCallContext = createContext()

export function useVideoCall() {
    return useContext(VideoCallContext)
}

export function VideoCallProvider({ children }) {
    const [peer, setPeer] = useState(null)
    const [incomingCall, setIncomingCall] = useState(null)
    const [callState, setCallState] = useState('idle') // idle, incoming, active, ended
    const [activeCall, setActiveCall] = useState(null)
    const [remoteStream, setRemoteStream] = useState(null)
    const [localStream, setLocalStream] = useState(null)
    
    const { addNotification } = useNotifications()
    const navigate = useNavigate()
    const location = useLocation()
    const currentUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')

    // Initialize Peer when user logs in
    useEffect(() => {
        if (!currentUser || !currentUser._id) return

        const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'))
        const isLocalhost = API_BASE.includes('localhost')
        
        // We configure Peer to use our custom backend signaling server
        const peerHost = isLocalhost ? 'localhost' : (API_BASE ? API_BASE.replace('https://', '').replace('http://', '').split(':')[0] : window.location.hostname);
        
        const newPeer = new Peer(currentUser._id, {
            host: peerHost,
            port: isLocalhost ? 5001 : 443,
            path: '/api/peerjs',
            secure: !isLocalhost
        })

        newPeer.on('open', (id) => {
            console.log('✅ WebRTC Peer Connected. ID:', id)
        })

        newPeer.on('call', (call) => {
            console.log('📞 Incoming call from:', call.peer)
            // Play ringtone if needed here
            setIncomingCall(call)
            setCallState('incoming')
        })

        newPeer.on('error', (err) => {
            console.error('WebRTC Peer Error:', err)
        })

        setPeer(newPeer)

        return () => {
            newPeer.disconnect()
            newPeer.destroy()
        }
    }, [currentUser?._id])

    // Answer incoming call
    const answerCall = async () => {
        if (!incomingCall) return

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            setLocalStream(stream)
            incomingCall.answer(stream)
            setActiveCall(incomingCall)
            setCallState('active')
            
            if (location.pathname !== '/video-consultation') {
                navigate('/video-consultation')
            }

            incomingCall.on('stream', (rStream) => {
                setRemoteStream(rStream)
            })

            incomingCall.on('close', () => {
                endCall()
            })
        } catch (err) {
            console.error('Failed to get local stream', err)
            addNotification({ email: currentUser?.email }, 'Camera Error', 'Could not access camera/microphone to answer call.', 'error')
            declineCall()
        }
    }

    // Decline incoming call
    const declineCall = () => {
        if (incomingCall) {
            incomingCall.close()
        }
        setIncomingCall(null)
        setCallState('idle')
    }

    // End current call
    const endCall = () => {
        if (activeCall) {
            activeCall.close()
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop())
        }
        setLocalStream(null)
        setRemoteStream(null)
        setActiveCall(null)
        setIncomingCall(null)
        setCallState('idle')
    }

    // Make an outgoing call
    const initiateCall = async (targetId, stream) => {
        if (!peer) return null
        
        try {
            setLocalStream(stream)
            const call = peer.call(targetId, stream)
            setActiveCall(call)
            setCallState('active')

            call.on('stream', (rStream) => {
                setRemoteStream(rStream)
            })

            call.on('close', () => {
                endCall()
            })

            call.on('error', (err) => {
                console.error('Call error', err)
                endCall()
            })

            return call
        } catch (err) {
            console.error('Failed to initiate call', err)
            return null
        }
    }

    return (
        <VideoCallContext.Provider value={{
            peer,
            callState,
            incomingCall,
            activeCall,
            localStream,
            remoteStream,
            answerCall,
            declineCall,
            endCall,
            initiateCall,
            setCallState
        }}>
            {children}
            {/* Incoming Call Modal Overlay */}
            {callState === 'incoming' && incomingCall && (
                <div className="incoming-call-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 99999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="incoming-call-box" style={{
                        background: 'white', padding: '2rem', borderRadius: '24px', textAlign: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)', width: '90%', maxWidth: '400px'
                    }}>
                        <div className="ringing-animation" style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'shake 0.5s infinite' }}>📞</div>
                        <h2 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>Incoming Video Call</h2>
                        <p style={{ color: '#64748b', marginBottom: '2rem' }}>You have an incoming call regarding an appointment.</p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button onClick={declineCall} style={{
                                flex: 1, padding: '1rem', background: '#fee2e2', color: '#ef4444',
                                border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer',
                                fontSize: '1.1rem'
                            }}>Decline</button>
                            <button onClick={answerCall} style={{
                                flex: 1, padding: '1rem', background: '#dcfce7', color: '#22c55e',
                                border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer',
                                fontSize: '1.1rem'
                            }}>Accept</button>
                        </div>
                    </div>
                </div>
            )}
        </VideoCallContext.Provider>
    )
}

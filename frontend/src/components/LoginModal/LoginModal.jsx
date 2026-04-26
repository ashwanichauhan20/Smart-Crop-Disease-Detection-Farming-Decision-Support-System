import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import './LoginModal.css'

// OTP generator
function generateOTP() { return String(Math.floor(100000 + Math.random() * 900000)) }

function LoginModal({ onClose, onSuccess }) {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const overlayRef = useRef(null)

    // Modes: 'password' | 'otp' | 'forgot'
    const [mode, setMode] = useState('password')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [role, setRole] = useState('farmer') // Login role selection ('farmer', 'expert')

    // Password login
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)

    // OTP login
    const [otpMobile, setOtpMobile] = useState('')
    const [otpSent, setOtpSent] = useState(false)
    const [otpValue, setOtpValue] = useState('')
    const [generatedOtp, setGeneratedOtp] = useState('')
    const [otpTimer, setOtpTimer] = useState(0)

    // Forgot password
    const [forgotStep, setForgotStep] = useState(1)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotOtp, setForgotOtp] = useState('')
    const [forgotGenOtp, setForgotGenOtp] = useState('')
    const [newPass, setNewPass] = useState('')
    const [confirmPass, setConfirmPass] = useState('')
    const [showNewPass, setShowNewPass] = useState(false)

    // Expert pending
    const [expertPending, setExpertPending] = useState(false)
    const [pendingUser, setPendingUser] = useState(null)

    const clear = () => { setError(''); setSuccess('') }
    const switchMode = (m) => { setMode(m); clear(); setOtpSent(false); setOtpValue(''); setForgotStep(1) }

    // Close on backdrop click
    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose()
    }

    // Close on Escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handler)
            document.body.style.overflow = ''
        }
    }, [onClose])

    // ── LOGIN REDIRECT LOGIC ──
    const doRedirect = (user) => {
        if (user.role === 'expert' && !user.approved) {
            setPendingUser(user)
            setExpertPending(true)
            return
        }
        localStorage.setItem('fasalCurrentUser', JSON.stringify(user))
        sessionStorage.setItem('showWelcomeToast', 'true')
        sessionStorage.setItem('showWelcomeBanner', 'true')

        if (!sessionStorage.getItem('login_notif_' + user.email)) {
            addNotification({ email: user.email }, 'Login Successful', `Welcome back to Smart-Fasal, ${user.name || user.email}!`, 'success')
            sessionStorage.setItem('login_notif_' + user.email, 'true')
        }

        onSuccess(user)  // tell parent to update
        onClose()
        
        const path = user.role === 'admin' ? '/admin-dashboard'
            : user.role === 'expert' ? '/expert-dashboard'
                : '/farmer-dashboard'
        navigate(path)
    }

    // ── PASSWORD LOGIN ──
    const handleLogin = async (e) => {
        e.preventDefault(); clear()

        const loginEmail = email.trim().toLowerCase()

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, password })
            })
            const data = await res.json()
            if (data.success) {
                // Ensure the user role matches the selected role (Admin bypasses this check)
                if (data.user.role !== 'admin' && data.user.role !== role) {
                    setError(`Account found, but it is registered as an ${data.user.role.toUpperCase()}, not a ${role.toUpperCase()}. Please select the correct role.`)
                    return;
                }
                doRedirect(data.user)
            } else {
                setError(data.message || 'Invalid email or password.')
            }
        } catch (err) {
            setError('Server connection failed. Please try again.')
        }
    }

    // ── OTP LOGIN ──
    const sendOtp = () => {
        clear()
        if (!/^\d{10}$/.test(otpMobile)) { setError('Enter valid 10-digit mobile.'); return }
        const users = JSON.parse(localStorage.getItem('fasalUsers') || '[]')
        const matched = users.find(u => u.mobile === otpMobile)
        if (!matched) { setError('No account with this mobile. Please register.'); return }
        const otp = generateOTP()
        setGeneratedOtp(otp)
        setOtpSent(true)
        setSuccess(`✅ OTP sent! (Demo: ${otp})`)
        setOtpTimer(60)
        const iv = setInterval(() => setOtpTimer(t => { if (t <= 1) { clearInterval(iv); return 0 } return t - 1 }), 1000)
    }

    const verifyOtp = () => {
        clear()
        if (otpValue.trim() !== generatedOtp) { setError('Incorrect OTP.'); return }
        const users = JSON.parse(localStorage.getItem('fasalUsers') || '[]')
        const matched = users.find(u => u.mobile === otpMobile)
        if (!matched) { setError('Account not found.'); return }
        doRedirect(matched)
    }

    // ── FORGOT PASSWORD ──
    const sendForgotOtp = () => {
        clear()
        const targetEmail = forgotEmail.trim().toLowerCase()
        if (!targetEmail) { setError('Email required.'); return }
        const otp = generateOTP()
        setForgotGenOtp(otp)
        setSuccess(`✅ OTP sent to ${forgotEmail} (Demo: ${otp})`)
        setForgotStep(2)
    }
    const verifyForgotOtp = () => {
        clear()
        if (forgotOtp !== forgotGenOtp) { setError('Incorrect OTP.'); return }
        setForgotStep(3); setSuccess('')
    }
    const resetPassword = async () => {
        clear()
        if (newPass.length < 8) { setError('Min 8 characters.'); return }
        if (newPass !== confirmPass) { setError('Passwords do not match.'); return }
        const targetEmail = forgotEmail.trim().toLowerCase()

        try {
            const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail, newPassword: newPass })
            })
            const data = await res.json()
            if (data.success) {
                setSuccess('✅ Password reset! You can now sign in.')
                setTimeout(() => switchMode('password'), 2500)
            } else {
                setError(data.message || 'Account not found or error occurred.')
            }
        } catch (e) {
            setError('Connection error. Try again.')
        }
    }

    return (
        <div className="lm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
            <div className="lm-card">
                {/* Close btn */}
                <button className="lm-close" onClick={onClose}>✕</button>

                {/* Expert pending state */}
                {expertPending ? (
                    <div className="lm-pending">
                        <div className="lm-pending-icon">🕐</div>
                        <h3>Approval Pending</h3>
                        <p>Your Expert account is under review by the admin.</p>
                        <p className="lm-pending-email">📧 Notification will be sent to <strong>{pendingUser?.email}</strong></p>
                        <div className="lm-pending-info">⏳ Usually approved within a few hours.</div>
                        <button className="lm-submit-btn" onClick={() => {
                            localStorage.removeItem('fasalCurrentUser')
                            setExpertPending(false)
                            onClose()
                        }}>🚪 Close</button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="lm-header">
                            <div className="lm-logo">🌿 Smart-Fasal Suraksha</div>
                            <h2 className="lm-title">
                                {mode === 'password' && 'Sign In'}
                                {mode === 'otp' && '📱 OTP Login'}
                                {mode === 'forgot' && '🔑 Reset Password'}
                            </h2>
                            {mode === 'password' && (
                                <p className="lm-sub">Don't have an account? <Link to="/register" onClick={onClose}>Register</Link></p>
                            )}
                        </div>

                        {/* Mode Tabs */}
                        <div className="lm-tabs">
                            <button className={`lm-tab ${mode === 'password' ? 'active' : ''}`} onClick={() => switchMode('password')}>🔒 Password</button>
                            <button className={`lm-tab ${mode === 'otp' ? 'active' : ''}`} onClick={() => switchMode('otp')}>📱 OTP</button>
                            <button className={`lm-tab ${mode === 'forgot' ? 'active' : ''}`} onClick={() => switchMode('forgot')}>🔑 Forgot</button>
                        </div>

                        {/* Feedback */}
                        {error && <div className="lm-error">⚠️ {error}</div>}
                        {success && <div className="lm-success">{success}</div>}

                        {/* ── MODE: Password ── */}
                        {mode === 'password' && (
                            <form className="lm-form" onSubmit={handleLogin}>
                                {/* ROLE SELECTION */}
                                <div className="lm-role-selector" style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
                                    <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: '500'}}>
                                        <input type="radio" name="role" value="farmer" checked={role === 'farmer'} onChange={() => setRole('farmer')} style={{accentColor: '#2e7d32'}} /> 🌾 Farmer
                                    </label>
                                    <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: '500'}}>
                                        <input type="radio" name="role" value="expert" checked={role === 'expert'} onChange={() => setRole('expert')} style={{accentColor: '#2e7d32'}} /> 👨‍⚕️ Expert
                                    </label>
                                </div>
                                <p style={{fontSize: '11px', color: '#666', marginTop: '-15px', marginBottom: '20px'}}>*Admins can login directly via email bypass.</p>

                                <div className="lm-field">
                                    <label>Email Address</label>
                                    <div className="lm-input-wrap">
                                        <span>📧</span>
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                            placeholder="your@email.com" required autoFocus />
                                    </div>
                                </div>
                                <div className="lm-field">
                                    <label>Password</label>
                                    <div className="lm-input-wrap">
                                        <span>🔒</span>
                                        <input type={showPass ? 'text' : 'password'} value={password}
                                            onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                                        <button type="button" className="lm-eye" onClick={() => setShowPass(p => !p)}>
                                            {showPass ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <button type="button" className="lm-forgot-link" onClick={() => switchMode('forgot')}>
                                    Forgot password?
                                </button>
                                <button type="submit" className="lm-submit-btn">Sign In →</button>
                            </form>
                        )}

                        {/* ── MODE: OTP ── */}
                        {mode === 'otp' && (
                            <div className="lm-form">
                                <div className="lm-otp-info">📱 Enter your registered mobile to receive OTP</div>
                                <div className="lm-field">
                                    <label>Mobile Number</label>
                                    <div className="lm-input-wrap">
                                        <span>📱</span>
                                        <span className="lm-prefix">+91</span>
                                        <input type="tel" value={otpMobile} maxLength={10}
                                            onChange={e => setOtpMobile(e.target.value.replace(/\D/g, ''))}
                                            placeholder="98765 43210" disabled={otpSent} className="has-prefix" />
                                    </div>
                                </div>
                                {!otpSent ? (
                                    <button className="lm-submit-btn" onClick={sendOtp}>📤 Send OTP</button>
                                ) : (
                                    <>
                                        <div className="lm-field">
                                            <label>Enter OTP</label>
                                            <div className="lm-otp-boxes">
                                                {[0, 1, 2, 3, 4, 5].map(i => (
                                                    <input key={i} id={`lm-otp-${i}`} type="text" maxLength={1} className="lm-otp-box"
                                                        value={otpValue[i] || ''}
                                                        onChange={e => {
                                                            const v = e.target.value.replace(/\D/g, '')
                                                            const arr = otpValue.split('')
                                                            arr[i] = v
                                                            setOtpValue(arr.join(''))
                                                            if (v && i < 5) document.getElementById(`lm-otp-${i + 1}`)?.focus()
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Backspace' && !otpValue[i] && i > 0)
                                                                document.getElementById(`lm-otp-${i - 1}`)?.focus()
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="lm-otp-timer">
                                                {otpTimer > 0
                                                    ? <span>🕐 Resend in {otpTimer}s</span>
                                                    : <button type="button" className="lm-resend" onClick={sendOtp}>🔄 Resend</button>
                                                }
                                            </div>
                                        </div>
                                        <button className="lm-submit-btn" onClick={verifyOtp}>✅ Verify & Sign In</button>
                                        <button className="lm-back-btn" onClick={() => { setOtpSent(false); setOtpValue(''); setOtpMobile(''); clear() }}>← Change Number</button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── MODE: Forgot ── */}
                        {mode === 'forgot' && (
                            <div className="lm-form">
                                <div className="lm-forgot-steps">
                                    {['Email', 'Verify OTP', 'New Password'].map((s, i) => (
                                        <div key={s} className={`lm-fstep ${forgotStep > i ? 'done' : forgotStep === i + 1 ? 'active' : ''}`}>
                                            <span>{forgotStep > i + 1 ? '✓' : i + 1}</span> {s}
                                        </div>
                                    ))}
                                </div>

                                {forgotStep === 1 && (<>
                                    <p className="lm-hint">Enter your registered email to receive OTP.</p>
                                    <div className="lm-field">
                                        <label>Email</label>
                                        <div className="lm-input-wrap">
                                            <span>📧</span>
                                            <input type="email" value={forgotEmail}
                                                onChange={e => { setForgotEmail(e.target.value); clear() }} placeholder="your@email.com" />
                                        </div>
                                    </div>
                                    <button className="lm-submit-btn" onClick={sendForgotOtp} disabled={!forgotEmail}>📤 Send Reset OTP</button>
                                </>)}

                                {forgotStep === 2 && (<>
                                    <p className="lm-hint">Enter OTP sent to <strong>{forgotEmail}</strong></p>
                                    <div className="lm-field">
                                        <label>OTP Code</label>
                                        <div className="lm-otp-boxes">
                                            {[0, 1, 2, 3, 4, 5].map(i => (
                                                <input key={i} id={`lm-fotp-${i}`} type="text" maxLength={1} className="lm-otp-box"
                                                    value={forgotOtp[i] || ''}
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/\D/g, '')
                                                        const arr = forgotOtp.split('')
                                                        arr[i] = v
                                                        setForgotOtp(arr.join(''))
                                                        if (v && i < 5) document.getElementById(`lm-fotp-${i + 1}`)?.focus()
                                                    }}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Backspace' && !forgotOtp[i] && i > 0)
                                                            document.getElementById(`lm-fotp-${i - 1}`)?.focus()
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <button className="lm-submit-btn" onClick={verifyForgotOtp} disabled={forgotOtp.length < 6}>✅ Verify OTP</button>
                                    <button className="lm-back-btn" onClick={() => { setForgotStep(1); setForgotOtp(''); clear() }}>← Back</button>
                                </>)}

                                {forgotStep === 3 && (<>
                                    <p className="lm-hint">🎉 OTP verified! Set your new password.</p>
                                    <div className="lm-field">
                                        <label>New Password</label>
                                        <div className="lm-input-wrap">
                                            <span>🔒</span>
                                            <input type={showNewPass ? 'text' : 'password'} value={newPass}
                                                onChange={e => setNewPass(e.target.value)} placeholder="Min 8 characters" />
                                            <button type="button" className="lm-eye" onClick={() => setShowNewPass(p => !p)}>
                                                {showNewPass ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="lm-field">
                                        <label>Confirm Password</label>
                                        <div className="lm-input-wrap">
                                            <span>🔒</span>
                                            <input type="password" value={confirmPass}
                                                onChange={e => setConfirmPass(e.target.value)} placeholder="Re-enter password" />
                                        </div>
                                        {confirmPass && newPass === confirmPass && <p className="lm-match">✅ Passwords match</p>}
                                    </div>
                                    <button className="lm-submit-btn" onClick={resetPassword}>🔄 Reset Password</button>
                                </>)}

                                <button className="lm-back-btn" style={{ marginTop: '0.5rem' }} onClick={() => switchMode('password')}>← Back to Sign In</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default LoginModal

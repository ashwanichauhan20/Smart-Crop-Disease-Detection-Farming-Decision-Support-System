import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import './Login.css'

// Simulate sending OTP — in production this calls an SMS API
function generateOTP() { return String(Math.floor(100000 + Math.random() * 900000)) }

// ── HARDCODED CREDENTIALS (for demo/admin access)
const ADMIN_CREDENTIALS = [
    { email: 'ashwanikumarchauhan014@gmail.com', password: 'Ashwani@2005', name: 'Super Admin', role: 'admin' },
    { email: 'rajesh.expert@fasal.com', password: 'Expert@123', name: 'Dr. Rajesh Kumar', role: 'expert', approved: true },
]

function Login() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    // ── Modes: 'password' | 'otp' | 'forgot'
    const [mode, setMode] = useState('password')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // ── Email+Password fields
    const [form, setForm] = useState({ email: '', password: '', role: 'farmer' })
    const [showPass, setShowPass] = useState(false)

    // ── OTP Login fields
    const [otpMobile, setOtpMobile] = useState('')
    const [otpRole, setOtpRole] = useState('farmer')
    const [otpSent, setOtpSent] = useState(false)
    const [otpValue, setOtpValue] = useState('')
    const [generatedOtp, setGeneratedOtp] = useState('')
    const [otpTimer, setOtpTimer] = useState(0)
    const [otpShown, setOtpShown] = useState('') // demo: show OTP on screen

    // ── Forgot Password fields
    const [forgotStep, setForgotStep] = useState(1) // 1=enter email, 2=verify OTP, 3=new password
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotOtp, setForgotOtp] = useState('')
    const [forgotGenOtp, setForgotGenOtp] = useState('')
    const [newPass, setNewPass] = useState('')
    const [confirmPass, setConfirmPass] = useState('')
    const [showNewPass, setShowNewPass] = useState(false)

    const clearState = () => { setError(''); setSuccess('') }

    // ── Thank-you & expert-pending states
    const [showThankYou, setShowThankYou] = useState(false)
    const [loggedInUser, setLoggedInUser] = useState(null)
    const [expertPending, setExpertPending] = useState(false)

    // ─────────────────────────────────────────────────
    // EMAIL + PASSWORD LOGIN
    // ─────────────────────────────────────────────────
    const handlePasswordLogin = async (e) => {
        e.preventDefault(); setError('')

        try {
            const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password
                })
            })

            const result = await res.json()
            if (!result.success) {
                setError(result.message || 'Invalid email or password.')
                return
            }

            // Sync with local state
            localStorage.setItem('fasalToken', result.token)
            localStorage.setItem('fasalCurrentUser', JSON.stringify(result.user))
            redirect(result.user)
        } catch (err) {
            console.error('Login Error:', err)
            setError('Server connection failed. Please try again.')
        }
    }

    // ─────────────────────────────────────────────────
    // OTP LOGIN
    // ─────────────────────────────────────────────────
    const sendOtp = () => {
        clearState()
        if (!/^\d{10}$/.test(otpMobile)) { setError('Enter a valid 10-digit mobile number.'); return }
        const users = JSON.parse(localStorage.getItem('fasalUsers') || '[]')
        const matched = users.find(u => u.mobile === otpMobile)
        if (!matched) { setError('No account found with this mobile number. Please register first.'); return }

        const otp = generateOTP()
        setGeneratedOtp(otp)
        setOtpShown(otp) // demo only — in production send via SMS
        setOtpSent(true)
        setError('')
        setSuccess(`✅ OTP sent to +91 ${otpMobile} (Demo: ${otp})`)
        // countdown timer 60s
        setOtpTimer(60)
        const interval = setInterval(() => {
            setOtpTimer(t => { if (t <= 1) { clearInterval(interval); return 0 } return t - 1 })
        }, 1000)
    }

    const verifyOtpLogin = () => {
        clearState()
        if (otpValue.trim() !== generatedOtp) { setError('Incorrect OTP. Please check and try again.'); return }
        const users = JSON.parse(localStorage.getItem('fasalUsers') || '[]')
        const matched = users.find(u => u.mobile === otpMobile)
        if (!matched) { setError('Account not found.'); return }
        localStorage.setItem('fasalCurrentUser', JSON.stringify(matched))
        redirect(matched)
    }

    // ─────────────────────────────────────────────────
    // FORGOT PASSWORD
    // ─────────────────────────────────────────────────
    const sendForgotOtp = () => {
        clearState()
        const users = JSON.parse(localStorage.getItem('fasalUsers') || '[]')
        const matched = users.find(u => u.email === forgotEmail)
        if (!matched) { setError('No account found with this email address.'); return }
        const otp = generateOTP()
        setForgotGenOtp(otp)
        setSuccess(`✅ OTP sent to ${forgotEmail} (Demo OTP: ${otp})`)
        setForgotStep(2)
    }

    const verifyForgotOtp = () => {
        clearState()
        if (forgotOtp.trim() !== forgotGenOtp) { setError('Incorrect OTP. Please try again.'); return }
        setForgotStep(3)
        setSuccess('')
    }

    const resetPassword = async () => {
        clearState()
        if (newPass.length < 8) { setError('Password must be at least 8 characters.'); return }
        if (newPass !== confirmPass) { setError('Passwords do not match.'); return }
        
        try {
            const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
            const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, newPassword: newPass })
            })
            const data = await res.json()
            if (data.success) {
                setSuccess('✅ Password reset successfully! You can now sign in.')
                setTimeout(() => { 
                    setMode('password'); setForgotStep(1); setForgotEmail(''); 
                    setForgotOtp(''); setNewPass(''); setConfirmPass(''); setSuccess('') 
                }, 2500)
            } else {
                setError(data.message || 'Reset failed.')
            }
        } catch (e) {
            setError('Connection error.')
        }
    }

    const redirect = (user) => {
        const doRedirect = (u) => {
            localStorage.setItem('fasalCurrentUser', JSON.stringify(u))
            sessionStorage.setItem('showWelcomeToast', 'true')
            sessionStorage.setItem('showWelcomeBanner', 'true')

            if (!sessionStorage.getItem('login_notif_' + u.email)) {
                addNotification({ email: u.email }, 'Login Successful', `Welcome back to Smart-Fasal, ${u.name || u.email}!`, 'success')
                sessionStorage.setItem('login_notif_' + u.email, 'true')
            }

            // --- Geolocation Request ---
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((position) => {
                    localStorage.setItem('fasalUserLocation', JSON.stringify({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    }));
                }, (error) => {
                    console.log("Location access denied or unavailable.");
                });
            }

            if (u.role === 'admin') navigate('/admin-dashboard')
            else if (u.role === 'expert') navigate('/expert-dashboard')
            else navigate('/farmer-dashboard')
        }

        // Expert approval check
        if (user.role === 'expert' && !user.approved) {
            setLoggedInUser(user) // Changed from setPendingUser to setLoggedInUser
            setExpertPending(true)
            return
        }
        // Show thank-you splash
        setLoggedInUser(user)
        setShowThankYou(true)
        setTimeout(() => {
            doRedirect(user)
        }, 2800)
    }

    const switchMode = (m) => { setMode(m); setError(''); setSuccess(''); setOtpSent(false); setOtpValue(''); setForgotStep(1) }

    return (
        <>
            {/* ── THANK YOU SPLASH ───────────────────────────────── */}
            {showThankYou && (
                <div className="thankyou-overlay">
                    <div className="thankyou-card">
                        <div className="tq-check">✅</div>
                        <h2 className="tq-title">Thank You for Logging In!</h2>
                        <p className="tq-name">Welcome, <strong>{loggedInUser?.name || loggedInUser?.email}</strong> 🎉</p>
                        <p className="tq-role">{loggedInUser?.role === 'farmer' ? '🌾 Farmer' : loggedInUser?.role === 'expert' ? '👨‍⚕️ Agricultural Expert' : '🛡️ Admin'}</p>
                        <p className="tq-sub">Redirecting you to Smart-Fasal Suraksha...</p>
                        <div className="tq-bar"><div className="tq-fill" /></div>
                    </div>
                </div>
            )}

            {/* ── EXPERT APPROVAL PENDING ────────────────────────── */}
            {expertPending && (
                <div className="pending-overlay">
                    <div className="pending-card">
                        <div className="pend-icon-circle">🕐</div>
                        <h2 className="pend-title">Approval Pending</h2>
                        <p className="pend-body">
                            Your <strong>Expert</strong> account has been registered.<br />
                            Please wait for the <strong>Smart-Fasal Admin</strong> to review
                            and approve your profile before you can access the dashboard.
                        </p>
                        <div className="pend-info-box">
                            ⏳ Approval usually takes a few hours during working hours.
                        </div>
                        <p className="pend-email-hint">📧 You will be notified at <strong>{loggedInUser?.email}</strong> once approved.</p>
                        <button className="pend-logout-btn" onClick={() => {
                            localStorage.removeItem('fasalCurrentUser')
                            setExpertPending(false)
                        }}>
                            🚪 Logout
                        </button>
                    </div>
                </div>
            )}

            {/* ── MAIN LOGIN PAGE ────────────────────────────────── */}
            {!showThankYou && !expertPending && (
                <div className="auth-page">
                    {/* Left panel */}
                    <div className="auth-left">
                        <div className="auth-left-content">
                            <div className="auth-logo"><span>🌿</span><span>Smart-Fasal Suraksha</span></div>
                            <h2>Welcome back!</h2>
                            <p>Log in to access AI-powered crop disease detection, profit predictions, weather alerts, and much more.</p>
                            <div className="auth-features">
                                {['🔬 AI Disease Detection', '💰 Profit Prediction', '⛅ Weather Alerts', '🏛️ Govt Schemes'].map(f => (
                                    <div key={f} className="auth-feature-chip">{f}</div>
                                ))}
                            </div>

                        </div>
                        <div className="auth-left-bg" />
                    </div>

                    {/* Right panel */}
                    <div className="auth-right">
                        <div className="auth-form-container">
                            <div className="auth-header">
                                <h1>
                                    {mode === 'password' && 'Sign In'}
                                    {mode === 'otp' && '📱 OTP Login'}
                                    {mode === 'forgot' && '🔑 Reset Password'}
                                </h1>
                                {mode !== 'forgot' && (
                                    <p>Don't have an account? <Link to="/register">Register here</Link></p>
                                )}
                            </div>

                            {/* Mode Tabs */}
                            <div className="login-mode-tabs">
                                <button className={`lmt-btn ${mode === 'password' ? 'active' : ''}`} onClick={() => switchMode('password')}>🔒 Password</button>
                                <button className={`lmt-btn ${mode === 'otp' ? 'active' : ''}`} onClick={() => switchMode('otp')}>📱 OTP</button>
                                <button className={`lmt-btn ${mode === 'forgot' ? 'active' : ''}`} onClick={() => switchMode('forgot')}>🔑 Forgot</button>
                            </div>

                            {/* Feedback boxes */}
                            {error && <div className="auth-error-box">⚠️ {error}</div>}
                            {success && <div className="auth-success-box">{success}</div>}

                            {/* ── MODE 1: Email + Password ── */}
                            {mode === 'password' && (
                                <form className="auth-form" onSubmit={handlePasswordLogin}>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon">📧</span>
                                            <input type="email" name="email" value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                placeholder="your@email.com" required />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Password</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon">🔒</span>
                                            <input type={showPass ? 'text' : 'password'} name="password" value={form.password}
                                                onChange={e => setForm({ ...form, password: e.target.value })}
                                                placeholder="••••••••" required />
                                            <button type="button" className="pass-toggle" onClick={() => setShowPass(p => !p)}>
                                                {showPass ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="form-forgot">
                                        <button type="button" className="forgot-link-btn" onClick={() => switchMode('forgot')}>Forgot password?</button>
                                    </div>
                                    <button type="submit" className="auth-submit-btn">Sign In <span>→</span></button>
                                </form>
                            )}

                            {/* ── MODE 2: OTP Login ── */}
                            {mode === 'otp' && (
                                <div className="auth-form">
                                    <div className="otp-info-box">
                                        📱 Enter your registered mobile number to receive a 6-digit OTP
                                    </div>

                                    <div className="form-group">
                                        <label>Mobile Number</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon">📱</span>
                                            <span className="input-prefix">+91</span>
                                            <input type="tel" value={otpMobile} maxLength={10}
                                                onChange={e => { setOtpMobile(e.target.value.replace(/\D/g, '')); setError('') }}
                                                placeholder="98765 43210" className="has-prefix"
                                                disabled={otpSent} />
                                        </div>
                                    </div>

                                    {!otpSent ? (
                                        <button className="auth-submit-btn" onClick={sendOtp}>
                                            📤 Send OTP
                                        </button>
                                    ) : (
                                        <>
                                            <div className="form-group">
                                                <label>Enter OTP</label>
                                                <div className="otp-boxes">
                                                    {[0, 1, 2, 3, 4, 5].map(i => (
                                                        <input
                                                            key={i}
                                                            type="text"
                                                            maxLength={1}
                                                            className="otp-box"
                                                            value={otpValue[i] || ''}
                                                            onChange={e => {
                                                                const val = e.target.value.replace(/\D/g, '')
                                                                const arr = otpValue.split('')
                                                                arr[i] = val
                                                                setOtpValue(arr.join(''))
                                                                if (val && i < 5) {
                                                                    const next = document.getElementById(`otp-box-${i + 1}`)
                                                                    if (next) next.focus()
                                                                }
                                                            }}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Backspace' && !otpValue[i] && i > 0) {
                                                                    const prev = document.getElementById(`otp-box-${i - 1}`)
                                                                    if (prev) prev.focus()
                                                                }
                                                            }}
                                                            id={`otp-box-${i}`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="otp-timer-row">
                                                    {otpTimer > 0
                                                        ? <span className="otp-timer">🕐 Resend OTP in {otpTimer}s</span>
                                                        : <button type="button" className="resend-btn" onClick={sendOtp}>🔄 Resend OTP</button>}
                                                </div>
                                            </div>
                                            <button className="auth-submit-btn" onClick={verifyOtpLogin}>
                                                ✅ Verify & Sign In
                                            </button>
                                            <button className="change-mobile-btn" onClick={() => { setOtpSent(false); setOtpValue(''); setOtpMobile(''); clearState() }}>
                                                ← Change Number
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── MODE 3: Forgot Password ── */}
                            {mode === 'forgot' && (
                                <div className="auth-form">
                                    {/* Step indicators */}
                                    <div className="forgot-steps">
                                        {['Email', 'Verify OTP', 'New Password'].map((s, i) => (
                                            <div key={s} className={`forgot-step ${forgotStep > i ? 'done' : forgotStep === i + 1 ? 'active' : ''}`}>
                                                <span>{forgotStep > i + 1 ? '✓' : i + 1}</span> {s}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Step 1 — Enter email */}
                                    {forgotStep === 1 && (
                                        <>
                                            <p className="forgot-hint">Enter your registered email address. We'll send an OTP to verify your identity.</p>
                                            <div className="form-group">
                                                <label>Email Address</label>
                                                <div className="input-wrapper">
                                                    <span className="input-icon">📧</span>
                                                    <input type="email" value={forgotEmail}
                                                        onChange={e => { setForgotEmail(e.target.value); setError('') }}
                                                        placeholder="your@email.com" />
                                                </div>
                                            </div>
                                            <button className="auth-submit-btn" onClick={sendForgotOtp} disabled={!forgotEmail}>
                                                📤 Send Reset OTP
                                            </button>
                                        </>
                                    )}

                                    {/* Step 2 — Enter OTP */}
                                    {forgotStep === 2 && (
                                        <>
                                            <p className="forgot-hint">Enter the 6-digit OTP sent to <strong>{forgotEmail}</strong></p>
                                            <div className="form-group">
                                                <label>OTP Code</label>
                                                <div className="otp-boxes">
                                                    {[0, 1, 2, 3, 4, 5].map(i => (
                                                        <input
                                                            key={i}
                                                            id={`fotp-${i}`}
                                                            type="text"
                                                            maxLength={1}
                                                            className="otp-box"
                                                            value={forgotOtp[i] || ''}
                                                            onChange={e => {
                                                                const val = e.target.value.replace(/\D/g, '')
                                                                const arr = forgotOtp.split('')
                                                                arr[i] = val
                                                                setForgotOtp(arr.join(''))
                                                                if (val && i < 5) document.getElementById(`fotp-${i + 1}`)?.focus()
                                                            }}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Backspace' && !forgotOtp[i] && i > 0)
                                                                    document.getElementById(`fotp-${i - 1}`)?.focus()
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <button className="auth-submit-btn" onClick={verifyForgotOtp} disabled={forgotOtp.length < 6}>
                                                ✅ Verify OTP
                                            </button>
                                            <button className="change-mobile-btn" onClick={() => { setForgotStep(1); setForgotOtp(''); clearState() }}>
                                                ← Back
                                            </button>
                                        </>
                                    )}

                                    {/* Step 3 — New password */}
                                    {forgotStep === 3 && (
                                        <>
                                            <p className="forgot-hint">🎉 OTP verified! Set your new password.</p>
                                            <div className="form-group">
                                                <label>New Password</label>
                                                <div className="input-wrapper">
                                                    <span className="input-icon">🔒</span>
                                                    <input type={showNewPass ? 'text' : 'password'} value={newPass}
                                                        onChange={e => setNewPass(e.target.value)} placeholder="Min 8 characters" />
                                                    <button type="button" className="pass-toggle" onClick={() => setShowNewPass(p => !p)}>
                                                        {showNewPass ? '🙈' : '👁️'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm New Password</label>
                                                <div className="input-wrapper">
                                                    <span className="input-icon">🔒</span>
                                                    <input type="password" value={confirmPass}
                                                        onChange={e => setConfirmPass(e.target.value)} placeholder="Re-enter password" />
                                                </div>
                                                {confirmPass && newPass === confirmPass && <p className="pass-match-msg">✅ Passwords match</p>}
                                            </div>
                                            <button className="auth-submit-btn" onClick={resetPassword}>
                                                🔄 Reset Password
                                            </button>
                                        </>
                                    )}

                                    {mode === 'forgot' && (
                                        <button className="change-mobile-btn" style={{ marginTop: '0.75rem' }} onClick={() => switchMode('password')}>
                                            ← Back to Sign In
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Social login */}
                            {mode === 'password' && (
                                <>
                                    <div className="auth-divider"><span>or continue with</span></div>
                                    <div className="auth-social">
                                        <button className="social-auth-btn google-auth" onClick={() => {
                                            const dummyUser = { email: 'guest.farmer@google.com', name: 'Google Farmer', role: 'farmer', profilePic: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }
                                            redirect(dummyUser)
                                        }}>
                                            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                            Google
                                        </button>
                                        <button className="social-auth-btn facebook-auth" onClick={() => {
                                            const dummyUser = { email: 'fb.user@facebook.com', name: 'Facebook User', role: 'farmer', profilePic: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }
                                            redirect(dummyUser)
                                        }}>
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                            Facebook
                                        </button>
                                    </div>
                                </>
                            )}

                            <p className="auth-bottom-link"><Link to="/">← Back to Home</Link></p>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Login

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import { uploadToCloudinary } from '../../utils/cloudinary'
import './Register.css'

const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh',
]

const SPECIALIZATIONS = [
    '🦠 Plant Disease Management',
    '🪨 Soil Science & Fertility',
    '🐛 Pest & Insect Control',
    '🌱 Organic Farming',
    '🍎 Horticulture & Fruits',
    '🌾 Crop Breeding & Genetics',
    '💧 Irrigation & Water Management',
    '📊 Agricultural Economics',
    '🐄 Animal Husbandry',
    '🤖 Agri Technology & AI',
    '🔬 Other',
]

function passStrength(p = '') {
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return score
}

// ─── Step field maps for per-step trigger validation ───
const STEP_FIELDS = {
    1: ['fullName', 'gender', 'mobile', 'role'],
    2: ['email', 'password', 'confirmPassword'],
    3: ['qualification', 'specialization', 'experience', 'institution', 'passingYear', 'occupation', 'idProofType', 'idProof', 'docLink', 'secondaryDocLink'],   // expert only
}

function Register() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const [step, setStep] = useState(1)
    const [showPass, setShowPass] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [geoLoading, setGeoLoading] = useState(false)
    const [geoStatus, setGeoStatus] = useState('')
    const [submitError, setSubmitError] = useState('')
    const [uploadedDocName, setUploadedDocName] = useState('')
    const [docError, setDocError] = useState('')
    const [isUploadingDoc, setIsUploadingDoc] = useState(false)
    const [uploadedSecondaryName, setUploadedSecondaryName] = useState('')
    const [isUploadingSecondary, setIsUploadingSecondary] = useState(false)
    const [uploadedIdName, setUploadedIdName] = useState('')
    const [isUploadingId, setIsUploadingId] = useState(false)
    const [expertPending, setExpertPending] = useState(false)
    const [showSuccessToast, setShowSuccessToast] = useState(false)

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        trigger,
        formState: { errors },
    } = useForm({
        defaultValues: {
            fullName: '', gender: '', mobile: '', role: '',
            email: '', password: '', confirmPassword: '',
            qualification: '', specialization: '', experience: '',
            institution: '', passingYear: '', occupation: '',
            idProofType: '', idProof: '', docLink: '', secondaryDocLink: '',
            linkedinUrl: '', bio: '', consultFee: '', languages: '',
            addressLine: '', village: '', city: '', district: '',
            state: '', pincode: '', country: 'India',
            terms: false,
        },
        mode: 'onChange',
    })

    const role = watch('role')
    const password = watch('password')
    const passwordVal = watch('password')

    // Expert has 4 steps (Personal → Account → Expert → Address)
    // Farmer has 3 steps  (Personal → Account → Address)
    const isExpert = role === 'expert'
    const totalSteps = isExpert ? 4 : 3
    const addressStep = isExpert ? 4 : 3

    const steps = isExpert ? [
        { num: 1, label: 'Personal', icon: '👤' },
        { num: 2, label: 'Account', icon: '🔐' },
        { num: 3, label: 'Expert Info', icon: '🎓' },
        { num: 4, label: 'Address', icon: '📍' },
    ] : [
        { num: 1, label: 'Personal', icon: '👤' },
        { num: 2, label: 'Account', icon: '🔐' },
        { num: 3, label: 'Address', icon: '📍' },
    ]

    // ── Navigate helpers ────────────────────────────────
    const goNext = async () => {
        const fields = step === 3 && isExpert
            ? STEP_FIELDS[3]
            : STEP_FIELDS[step] || []
        const ok = await trigger(fields)
        if (ok) setStep(s => s + 1)
    }

    const goBack = () => setStep(s => s - 1)

    // ── Auto Address Detection ──────────────────────────
    const detectAddress = () => {
        if (!navigator.geolocation) { setGeoStatus('❌ Geolocation not supported.'); return }
        setGeoLoading(true); setGeoStatus('📡 Detecting your location...')
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    setGeoStatus('🗺️ Fetching address...')
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=en`,
                        { headers: { 'User-Agent': 'SmartFasalSuraksha/1.0' } }
                    )
                    const data = await res.json()
                    const a = data.address || {}
                    setValue('addressLine', [a.road, a.neighbourhood, a.suburb].filter(Boolean).join(', ') || '')
                    setValue('village', a.village || a.hamlet || a.town || '')
                    setValue('city', a.city || a.town || a.village || '')
                    setValue('district', a.county || a.district || a.state_district || '')
                    setValue('state', a.state || '')
                    setValue('pincode', a.postcode || '')
                    setValue('country', a.country || 'India')
                    setGeoStatus('✅ Address detected successfully!')
                } catch { setGeoStatus('❌ Could not fetch address. Please fill manually.') }
                finally { setGeoLoading(false) }
            },
            (err) => {
                setGeoLoading(false)
                setGeoStatus(err.code === 1
                    ? '❌ Location access denied.'
                    : '❌ Unable to detect location.')
            },
            { timeout: 10000 }
        )
    }

    // ── File Upload Handler ─────────────────────────────
    const handleFileUpload = async (e, fieldName, setUploading, setName) => {
        const file = e.target.files[0]
        setDocError('')

        if (!file) {
            setValue(fieldName, '', { shouldValidate: true })
            setName('')
            return
        }

        // Validate size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            setDocError('File size must be under 2MB')
            e.target.value = ''
            setValue(fieldName, '', { shouldValidate: true })
            setName('')
            return
        }

        try {
            setUploading(true)
            setName('Uploading...')
            const secureUrl = await uploadToCloudinary(file)
            setValue(fieldName, secureUrl, { shouldValidate: true })
            setName(file.name)
            setDocError('')
        } catch (error) {
            console.error('Upload failed:', error)
            setDocError('Failed to secure upload document.')
            e.target.value = ''
            setValue(fieldName, '', { shouldValidate: true })
            setName('')
        } finally {
            setUploading(false)
        }
    }

    // ── Submit ──────────────────────────────────────────
    const onSubmit = async (data) => {
        setSubmitError('')
        try {
            const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'))
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.fullName,
                    email: data.email,
                    password: data.password,
                    mobile: data.mobile,
                    gender: data.gender,
                    role: data.role,
                    state: data.state,
                    district: data.district,
                    city: data.city,
                    addressLine: data.addressLine,
                    village: data.village,
                    pincode: data.pincode,
                    country: data.country,
                    ...(data.role === 'expert' && {
                        qualification: data.qualification,
                        specialization: data.specialization,
                        experience: data.experience,
                        institution: data.institution,
                        passingYear: data.passingYear,
                        occupation: data.occupation,
                        idProofType: data.idProofType,
                        idProof: data.idProof,
                        docLink: data.docLink,
                        secondaryDocLink: data.secondaryDocLink,
                        linkedinUrl: data.linkedinUrl,
                        bio: data.bio,
                        consultFee: data.consultFee,
                        languages: data.languages,
                        approved: false,
                    })
                })
            })

            const result = await res.json()
            if (!result.success) {
                setSubmitError(result.message || 'Registration failed.')
                return
            }

            // Sync with local state for immediate session
            localStorage.setItem('fasalToken', result.token)
            localStorage.setItem('fasalCurrentUser', JSON.stringify(result.user))

            // Trigger welcome toast for next page
            sessionStorage.setItem('showWelcomeToast', 'true')
            sessionStorage.setItem('isNewRegistration', 'true')

            if (data.role === 'farmer') {
                addNotification({ email: data.email }, 'Welcome to Smart-Fasal! 🌱', 'Your farmer account was successfully created.', 'success')
                navigate('/farmer-dashboard')
            } else {
                addNotification({ role: 'admin' }, 'New Expert Request', `${data.fullName} has filed an application for Expert verification.`, 'info')
                addNotification({ email: data.email }, 'Application Submitted', 'Your expert application has been submitted and is pending admin approval.', 'info')
                
                setExpertPending(true)
                setShowSuccessToast(true)
                setTimeout(() => setShowSuccessToast(false), 5000)
            }
        } catch (err) {
            console.error('Registration Error:', err)
            setSubmitError('Server connection failed. Please try again.')
        }
    }

    // ── Role helper ─────────────────────────────────────
    const setRole = (val) => {
        setValue('role', val, { shouldValidate: true })
        // if role changes after step 3, reset step count safely
        if (step > (val === 'expert' ? 4 : 3)) setStep(1)
    }

    const pStrength = passStrength(passwordVal)

    return (
        <div className="reg-page">
            {/* Left panel */}
            <div className="reg-left">
                <div className="reg-left-inner">
                    <Link to="/" className="reg-logo">
                        <span>🌿</span>
                        <span>Smart-Fasal Suraksha</span>
                    </Link>
                    <h2>Join 50,000+ Farmers Using AI!</h2>
                    <p>Create your free account and start using cutting-edge AI tools designed especially for Indian farmers.</p>
                    <div className="reg-features">
                        {['✅ Free Forever Plan', '🔬 AI Crop Diagnosis', '📊 Profit Insights', '⛅ Weather Alerts', '📞 Expert Connect', '🏛️ Govt Schemes'].map(f => (
                            <div key={f} className="reg-feature-chip">{f}</div>
                        ))}
                    </div>
                </div>
                <div className="reg-left-overlay" />
            </div>

            {/* Right panel */}
            <div className="reg-right">
                <div className="reg-form-container">
                    <div className="reg-header">
                        <h1>Create Account</h1>
                        <p>Already registered? <Link to="/login">Sign In</Link></p>
                    </div>

                    {/* Step indicator */}
                    <div className="reg-steps">
                        {steps.map((s, i) => (
                            <div key={s.num} className="reg-step-wrapper">
                                <button
                                    type="button"
                                    className={`reg-step-btn ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}
                                    onClick={() => step > s.num && setStep(s.num)}
                                >
                                    {step > s.num ? '✓' : s.icon}
                                </button>
                                <span className={`reg-step-label ${step === s.num ? 'active' : ''}`}>{s.label}</span>
                                {i < steps.length - 1 && (
                                    <div className={`reg-step-line ${step > s.num ? 'done' : ''}`} />
                                )}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)}>

                        {/* ── STEP 1: Personal Info ── */}
                        {step === 1 && (
                            <div className="reg-step-content animate-fadeInUp">
                                <h3 className="reg-step-title">👤 Personal Information</h3>

                                <div className="reg-group">
                                    <label>Full Name *</label>
                                    <div className="reg-input-wrap">
                                        <span className="reg-icon">👤</span>
                                        <input
                                            placeholder="e.g. Ramesh Kumar Sharma"
                                            {...register('fullName', { required: 'Full name is required' })}
                                        />
                                    </div>
                                    {errors.fullName && <p className="reg-error">{errors.fullName.message}</p>}
                                </div>

                                <div className="reg-group">
                                    <label>Gender *</label>
                                    <div className="gender-options">
                                        {[{ val: 'male', label: '♂️ Male' }, { val: 'female', label: '♀️ Female' }, { val: 'other', label: '⚧ Other' }].map(g => (
                                            <button key={g.val} type="button"
                                                className={`gender-btn ${watch('gender') === g.val ? 'selected' : ''}`}
                                                onClick={() => setValue('gender', g.val, { shouldValidate: true })}>
                                                {g.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input type="hidden" {...register('gender', { required: 'Please select your gender' })} />
                                    {errors.gender && <p className="reg-error">{errors.gender.message}</p>}
                                </div>

                                <div className="reg-group">
                                    <label>Mobile Number *</label>
                                    <div className="reg-input-wrap">
                                        <span className="reg-icon">📱</span>
                                        <span className="reg-prefix">+91</span>
                                        <input
                                            type="tel" maxLength={10} className="has-prefix"
                                            placeholder="98765 43210"
                                            {...register('mobile', {
                                                required: 'Mobile number is required',
                                                pattern: { value: /^\d{10}$/, message: 'Enter valid 10-digit mobile number' }
                                            })}
                                        />
                                    </div>
                                    {errors.mobile && <p className="reg-error">{errors.mobile.message}</p>}
                                </div>

                                <div className="reg-group">
                                    <label>Register As *</label>
                                    <div className="role-options">
                                        {[
                                            { val: 'farmer', icon: '🌾', label: 'Farmer' },
                                            { val: 'expert', icon: '👨‍⚕️', label: 'Agricultural Expert' },
                                        ].map(r => (
                                            <button key={r.val} type="button"
                                                className={`role-btn ${role === r.val ? 'selected' : ''}`}
                                                onClick={() => setRole(r.val)}>
                                                {r.icon} {r.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="reg-admin-note">🛡️ Admin access is restricted and by invitation only.</p>
                                    <input type="hidden" {...register('role', { required: 'Please select how you are registering' })} />
                                    {errors.role && <p className="reg-error">{errors.role.message}</p>}
                                </div>

                                <button type="button" className="reg-next-btn" onClick={goNext}>
                                    Next: Account Setup →
                                </button>
                            </div>
                        )}

                        {/* ── STEP 2: Account (Email + Password) ── */}
                        {step === 2 && (
                            <div className="reg-step-content animate-fadeInUp">
                                <h3 className="reg-step-title">🔐 Account Setup</h3>

                                <div className="reg-group">
                                    <label>Email Address *</label>
                                    <div className="reg-input-wrap">
                                        <span className="reg-icon">📧</span>
                                        <input
                                            type="email" placeholder="your@email.com"
                                            {...register('email', {
                                                required: 'Email is required',
                                                pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email address' }
                                            })}
                                        />
                                    </div>
                                    {errors.email && <p className="reg-error">{errors.email.message}</p>}
                                </div>

                                <div className="reg-row">
                                    <div className="reg-group">
                                        <label>Password *</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🔒</span>
                                            <input
                                                type={showPass ? 'text' : 'password'}
                                                placeholder="Min 8 characters"
                                                {...register('password', {
                                                    required: 'Password is required',
                                                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                                                })}
                                            />
                                            <button type="button" className="toggle-pass-btn" onClick={() => setShowPass(p => !p)}>
                                                {showPass ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                        {errors.password && <p className="reg-error">{errors.password.message}</p>}
                                        {passwordVal && (
                                            <div className="pass-strength">
                                                <div className="ps-bar">
                                                    {[1, 2, 3, 4].map(n => (
                                                        <div key={n} className={`ps-seg ${pStrength >= n ? `strength-${pStrength}` : ''}`} />
                                                    ))}
                                                </div>
                                                <span className="ps-label">{['', 'Weak', 'Fair', 'Good', 'Strong'][pStrength]}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="reg-group">
                                        <label>Confirm Password *</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🔑</span>
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                placeholder="Repeat password"
                                                {...register('confirmPassword', {
                                                    required: 'Please confirm your password',
                                                    validate: v => v === password || 'Passwords do not match'
                                                })}
                                            />
                                            <button type="button" className="toggle-pass-btn" onClick={() => setShowConfirm(p => !p)}>
                                                {showConfirm ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                        {errors.confirmPassword && <p className="reg-error">{errors.confirmPassword.message}</p>}
                                        {watch('confirmPassword') && watch('confirmPassword') === passwordVal && (
                                            <p className="pass-match">✅ Passwords match</p>
                                        )}
                                    </div>
                                </div>

                                <div className="reg-nav-btns">
                                    <button type="button" className="reg-back-btn" onClick={goBack}>← Back</button>
                                    <button type="button" className="reg-next-btn" onClick={goNext}>
                                        {isExpert ? 'Next: Expert Info →' : 'Next: Address →'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 3: Expert Details (expert only) ── */}
                        {step === 3 && isExpert && (
                            <div className="reg-step-content animate-fadeInUp">
                                <h3 className="reg-step-title">🎓 Expert Qualification Details</h3>
                                <p className="expert-step-intro">Yeh details admin ko aapki profile review karne mein madad karegi. Sahi aur poori info dijiye.</p>

                                <div className="reg-group">
                                    <label>Highest Qualification *</label>
                                    <div className="reg-input-wrap">
                                        <span className="reg-icon">🎓</span>
                                        <input
                                            placeholder="e.g. M.Sc Agriculture, Ph.D Plant Pathology"
                                            {...register('qualification', { required: 'Qualification is required' })}
                                        />
                                    </div>
                                    {errors.qualification && <p className="reg-error">{errors.qualification.message}</p>}
                                </div>

                                <div className="reg-row">
                                    <div className="reg-group">
                                        <label>University / Institution *</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🏫</span>
                                            <input placeholder="e.g. GBPUAT Pantnagar" {...register('institution', { required: 'Institution is required' })} />
                                        </div>
                                        {errors.institution && <p className="reg-error">{errors.institution.message}</p>}
                                    </div>
                                    <div className="reg-group">
                                        <label>Passing Year *</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🗓️</span>
                                            <input type="number" min="1950" max={new Date().getFullYear() + 5} placeholder="e.g. 2018" {...register('passingYear', { required: 'Passing year required' })} />
                                        </div>
                                        {errors.passingYear && <p className="reg-error">{errors.passingYear.message}</p>}
                                    </div>
                                </div>

                                <div className="reg-row">
                                    <div className="reg-group">
                                        <label>Area of Specialization *</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🌿</span>
                                            <select {...register('specialization', { required: 'Please select your specialization' })}>
                                                <option value="">-- Select Specialization --</option>
                                                {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        {errors.specialization && <p className="reg-error">{errors.specialization.message}</p>}
                                    </div>
                                    <div className="reg-group">
                                        <label>Current Occupation / Organization *</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🏢</span>
                                            <input placeholder="e.g. Agronomist at KisanTech" {...register('occupation', { required: 'Occupation is required' })} />
                                        </div>
                                        {errors.occupation && <p className="reg-error">{errors.occupation.message}</p>}
                                    </div>
                                </div>

                                <div className="reg-row">
                                    <div className="reg-group">
                                        <label>Years of Experience *</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">📅</span>
                                            <input type="number" min="0" placeholder="e.g. 5"
                                                {...register('experience', { 
                                                    required: 'Enter years of experience', 
                                                    valueAsNumber: true 
                                                })} />
                                        </div>
                                        {errors.experience && <p className="reg-error">{errors.experience.message}</p>}
                                    </div>
                                    <div className="reg-group">
                                        <label>Consultation Fee (₹/hr) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>optional</span></label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">💰</span>
                                            <input type="number" min="0" placeholder="e.g. 500"
                                                {...register('consultFee')} />
                                        </div>
                                    </div>
                                </div>

                                <div className="reg-row">
                                    <div className="reg-group">
                                        <label>Languages You Consult In <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>optional</span></label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🗣️</span>
                                            <input placeholder="e.g. Hindi, English, Marathi" {...register('languages')} />
                                        </div>
                                    </div>
                                </div>

                                <div className="reg-strict-verification-card">
                                    <div className="reg-sv-title">🛡️ Strict Verification Requirements</div>
                                    <p style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '1rem', lineHeight: 1.4 }}>
                                        To maintain platform trust, experts must provide valid government ID and professional certification. This data is kept strictly confidential.
                                    </p>

                                    <div className="reg-row">
                                        <div className="reg-group">
                                            <label>ID Proof Type *</label>
                                            <div className="reg-input-wrap">
                                                <span className="reg-icon">🪪</span>
                                                <select {...register('idProofType', { required: 'Select ID type' })}>
                                                    <option value="">-- Select --</option>
                                                    <option value="Aadhar Card">Aadhar Card</option>
                                                    <option value="PAN Card">PAN Card</option>
                                                    <option value="Voter ID">Voter ID</option>
                                                    <option value="Driving License">Driving License</option>
                                                </select>
                                            </div>
                                            {errors.idProofType && <p className="reg-error">{errors.idProofType.message}</p>}
                                        </div>
                                        <div className="reg-group">
                                            <label>Upload ID Proof Image *</label>
                                            <div className="reg-input-wrap" style={{ position: 'relative', overflow: 'hidden' }}>
                                                <span className="reg-icon">📁</span>
                                                <input
                                                    type="file"
                                                    accept="image/png, image/jpeg, image/jpg, application/pdf"
                                                    onChange={(e) => handleFileUpload(e, 'idProof', setIsUploadingId, setUploadedIdName)}
                                                    style={{
                                                        opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2
                                                    }}
                                                />
                                                <input type="text" readOnly placeholder={isUploadingId ? '⏳ Uploading...' : 'Click to select ID image (Max 2MB)'} value={!isUploadingId ? uploadedIdName : ''} style={{ cursor: 'pointer', pointerEvents: 'none', background: uploadedIdName ? '#e8f5e9' : 'transparent' }} />
                                            </div>
                                            {/* Hidden input to ensure validation maps properly */}
                                            <input type="hidden" {...register('idProof', { required: 'Govt. ID Proof is required to ensure authenticity' })} />
                                            {errors.idProof && <p className="reg-error">{errors.idProof.message}</p>}
                                        </div>
                                    </div>

                                    <div className="reg-row">
                                        <div className="reg-group">
                                            <label>Highest Degree / Certificate *</label>
                                            <div className="reg-input-wrap" style={{ position: 'relative', overflow: 'hidden' }}>
                                                <span className="reg-icon">🎓</span>
                                                <input
                                                    type="file"
                                                    accept="image/png, image/jpeg, image/jpg, application/pdf"
                                                    onChange={(e) => handleFileUpload(e, 'docLink', setIsUploadingDoc, setUploadedDocName)}
                                                    style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }}
                                                />
                                                <input type="text" readOnly placeholder={isUploadingDoc ? '⏳ Uploading Document...' : 'Select Highest Cert (Max 2MB)'} value={!isUploadingDoc ? uploadedDocName : ''} style={{ cursor: 'pointer', pointerEvents: 'none', background: uploadedDocName ? '#e8f5e9' : 'transparent' }} />
                                            </div>
                                            {/* Hidden input to ensure validation maps properly */}
                                            <input type="hidden" {...register('docLink', { required: 'Please upload a valid certification document.' })} />
                                            {errors.docLink && <p className="reg-error">{errors.docLink.message}</p>}
                                        </div>
                                        <div className="reg-group">
                                            <label>Second Degree / Certificate *</label>
                                            <div className="reg-input-wrap" style={{ position: 'relative', overflow: 'hidden' }}>
                                                <span className="reg-icon">📄</span>
                                                <input
                                                    type="file"
                                                    accept="image/png, image/jpeg, image/jpg, application/pdf"
                                                    onChange={(e) => handleFileUpload(e, 'secondaryDocLink', setIsUploadingSecondary, setUploadedSecondaryName)}
                                                    style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }}
                                                />
                                                <input type="text" readOnly placeholder={isUploadingSecondary ? '⏳ Uploading Document...' : 'Select Required Secondary Cert'} value={!isUploadingSecondary ? uploadedSecondaryName : ''} style={{ cursor: 'pointer', pointerEvents: 'none', background: uploadedSecondaryName ? '#e8f5e9' : 'transparent' }} />
                                            </div>
                                            <input type="hidden" {...register('secondaryDocLink', { required: 'Min. 2 certifications required for authenticity.' })} />
                                            {errors.secondaryDocLink && <p className="reg-error">{errors.secondaryDocLink.message}</p>}
                                        </div>
                                    </div>

                                </div>

                                <div className="reg-group">
                                    <label>LinkedIn Profile URL <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>optional</span></label>
                                    <div className="reg-input-wrap">
                                        <span className="reg-icon">🔗</span>
                                        <input placeholder="https://linkedin.com/in/username" {...register('linkedinUrl')} />
                                    </div>
                                </div>

                                <div className="reg-group">
                                    <label>Brief Bio <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>optional</span></label>
                                    <textarea className="expert-bio-textarea" rows={3}
                                        placeholder="Tell farmers about your expertise and achievements..."
                                        {...register('bio')} />
                                </div>

                                <div className="expert-approval-note">
                                    🛡️ Your profile will be reviewed by the admin before you can start consulting.
                                </div>

                                <div className="reg-nav-btns">
                                    <button type="button" className="reg-back-btn" onClick={goBack}>← Back</button>
                                    <button type="button" className="reg-next-btn" onClick={goNext}>Next: Address →</button>
                                </div>
                            </div>
                        )}

                        {/* ── ADDRESS STEP (last) ── */}
                        {step === addressStep && (
                            <div className="reg-step-content animate-fadeInUp">
                                <h3 className="reg-step-title">📍 Address Information</h3>

                                <div className="auto-detect-section">
                                    <p className="auto-detect-label">📡 Auto-detect your address using GPS</p>
                                    <button type="button"
                                        className={`auto-detect-btn ${geoLoading ? 'loading' : ''}`}
                                        onClick={detectAddress} disabled={geoLoading}>
                                        {geoLoading ? <><span className="spinner-small-green" /> Detecting...</> : '📍 Detect My Location'}
                                    </button>
                                    {geoStatus && (
                                        <p className={`geo-status ${geoStatus.startsWith('✅') ? 'success' : geoStatus.startsWith('❌') ? 'error' : 'info'}`}>
                                            {geoStatus}
                                        </p>
                                    )}
                                </div>

                                <div className="reg-divider"><span>or fill manually</span></div>

                                <div className="reg-group">
                                    <label>Street / Locality / Mohalla</label>
                                    <div className="reg-input-wrap">
                                        <span className="reg-icon">🏠</span>
                                        <input placeholder="House No., Street, Mohalla"
                                            {...register('addressLine')} />
                                    </div>
                                </div>

                                <div className="reg-row">
                                    <div className="reg-group">
                                        <label>Village / Town</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🏘️</span>
                                            <input placeholder="Village / Town" {...register('village')} />
                                        </div>
                                    </div>
                                    <div className="reg-group">
                                        <label>City</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🏙️</span>
                                            <input placeholder="City" {...register('city')} />
                                        </div>
                                    </div>
                                </div>

                                <div className="reg-row">
                                    <div className="reg-group">
                                        <label>District</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🗺️</span>
                                            <input placeholder="District" {...register('district')} />
                                        </div>
                                    </div>
                                    <div className="reg-group">
                                        <label>State *</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">📍</span>
                                            <select {...register('state', { required: 'Please select your state' })}>
                                                <option value="">-- Select State --</option>
                                                {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        {errors.state && <p className="reg-error">{errors.state.message}</p>}
                                    </div>
                                </div>

                                <div className="reg-row">
                                    <div className="reg-group">
                                        <label>PIN Code</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">📮</span>
                                            <input placeholder="400001" maxLength={6} {...register('pincode')} />
                                        </div>
                                    </div>
                                    <div className="reg-group">
                                        <label>Country</label>
                                        <div className="reg-input-wrap">
                                            <span className="reg-icon">🌍</span>
                                            <input placeholder="India" {...register('country')} />
                                        </div>
                                    </div>
                                </div>

                                {/* Registration summary */}
                                <div className="reg-summary">
                                    <p className="rs-title">📋 Registration Summary</p>
                                    <div className="rs-grid">
                                        <span>Name:</span>         <span>{watch('fullName') || '—'}</span>
                                        <span>Role:</span>         <span className="rs-role">{role ? role.charAt(0).toUpperCase() + role.slice(1) : '—'}</span>
                                        <span>Email:</span>        <span>{watch('email') || '—'}</span>
                                        <span>Mobile:</span>       <span>{watch('mobile') ? `+91 ${watch('mobile')}` : '—'}</span>
                                        {isExpert && (<>
                                            <span>Qualification:</span> <span>{watch('qualification') || '—'}</span>
                                            <span>Specialization:</span> <span>{watch('specialization') || '—'}</span>
                                        </>)}
                                    </div>
                                    {isExpert && (
                                        <p className="expert-approval-tag">⏳ Will go to Admin for approval</p>
                                    )}
                                </div>

                                {/* Terms */}
                                <div className="reg-group">
                                    <div className="reg-terms">
                                        <input type="checkbox" id="terms"
                                            {...register('terms', { required: 'Please accept the terms' })} />
                                        <label htmlFor="terms">
                                            I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                                        </label>
                                    </div>
                                    {errors.terms && <p className="reg-error">{errors.terms.message}</p>}
                                </div>

                                {submitError && <p className="reg-error" style={{ marginBottom: '1rem' }}>⚠️ {submitError}</p>}

                                <div className="reg-nav-btns">
                                    <button type="button" className="reg-back-btn" onClick={goBack}>← Back</button>
                                    <button type="submit" className="reg-submit-btn">
                                        {isExpert ? '🎓 Submit for Approval' : '🚀 Create My Account'}
                                    </button>
                                </div>

                                <div className="reg-divider"><span>or sign up with</span></div>

                                <div className="social-auth-row">
                                    <button type="button" className="reg-google-btn">
                                        <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                        Google
                                    </button>
                                    <button type="button" className="reg-facebook-btn">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        Facebook
                                    </button>
                                </div>

                                <p className="reg-signin-link">
                                    Already have an account? <Link to="/login">Sign In →</Link>
                                </p>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* ── ALERTS AND OVERLAYS ── */}
            {showSuccessToast && (
                <div className="reg-toast-success">
                    <div className="reg-toast-icon">✅</div>
                    <div className="reg-toast-text">
                        <h4>Successfully Registered</h4>
                        <p>Your application was saved securely.</p>
                    </div>
                </div>
            )}

            {expertPending && (
                <div className="expert-pending-overlay">
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
                        <button className="pend-logout-btn" onClick={() => {
                            localStorage.removeItem('fasalCurrentUser')
                            setExpertPending(false)
                            navigate('/login')
                        }}>
                            🚪 Logout / Go to Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Register

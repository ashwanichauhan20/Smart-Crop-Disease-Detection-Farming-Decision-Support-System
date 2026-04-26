import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { TIME_SLOTS } from '../../data/translations'
import '../../pages/DiseaseDetection/DiseaseDetection.css'

function BookingModal({ onClose, diseaseName = 'General Consultation', initialExpert = null }) {
    const today = new Date().toISOString().split('T')[0]
    const [step, setStep] = useState(initialExpert ? 2 : 1)
    const [selectedExpert, setSelectedExpert] = useState(initialExpert)
    const [booked, setBooked] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [realExperts, setRealExperts] = useState([])

    const currentUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'

    useEffect(() => {
        const fetchExperts = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/user/all`)
                const data = await res.json()
                if (data.success) {
                    const expertsOnly = data.data.filter(u => u.role === 'expert' && u.approved)
                    setRealExperts(expertsOnly)
                }
            } catch (e) {
                console.error("Failed to fetch experts:", e)
            }
        }
        fetchExperts()
    }, [API_BASE])

    const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = useForm({
        defaultValues: {
            farmerName: currentUser?.name || currentUser?.fullName || '',
            farmerContact: '',
            selectedDate: '',
            selectedSlot: '',
            note: '',
            attachedFile: null
        }
    })

    const watchDate = watch('selectedDate')
    const watchSlot = watch('selectedSlot')
    const watchName = watch('farmerName')
    const watchContact = watch('farmerContact')
    const watchFile = watch('attachedFile')

    const handleNextToReview = async () => {
        const isValid = await trigger(['farmerName', 'farmerContact', 'selectedDate', 'selectedSlot'])
        if (isValid) setStep(3)
    }

    const onSubmit = async (data) => {
        setIsSubmitting(true)
        const appt = {
            expertId: selectedExpert.id || selectedExpert._id,
            expertName: selectedExpert.name,
            farmerId: currentUser?._id,
            farmerName: data.farmerName,
            farmerContact: data.farmerContact,
            farmerEmail: currentUser?.email || 'guest',
            date: data.selectedDate,
            slot: data.selectedSlot,
            disease: diseaseName,
            note: data.note,
            attachedFileName: data.attachedFile?.[0]?.name || null,
        }
        
        try {
            const res = await fetch(`${API_BASE}/api/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appt)
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setBooked(true)
            } else {
                alert(`Booking failed: ${data.message || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Booking failed:', error)
            alert('Booking failed due to network error.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="booking-modal">
                <button className="modal-close-btn" onClick={onClose}>✕</button>

                {booked ? (
                    <div className="booking-success">
                        <div className="bs-icon">🎉</div>
                        <h3>Request Sent!</h3>
                        <div className="bs-details">
                            <p>👨‍⚕️ <strong>{selectedExpert?.name}</strong></p>
                            <p>📅 {watchDate && new Date(watchDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p>⏰ {watchSlot}</p>
                            <p>🔬 Service: {diseaseName}</p>
                            {watchFile?.[0] && <p>📎 Attached: {watchFile[0].name}</p>}
                        </div>
                        <p className="bs-info">Your request is pending expert approval. You will be notified once they accept.</p>
                        <button className="bs-done-btn" onClick={onClose}>✅ Done</button>
                    </div>
                ) : (
                    <>
                        <div className="booking-header">
                            <h2>📅 Expert Consultation</h2>
                            <p>{step === 1 ? 'Choose an expert to consult with' : 'Fill details to book your appointment'}</p>
                            <div className="booking-steps-bar">
                                {['Select Expert', 'Fill Details', 'Confirm'].map((s, i) => (
                                    <div key={s} className={`bsb-step ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}>
                                        <span>{step > i + 1 ? '✓' : i + 1}</span> {s}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Step 1 — Expert Cards */}
                        {step === 1 && (
                            <div className="booking-body animate-fadeIn">
                                <div className="experts-grid-popup">
                                    {realExperts.length > 0 ? realExperts.map(ex => (
                                        <div key={ex._id || ex.id} className="expert-premium-card">
                                            <div className="epc-header">
                                                <span className="epc-avatar">
                                                    {ex.profilePic ? <img src={ex.profilePic} alt={ex.name} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} /> : '👨‍⚕️'}
                                                </span>
                                                <div className="epc-main-info">
                                                    <h4>{ex.name}</h4>
                                                    <p className="epc-domain">🌐 {ex.specialization || 'Agriculture Expert'}</p>
                                                </div>
                                            </div>
                                            <div className="epc-details">
                                                <p><span>💼 Exp:</span> {ex.experience || 'N/A'}</p>
                                                <p><span>⭐ Rating:</span> {ex.rating || '4.5'}</p>
                                                <p className="epc-charge"><span>💰 Charge:</span> ₹{ex.consultFee || 'Free'}</p>
                                            </div>
                                            <button 
                                                className="epc-book-btn"
                                                onClick={() => { setSelectedExpert(ex); setStep(2); }}
                                            >
                                                📅 Book Appointment
                                            </button>
                                        </div>
                                    )) : (
                                        <div style={{ textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>
                                            <p>No verified experts available at the moment.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2 — Form */}
                        {step === 2 && (
                            <form className="booking-body animate-fadeIn" onSubmit={handleSubmit(onSubmit)}>
                                <div className="booking-form-grid">
                                    <div className="form-group-full">
                                        <label>👤 Farmer Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="Enter your full name"
                                            className={errors.farmerName ? 'input-error' : ''}
                                            {...register('farmerName', { required: 'Name is required' })}
                                        />
                                        {errors.farmerName && <span className="form-error">{errors.farmerName.message}</span>}
                                    </div>
                                    <div className="form-group-full">
                                        <label>📞 Contact Number</label>
                                        <input 
                                            type="text" 
                                            placeholder="Enter mobile number"
                                            className={errors.farmerContact ? 'input-error' : ''}
                                            {...register('farmerContact', { 
                                                required: 'Contact is required',
                                                pattern: { value: /^[0-9]{10}$/, message: 'Invalid 10-digit number' }
                                            })}
                                        />
                                        {errors.farmerContact && <span className="form-error">{errors.farmerContact.message}</span>}
                                    </div>
                                    <div className="booking-date-group">
                                        <label>📅 Select Date</label>
                                        <input 
                                            type="date" 
                                            min={today}
                                            className={`booking-date-input ${errors.selectedDate ? 'input-error' : ''}`}
                                            {...register('selectedDate', { required: 'Date is required' })}
                                        />
                                        {errors.selectedDate && <span className="form-error">{errors.selectedDate.message}</span>}
                                    </div>
                                    
                                    <div className="form-group-full">
                                        <p className="booking-label">⏰ Select Time Slot</p>
                                        <div className="time-slots-grid">
                                            {TIME_SLOTS.map(slot => (
                                                <button type="button" key={slot}
                                                    className={`time-slot ${watchSlot === slot ? 'selected' : ''}`}
                                                    onClick={() => { setValue('selectedSlot', slot); trigger('selectedSlot'); }}>
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                        {errors.selectedSlot && <span className="form-error">{errors.selectedSlot.message}</span>}
                                        <input type="hidden" {...register('selectedSlot', { required: 'Please select a time slot' })} />
                                    </div>
                                    
                                    <div className="form-group-full">
                                        <label>📝 Note (Optional)</label>
                                        <textarea 
                                            className="booking-note" 
                                            rows={2} 
                                            placeholder="Briefly describe your problem..."
                                            {...register('note')}
                                        />
                                    </div>
                                    <div className="form-group-full">
                                        <label>📎 Attach Photo/Document (Optional)</label>
                                        <input 
                                            type="file" 
                                            className="booking-file-input"
                                            {...register('attachedFile')}
                                        />
                                        <p className="form-hint">Upload crop photos or relevant reports (Max 5MB)</p>
                                    </div>
                                </div>
                                <div className="booking-nav">
                                    <button type="button" className="booking-back-btn" onClick={() => setStep(1)}>← Back</button>
                                    <button 
                                        type="button"
                                        className="booking-next-btn" 
                                        onClick={handleNextToReview}
                                    >
                                        Next: Review →
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 3 — Confirm */}
                        {step === 3 && (
                            <div className="booking-body animate-fadeIn">
                                <p className="booking-label">📋 Review Details</p>
                                <div className="booking-summary">
                                    <div className="bs-row"><span>Expert</span><strong>{selectedExpert?.name}</strong></div>
                                    <div className="bs-row"><span>Charge</span><strong>₹{selectedExpert?.consultFee || 'Free'}</strong></div>
                                    <div className="bs-row"><span>Farmer</span><strong>{watchName}</strong></div>
                                    <div className="bs-row"><span>Contact</span><strong>{watchContact}</strong></div>
                                    <div className="bs-row"><span>Date</span><strong>{watchDate && new Date(watchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                                    <div className="bs-row"><span>Time</span><strong>{watchSlot}</strong></div>
                                    <div className="bs-row"><span>Subject</span><strong>{diseaseName}</strong></div>
                                    {watchFile?.[0] && <div className="bs-row"><span>Attachment</span><strong>{watchFile[0].name}</strong></div>}
                                </div>
                                <div className="booking-info-box">
                                    ℹ️ Total service charge: <strong>₹{selectedExpert?.consultFee || 'Free'}</strong>. Payment instructions will be shared after expert approval.
                                </div>
                                <div className="booking-nav">
                                    <button className="booking-back-btn" onClick={() => setStep(2)}>← Back</button>
                                    <button className="booking-confirm-btn" disabled={isSubmitting} onClick={handleSubmit(onSubmit)}>
                                        {isSubmitting ? 'Submitting...' : '✅ Submit Request'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default BookingModal

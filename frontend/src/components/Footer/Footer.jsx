import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import './Footer.css'

function Footer() {
    const location = useLocation()
    const currentUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null')
    const isRestricted = currentUser?.role === 'expert' || currentUser?.role === 'admin'

    const [feedback, setFeedback] = useState({ name: '', phone: '', message: '', rating: 0 })
    const [submitted, setSubmitted] = useState(false)
    const [hoveredStar, setHoveredStar] = useState(0)

    // Only show footer on the home page
    if (location.pathname !== '/') {
        return null;
    }

    const handleFeedbackChange = (e) => {
        setFeedback(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleStarClick = (star) => {
        setFeedback(prev => ({ ...prev, rating: star }))
    }

    const handleFeedbackSubmit = (e) => {
        e.preventDefault()
        if (!feedback.message.trim()) return;

        // Save feedback to localStorage (admin can view via AdminDashboard)
        try {
            const existing = JSON.parse(localStorage.getItem('fasalFeedbacks') || '[]')
            existing.push({
                ...feedback,
                submittedAt: new Date().toISOString(),
                userId: currentUser?._id || 'anonymous',
                userName: currentUser?.name || feedback.name || 'Anonymous Farmer'
            })
            localStorage.setItem('fasalFeedbacks', JSON.stringify(existing))
        } catch (e) {}

        setSubmitted(true)
        setTimeout(() => {
            setSubmitted(false)
            setFeedback({ name: '', phone: '', message: '', rating: 0 })
        }, 4000)
    }

    return (
        <footer className="footer">
            <div className="footer-top container">
                <div className="footer-brand">
                    <div className="footer-logo">
                        <span>🌿</span>
                        <span>Smart-Fasal Suraksha</span>
                    </div>
                    <p className="footer-tagline">
                        Detect Early. Decide Smart. Farm Profitably.
                    </p>
                    <p className="footer-desc">
                        AI-powered agriculture platform empowering Indian farmers with cutting-edge technology for better crop health, profitability, and sustainable farming.
                    </p>
                    <div className="footer-socials">
                        <a href="#" className="social-btn" aria-label="Twitter">🐦</a>
                        <a href="#" className="social-btn" aria-label="Facebook">📘</a>
                        <a href="#" className="social-btn" aria-label="Instagram">📸</a>
                        <a href="#" className="social-btn" aria-label="YouTube">▶️</a>
                    </div>
                </div>

                {!isRestricted && (
                    <>
                        <div className="footer-links-group">
                            <h4>Platform</h4>
                            <ul>
                                <li><Link to="/disease-detection">Disease Detection</Link></li>
                                <li><Link to="/profit-prediction">Profit Prediction</Link></li>
                                <li><Link to="/weather">Weather Alerts</Link></li>
                                <li><Link to="/video-consultation">Expert Consult</Link></li>
                            </ul>
                        </div>

                        <div className="footer-links-group">
                            <h4>Resources</h4>
                            <ul>
                                <li><Link to="/schemes">Govt Schemes</Link></li>
                                <li><Link to="/community">Krishi Charcha</Link></li>
                                <li><Link to="/login">Login</Link></li>
                                <li><Link to="/register">Register</Link></li>
                            </ul>
                        </div>
                    </>
                )}

                <div className="footer-links-group">
                    <h4>Contact</h4>
                    <ul>
                        <li>📍 Lucknow, Uttar Pradesh</li>
                        <li>📧 ashwanikumarchauhan014@gmail.com</li>
                        <li>📞 +91 9616129738</li>
                        <li>🕐 Mon–Sat, 9AM–6PM</li>
                    </ul>
                </div>
            </div>

            {/* ─── FARMER FEEDBACK SECTION ─────────────────────────────────────── */}
            <div className="footer-feedback-section container">
                <div className="ffb-header">
                    <div className="ffb-icon">💬</div>
                    <div className="ffb-title-group">
                        <h3>Apna Feedback Dijiye</h3>
                        <p>Aapka feedback humein aur behtar banane mein madad karta hai</p>
                    </div>
                </div>

                {submitted ? (
                    <div className="ffb-success">
                        🙏 <strong>Dhanyawaad!</strong> Aapka feedback mil gaya. Hum is par zaroor kaam karenge.
                    </div>
                ) : (
                    <form className="ffb-form" onSubmit={handleFeedbackSubmit}>
                        <div className="ffb-row">
                            <input
                                type="text"
                                name="name"
                                placeholder="Aapka naam (Name) — Optional"
                                value={feedback.name}
                                onChange={handleFeedbackChange}
                                className="ffb-input"
                            />
                            <input
                                type="tel"
                                name="phone"
                                placeholder="Mobile number — Optional"
                                value={feedback.phone}
                                onChange={handleFeedbackChange}
                                className="ffb-input"
                            />
                        </div>

                        <div className="ffb-rating-row">
                            <span className="ffb-rating-label">Rating:</span>
                            {[1, 2, 3, 4, 5].map(star => (
                                <span
                                    key={star}
                                    className={`ffb-star ${star <= (hoveredStar || feedback.rating) ? 'active' : ''}`}
                                    onMouseEnter={() => setHoveredStar(star)}
                                    onMouseLeave={() => setHoveredStar(0)}
                                    onClick={() => handleStarClick(star)}
                                >
                                    ★
                                </span>
                            ))}
                            {feedback.rating > 0 && (
                                <span className="ffb-rating-text">{['', 'Bahut Bura', 'Thoda Theek', 'Theek Hai', 'Achha', 'Bahut Achha! 🎉'][feedback.rating]}</span>
                            )}
                        </div>

                        <textarea
                            name="message"
                            placeholder="Apna feedback likhein... Site kaisi lagi? Kya improve karna chahte hain? Admin ko koi suggestion?"
                            value={feedback.message}
                            onChange={handleFeedbackChange}
                            className="ffb-textarea"
                            rows={4}
                            required
                        />

                        <button type="submit" className="ffb-submit-btn">
                            📨 Feedback Bhejein
                        </button>
                    </form>
                )}
            </div>

            <div className="footer-bottom container">
                <p>© 2025 Smart-Fasal Suraksha. Made by Ashwani Chauhan. All rights reserved.</p>
                <div className="footer-bottom-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms of Use</a>
                    <a href="#">Disclaimer</a>
                </div>
            </div>
        </footer>
    )
}

export default Footer

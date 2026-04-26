import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FeatureCard from '../../components/FeatureCard/FeatureCard'
import Footer from '../../components/Footer/Footer'
import Navbar from '../../components/Navbar/Navbar'
import './Home.css'

import { API_BASE } from '../../config'

const features = [
    {
        icon: '🔬',
        title: 'AI Disease Detection',
        description: 'Upload a photo of your crop and our AI instantly identifies diseases with high accuracy and suggests treatments.',
        color: '#2E7D32',
        link: '/disease-detection',
    },
    {
        icon: '💰',
        title: 'Profit Prediction',
        description: 'Get smart crop recommendations based on soil type, season, and market trends to maximize your profitability.',
        color: '#FFA000',
        link: '/profit-prediction',
    },
    {
        icon: '⛅',
        title: 'Weather Alerts',
        description: 'Real-time weather updates and early warnings for rain, drought, or frost to protect your harvest.',
        color: '#0288D1',
        link: '/weather',
    },
    {
        icon: '🏛️',
        title: 'Government Schemes',
        description: 'Browse all active government agricultural schemes, subsidies, and benefits directly from one place.',
        color: '#7B1FA2',
        link: '/schemes',
    },
    {
        icon: '👨‍⚕️',
        title: 'Expert Consultation',
        description: 'Connect with certified agricultural experts via live video calls for personalized farming guidance.',
        color: '#00838F',
        link: '/video-consultation',
    },
    {
        icon: '🌾',
        title: 'Community Platform',
        description: 'Join Krishi Charcha – share experiences, ask questions, and learn from a thriving farmer community.',
        color: '#E65100',
        link: '/community',
    },
    {
        icon: '🏪',
        title: 'Mandi Price Tracker',
        description: 'Track real-time prices for 280+ government mandis in UP. Get AI-powered sell/wait suggestions.',
        color: '#1a7a3c',
        link: '/mandi-prices',
    },
]

const stats = [
    { value: '50K+', label: 'Farmers Helped' },
    { value: '98%', label: 'Detection Accuracy' },
    { value: '200+', label: 'Crop Varieties' },
    { value: '500+', label: 'Expert Consultants' },
]

function Home() {
    const navigate = useNavigate()
    const [siteContent, setSiteContent] = useState({})
    const [liveWeather, setLiveWeather] = useState({ temp: 28, condition: 'Rain Expected', hasRealData: false })
    const [liveMandi, setLiveMandi] = useState({ commodity: 'Wheat (Dara)', price: '₹2,550/Qtl', hasRealData: false })

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null');
        if (user?.role === 'expert' && user?.approved) {
            navigate('/expert-dashboard');
        }

        try {
            const data = localStorage.getItem('fasalSiteContent')
            if (data) setSiteContent(JSON.parse(data))
        } catch (e) {}

        const fetchLiveStats = async (lat, lng) => {
            try {
                const wRes = await fetch(`${API_BASE}/api/weather/dashboard?lat=${lat}&lng=${lng}&crop=wheat&stage=growing`);
                const wData = await wRes.json();
                if (wData.success && wData.data && wData.data.current_weather) {
                    setLiveWeather({
                        temp: Math.round(wData.data.current_weather.temp),
                        condition: wData.data.current_weather.condition,
                        hasRealData: true
                    });
                }
            } catch (e) { console.log('Weather fetch failed, using fallback.'); }

            try {
                const mRes = await fetch(`${API_BASE}/api/mandis/nearby?lat=${lat}&lng=${lng}&radius=100`);
                const mData = await mRes.json();
                if (mData.success && mData.data && mData.data.length > 0 && mData.data[0].latestPrices?.length > 0) {
                    const priceNode = mData.data[0].latestPrices[0];
                    setLiveMandi({
                        commodity: priceNode.commodity || 'Wheat',
                        price: `₹${priceNode.modal_price}/Qtl`,
                        hasRealData: true
                    });
                }
            } catch (e) { console.log('Mandi fetch failed, using fallback.'); }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchLiveStats(pos.coords.latitude, pos.coords.longitude),
                () => fetchLiveStats(19.9975, 73.7898),
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
            );
        } else {
            fetchLiveStats(19.9975, 73.7898);
        }

    }, [navigate])

    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="main-content">

                {/* HERO SECTION */}
                <section className="hero">
                    <div className="hero-bg-shapes">
                        <div className="hero-shape shape-1" />
                        <div className="hero-shape shape-2" />
                        <div className="hero-shape shape-3" />
                    </div>
                    <div className="container hero-inner">
                        <div className="hero-content">
                            <div className="badge">✨ Made for Indian Farmers</div>
                            <h1 className="hero-title">
                                {siteContent.homeTitle || 'Smart-Fasal'}
                                <span className="hero-title-accent"> {siteContent.homeSubtitle || 'Suraksha'}</span>
                            </h1>
                            <p className="hero-tagline">
                                {siteContent.homeTagline || 'Detect Early. Decide Smart. Farm Profitably.'}
                            </p>
                            <p className="hero-desc">
                                {siteContent.homeDesc || 'AI-powered platform combining disease detection, profit prediction, weather intelligence, and expert guidance — all in one place for modern Indian farmers.'}
                            </p>
                            <div className="hero-actions">
                                <Link to="/disease-detection" className="hero-btn hero-btn-primary">
                                    <span>🔬</span> Detect Crop Disease
                                </Link>
                                <Link to="/disease-detection" className="hero-btn hero-btn-voice">
                                    <span>🎙️</span> Speak & Ask Question
                                </Link>
                                <Link to="/profit-prediction" className="hero-btn hero-btn-secondary">
                                    <span>📊</span> Predict Best Crop
                                </Link>
                            </div>
                            <div className="hero-trust">
                                <div className="trust-avatars">
                                    {['👨‍🌾', '👩‍🌾', '🧑‍🌾', '👨‍🌾'].map((emoji, i) => (
                                        <span key={i} className="trust-avatar">{emoji}</span>
                                    ))}
                                </div>
                                <p><strong>50,000+</strong> farmers trust Smart-Fasal Suraksha</p>
                            </div>
                        </div>
                        <div className="hero-visual">
                            <div className="hero-glass-container">
                                <div className="hero-card-float">
                                    <div className="hcard">
                                        <div className="hcard-icon-bg" style={{ background: '#e8f5e9' }}>
                                            <span className="hcard-icon">🌿</span>
                                        </div>
                                        <div>
                                            <p className="hcard-label">Disease Detected</p>
                                            <p className="hcard-val">Leaf Blight – <span className="text-emerald">94% confidence</span></p>
                                        </div>
                                    </div>
                                    <div className="hcard hcard-weather">
                                        <div className="hcard-icon-bg" style={{ background: '#e3f2fd' }}>
                                            <span className="hcard-icon">{liveWeather.condition.includes('Rain') || liveWeather.condition.includes('Shower') ? '🌧️' : '🌤️'}</span>
                                        </div>
                                        <div>
                                            <p className="hcard-label">Weather Today {liveWeather.hasRealData && '(Live)'}</p>
                                            <p className="hcard-val">{liveWeather.temp}°C · <span className="text-blue">{liveWeather.condition}</span></p>
                                        </div>
                                    </div>
                                    <div className="hcard hcard-profit">
                                        <div className="hcard-icon-bg" style={{ background: '#fff8e1' }}>
                                            <span className="hcard-icon">📈</span>
                                        </div>
                                        <div>
                                            <p className="hcard-label">Current Mandi Price {liveMandi.hasRealData && '(Live)'}</p>
                                            <p className="hcard-val">{liveMandi.commodity} – <span className="text-amber">{liveMandi.price}</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div className="hero-illustration">
                                    <div className="plant-anim">
                                        <span>🌱</span>
                                        <div className="plant-glow" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* STATS SECTION */}
                <section className="stats-section">
                    <div className="container stats-inner">
                        {stats.map((s) => (
                            <div key={s.label} className="stat-item">
                                <span className="stat-value">{s.value}</span>
                                <span className="stat-label">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FEATURES SECTION */}
                <section className="section features-section">
                    <div className="container">
                        <div className="text-center">
                            <div className="badge">Our Platform</div>
                            <h2 className="section-title">Everything a Farmer Needs</h2>
                            <p className="section-subtitle">
                                From AI-powered disease detection to government scheme discovery — we have all the tools to help you succeed.
                            </p>
                        </div>
                        <div className="features-grid">
                            {features.map((feat, i) => (
                                <Link to={feat.link} key={feat.title} className="feature-card-link">
                                    <FeatureCard
                                        icon={feat.icon}
                                        title={feat.title}
                                        description={feat.description}
                                        color={feat.color}
                                        delay={i * 100}
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section className="section how-section">
                    <div className="container">
                        <div className="text-center">
                            <div className="badge">Simple Process</div>
                            <h2 className="section-title">How It Works</h2>
                            <p className="section-subtitle">Get started in just 3 easy steps</p>
                        </div>
                        <div className="steps-grid">
                            {[
                                { step: '01', icon: '📸', title: 'Upload or Describe', desc: 'Take a photo of your crop or describe your problem using the voice assistant.' },
                                { step: '02', icon: '🤖', title: 'AI Analysis', desc: 'Our advanced AI analyses the image and provides instant disease diagnosis with confidence scores.' },
                                { step: '03', icon: '✅', title: 'Get Expert Advice', desc: 'Receive personalized remedies, crop recommendations, and connect with experts if needed.' },
                            ].map((s) => (
                                <div key={s.step} className="step-card">
                                    <div className="step-number">{s.step}</div>
                                    <div className="step-icon">{s.icon}</div>
                                    <h3>{s.title}</h3>
                                    <p>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* GOV LINKS & SUPPORT SECTION */}
                <section className="section gov-links-section">
                    <div className="container">
                        <div className="support-banner">
                            <div className="support-icon-wrap">
                                <span className="support-icon">📞</span>
                            </div>
                            <div className="support-text">
                                <h3>Kisan Call Center (Toll-Free)</h3>
                                <p>For any agriculture-related queries, speak to experts freely.</p>
                            </div>
                            <div className="support-number">1800-180-1551</div>
                        </div>

                        <div className="text-center" style={{ marginTop: '3rem' }}>
                            <div className="badge">Important Resources</div>
                            <h2 className="section-title">Government Schemes & Portals</h2>
                        </div>
                        <div className="gov-links-grid">
                            <a href="https://pmkisan.gov.in/" target="_blank" rel="noreferrer" className="gov-link-card">
                                <div className="gov-card-icon">🌾</div>
                                <h4>PM-KISAN Samman Nidhi</h4>
                                <p>Financial benefit of ₹6000 per year for all landholding farmers.</p>
                                <span className="gov-card-arrow">→</span>
                            </a>
                            <a href="https://enam.gov.in/" target="_blank" rel="noreferrer" className="gov-link-card">
                                <div className="gov-card-icon">⚖️</div>
                                <h4>e-NAM Portal</h4>
                                <p>National Agriculture Market for trading commodities online.</p>
                                <span className="gov-card-arrow">→</span>
                            </a>
                            <a href="https://agrimachinery.nic.in/" target="_blank" rel="noreferrer" className="gov-link-card">
                                <div className="gov-card-icon">🚜</div>
                                <h4>AgriMachinery</h4>
                                <p>Direct Benefit Transfer (DBT) on agricultural mechanization.</p>
                                <span className="gov-card-arrow">→</span>
                            </a>
                            <a href="https://soilhealth.dac.gov.in/" target="_blank" rel="noreferrer" className="gov-link-card">
                                <div className="gov-card-icon">🌱</div>
                                <h4>Soil Health Card</h4>
                                <p>Check your soil health status and get nutrient recommendations.</p>
                                <span className="gov-card-arrow">→</span>
                            </a>
                        </div>
                    </div>
                </section>

                {/* CTA BANNER */}
                <section className="cta-section">
                    <div className="container">
                        <div className="cta-inner">
                            <div className="cta-text">
                                <h2>Ready to Transform Your Farming?</h2>
                                <p>Join thousands of farmers using AI to grow smarter, reduce losses, and increase profits.</p>
                            </div>
                            <div className="cta-actions">
                                <Link to="/register" className="cta-btn cta-btn-primary">
                                    Start for Free 🚀
                                </Link>
                                <Link to="/login" className="cta-btn cta-btn-outline">
                                    Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    )
}

export default Home

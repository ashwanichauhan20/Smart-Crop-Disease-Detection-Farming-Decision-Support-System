import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../../components/Footer/Footer'
import Navbar from '../../components/Navbar/Navbar'
import '../DiseaseDetection/DiseaseDetection.css'
import './Schemes.css'

const schemes = [
    {
        id: 1,
        name: 'PM-KISAN Samman Nidhi',
        category: 'Income Support',
        description: 'Direct income support of ₹6,000 per year to all landholding farmer families.',
        eligibility: 'All landholding farmers. Land must be in farmer\'s name.',
        benefit: '₹6,000/year (3 installments)',
        deadline: 'Ongoing',
        ministry: 'Ministry of Agriculture',
        icon: '💰',
        color: '#2E7D32',
        featured: true,
        applyUrl: 'https://pmkisan.gov.in/RegistrationFormNew.aspx',
    },
    {
        id: 2,
        name: 'PM Fasal Bima Yojana',
        category: 'Crop Insurance',
        description: 'Comprehensive crop insurance against natural calamities, pest attacks and diseases.',
        eligibility: 'All farmers including sharecroppers and tenant farmers growing notified crops.',
        benefit: 'Up to ₹2 Lakh insurance coverage',
        deadline: 'Feb 28, 2025 (Rabi Season)',
        ministry: 'Ministry of Agriculture',
        icon: '🛡️',
        color: '#1565C0',
        featured: true,
        applyUrl: 'https://pmfby.gov.in/farmerRegistrationForm',
    },
    {
        id: 3,
        name: 'PM-KUSUM Scheme',
        category: 'Solar Energy',
        description: 'Solar pump installation for irrigation. Farmers can also sell surplus solar power.',
        eligibility: 'Farmer must own agricultural land. Priority to small & marginal farmers.',
        benefit: '90% subsidy on solar pump cost',
        deadline: 'Mar 31, 2025',
        ministry: 'Ministry of New & Renewable Energy',
        icon: '☀️',
        color: '#FFA000',
        featured: false,
        applyUrl: 'https://pmkusum.mnre.gov.in/farmer/',
    },
    {
        id: 4,
        name: 'Kisan Credit Card (KCC)',
        category: 'Credit',
        description: 'Short-term credit for crop cultivation, maintenance of farm assets, and allied activities.',
        eligibility: 'All farmers, sharecroppers, tenant farmers, and self-help groups.',
        benefit: 'Credit limit up to ₹3 Lakh @ 4% interest',
        deadline: 'Ongoing',
        ministry: 'Ministry of Finance',
        icon: '💳',
        color: '#7B1FA2',
        featured: false,
        applyUrl: 'https://sbi.co.in/web/agri-rural/agriculture-banking/crop-finance/kisan-credit-card',
    },
    {
        id: 5,
        name: 'National Horticulture Mission',
        category: 'Horticulture',
        description: 'Promotes holistic development of horticulture sector covering fruits, vegetables & flowers.',
        eligibility: 'Farmers engaged in horticulture activities.',
        benefit: '40-50% subsidy on infrastructure cost',
        deadline: 'Apr 15, 2025',
        ministry: 'Ministry of Agriculture',
        icon: '🌺',
        color: '#E65100',
        featured: false,
        applyUrl: 'https://nhm.nic.in/',
    },
    {
        id: 6,
        name: 'Soil Health Card Scheme',
        category: 'Soil Management',
        description: 'Free soil testing and health card with crop-wise recommendations for nutrient use.',
        eligibility: 'All farmers across India.',
        benefit: 'Free soil testing + personalized recommendations',
        deadline: 'Ongoing',
        ministry: 'Ministry of Agriculture',
        icon: '🌱',
        color: '#00838F',
        featured: false,
        applyUrl: 'https://soilhealth.dac.gov.in/',
    },
    {
        id: 7,
        name: 'e-NAM (Online Mandi)',
        category: 'Marketing',
        description: 'Pan-India electronic trading portal linking APMCs to create unified national market.',
        eligibility: 'All farmers with valid ID proof and bank account.',
        benefit: 'Access to national market prices & buyers',
        deadline: 'Ongoing',
        ministry: 'Ministry of Agriculture',
        icon: '🏪',
        color: '#2E7D32',
        featured: false,
        applyUrl: 'https://enam.gov.in/web/',
    },
    {
        id: 8,
        name: 'Agri Infrastructure Fund',
        category: 'Infrastructure',
        description: 'Financing facility for investment in post-harvest management infrastructure.',
        eligibility: 'FPOs, PACS, Agri-Entrepreneurs, Startups.',
        benefit: '3% interest subvention on loans',
        deadline: 'Mar 31, 2026',
        ministry: 'Ministry of Agriculture',
        icon: '🏭',
        color: '#1565C0',
        featured: false,
        applyUrl: 'https://agriinfra.dac.gov.in/',
    },
]

// Utility to read data from LS
const getSchemesFromLS = () => {
    const stored = localStorage.getItem('fasalSchemes')
    if (stored) {
        return JSON.parse(stored)
    }
    // Seed and return default data if empty
    localStorage.setItem('fasalSchemes', JSON.stringify(schemes))
    return schemes
}

const categories = ['All', 'Income Support', 'Crop Insurance', 'Solar Energy', 'Credit', 'Horticulture', 'Marketing', 'Subsidies']

function Schemes({ isTab = false }) {
    const navigate = useNavigate()

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null');
        if (user?.role === 'expert' && user?.approved && !isTab) {
            navigate('/expert-dashboard');
        }
    }, [navigate, isTab]);

    const [activeCategory, setActiveCategory] = useState('All')
    const [search, setSearch] = useState('')
    const [schemesList, setSchemesList] = useState(getSchemesFromLS())
    const [selectedScheme, setSelectedScheme] = useState(null)

    useEffect(() => {
        // Polling to keep Schemes synced if Admin updates them
        const interval = setInterval(() => {
            setSchemesList(getSchemesFromLS())
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    const filtered = schemesList.filter(s =>
        (activeCategory === 'All' || s.category === activeCategory) &&
        (s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className={isTab ? "dashboard-tab-content" : "page-wrapper"}>
            {!isTab && <Navbar />}
            <main className={isTab ? "tab-main" : "main-content"}>
                {!isTab && (
                    <div className="page-hero page-hero-purple">
                        <div className="container">
                            <div className="badge">🏛️ Government Programs</div>
                            <h1>Government Schemes</h1>
                            <p>Discover active government subsidies, loans, and schemes for Indian farmers</p>
                        </div>
                    </div>
                )}

                <div className="schemes-page container">

                    {/* Search & Filters */}
                    <div className="schemes-filters">
                        <div className="scheme-search-wrapper">
                            <span className="scheme-search-icon">🔍</span>
                            <input
                                className="scheme-search"
                                placeholder="Search schemes..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="category-pills">
                            {categories.map(c => (
                                <button
                                    key={c}
                                    className={`category-pill ${activeCategory === c ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(c)}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Featured schemes */}
                    <div className="featured-schemes">
                        <h3 className="schemes-section-title">⭐ Featured Schemes</h3>
                        <div className="featured-grid">
                            {filtered.filter(s => s.featured).map(s => (
                                <div key={s.id} className="scheme-featured-card clickable-card" style={{ '--sc-color': s.color }} onClick={() => setSelectedScheme(s)}>
                                    <div className="sfc-left">
                                        <div className="sfc-icon">{s.icon}</div>
                                        <div>
                                            <span className="sfc-category">{s.category}</span>
                                            <h3 className="sfc-name">{s.name}</h3>
                                            <p className="sfc-ministry">{s.ministry}</p>
                                        </div>
                                    </div>
                                    <div className="sfc-right">
                                        <div className="sfc-benefit">{s.benefit}</div>
                                        <p className="sfc-desc">{s.description}</p>
                                        <button className="sfc-apply-btn" onClick={e => { e.stopPropagation(); window.open(s.applyUrl || 'https://www.india.gov.in/', '_blank') }}>Apply Now →</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* All schemes grid */}
                    <div className="all-schemes">
                        <h3 className="schemes-section-title">📋 All Schemes ({filtered.length})</h3>
                        <div className="schemes-grid">
                            {filtered.map(s => (
                                <div key={s.id} className="scheme-card clickable-card" style={{ '--sc-color': s.color }} onClick={() => setSelectedScheme(s)}>
                                    <div className="sc-header">
                                        <div className="sc-icon">{s.icon}</div>
                                        <div>
                                            <span className="sc-category">{s.category}</span>
                                            <h3 className="sc-name">{s.name}</h3>
                                        </div>
                                    </div>
                                    <p className="sc-desc">{s.description}</p>

                                    <div className="sc-details">
                                        <div className="sc-detail-row">
                                            <span className="sc-detail-label">✅ Eligibility:</span>
                                            <span className="sc-detail-val">{s.eligibility}</span>
                                        </div>
                                        <div className="sc-detail-row">
                                            <span className="sc-detail-label">💰 Benefit:</span>
                                            <span className="sc-detail-val benefit-highlight">{s.benefit}</span>
                                        </div>
                                        <div className="sc-detail-row">
                                            <span className="sc-detail-label">📅 Deadline:</span>
                                            <span className={`sc-detail-val ${s.deadline !== 'Ongoing' ? 'deadline-warn' : 'deadline-ongoing'}`}>
                                                {s.deadline}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="sc-footer">
                                        <span className="sc-ministry">{s.ministry}</span>
                                        <button className="sc-apply-btn" onClick={e => { e.stopPropagation(); window.open(s.applyUrl || 'https://www.india.gov.in/', '_blank') }}>Apply →</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Helpline */}
                    <div className="schemes-helpline">
                        <div className="helpline-inner">
                            <div className="helpline-icon">📞</div>
                            <div>
                                <h3>Need Help Applying?</h3>
                                <p>Call Kisan Helpline: <strong>1800-180-1551</strong> (Toll Free) · Mon–Sat 6AM–10PM</p>
                            </div>
                            <button className="helpline-btn">Chat with Us 💬</button>
                        </div>
                    </div>

                    {/* MODAL OVERLAY */}
                    {selectedScheme && (
                        <div className="scheme-modal-overlay" onClick={() => setSelectedScheme(null)}>
                            <div className="scheme-modal-content animate-slideUp" onClick={e => e.stopPropagation()}>
                                <button className="sm-close" onClick={() => setSelectedScheme(null)}>✕</button>

                                <div className="sm-header" style={{ '--sc-color': selectedScheme.color }}>
                                    <div className="sm-icon-wrap">{selectedScheme.icon}</div>
                                    <div>
                                        <span className="sm-category">{selectedScheme.category}</span>
                                        <h2 className="sm-title">{selectedScheme.name}</h2>
                                    </div>
                                </div>

                                <div className="sm-body">
                                    <p className="sm-description">{selectedScheme.description}</p>

                                    <div className="sm-details-grid">
                                        <div className="sm-info-box">
                                            <h4>✅ Eligibility Focus</h4>
                                            <p>{selectedScheme.eligibility}</p>
                                        </div>
                                        <div className="sm-info-box alert-box">
                                            <h4>💰 Guaranteed Benefit</h4>
                                            <p>{selectedScheme.benefit}</p>
                                        </div>
                                        <div className="sm-info-box">
                                            <h4>📅 Current Deadline</h4>
                                            <p className={selectedScheme.deadline === 'Ongoing' ? 'ongoing' : 'warning'}>
                                                {selectedScheme.deadline}
                                            </p>
                                        </div>
                                        <div className="sm-info-box">
                                            <h4>🏛️ Affiliated Ministry</h4>
                                            <p>{selectedScheme.ministry}</p>
                                        </div>
                                    </div>

                                    <div className="sm-call-to-action">
                                        <p>Ready to leverage this government support? Apply officially through the secure central portal.</p>
                                        <button className="sm-apply-btn" onClick={() => window.open(selectedScheme.applyUrl || 'https://www.india.gov.in/', '_blank')}>Start Application Process →</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>
            {!isTab && <Footer />}
        </div>
    )
}

export default Schemes

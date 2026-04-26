import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import Footer from '../../components/Footer/Footer';
import Navbar from '../../components/Navbar/Navbar';
import { LANGUAGES, UI } from '../../data/translations';
import '../DiseaseDetection/DiseaseDetection.css';
import './ProfitPrediction.css';

// Remove the hardcoded dummy datasets as per requirement

function ProfitPrediction({ isTab = false }) {
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null');
        if (user?.role === 'expert' && user?.approved && !isTab) {
            navigate('/expert-dashboard');
        }
    }, [navigate, isTab]);

    const [soil, setSoil] = useState('Black');
    const [customSoil, setCustomSoil] = useState('');
    const [season, setSeason] = useState('Kharif');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCycleModal, setShowCycleModal] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [isOtherSoil, setIsOtherSoil] = useState(false);
    const [lang, setLang] = useState('en');
    const [preferredCategory, setPreferredCategory] = useState('All');

    // NEW STATES: CSV DATA
    const [seedData, setSeedData] = useState([]);
    const [roadmapData, setRoadmapData] = useState([]);
    const [visibleCount, setVisibleCount] = useState(5);

    const cropCategories = [
        { id: 'All', icon: '🌈' },
        { id: 'Cereals', icon: '🌾' },
        { id: 'Vegetables', icon: '🥦' },
        { id: 'Pulses', icon: '🫘' },
        { id: 'Oilseeds', icon: '🌻' },
        { id: 'Fiber Crops', icon: '👕' },
        { id: 'Fruits', icon: '🍎' },
    ];

    // Read CSVs on component mount
    useEffect(() => {
        fetch('/data/crop_seed_per_kattha_100.csv')
            .then(res => res.text())
            .then(csvText => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => setSeedData(results.data)
                });
            });

        fetch('/data/seasonal_crops_growth_roadmap.csv')
            .then(res => res.text())
            .then(csvText => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => setRoadmapData(results.data)
                });
            });
    }, []);

    const triggerPrediction = (cat = preferredCategory) => {
        setLoading(true);
        setResult(null);
        setShowCycleModal(false);
        setVisibleCount(5); // Reset expanded count

        setTimeout(() => {
            let filteredData = seedData.filter(item => {
                const matchesSeason = item.season?.toLowerCase() === season.toLowerCase();
                const actualSoil = isOtherSoil ? customSoil : soil;
                const matchesSoil = item.soil?.toLowerCase()?.includes(actualSoil.toLowerCase());

                let matchesCategory = true;
                if (cat !== 'All') {
                    matchesCategory = item.category === cat; // Since category mapping now matches directly
                }

                return matchesSeason && matchesSoil && matchesCategory;
            });

            // Sort by expected yield (descending)
            filteredData.sort((a, b) => {
                const yieldA = parseFloat(a.yield_quintal_per_bigha) || 0;
                const yieldB = parseFloat(b.yield_quintal_per_bigha) || 0;
                return yieldB - yieldA;
            });

            setResult(filteredData);
            setLoading(false);

            // Update user stats in DB (Increment crops tracked & simulated savings)
            const currentUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null');
            if (currentUser?._id && filteredData.length > 0) {
                try {
                    const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'));
                    fetch(`${API_BASE}/api/user/${currentUser._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            $inc: { 
                                'stats.cropsTracked': 1,
                                'stats.savings': Math.floor(Math.random() * 500) + 100 // Add some simulated savings
                            } 
                        })
                    });
                } catch (e) {
                    // Ignore background stat tracking errors
                }
            }
        }, 800);
    };

    const handleCategoryClick = (catId) => {
        setPreferredCategory(catId);
        triggerPrediction(catId);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        triggerPrediction();
    };

    return (
        <div className={isTab ? "dashboard-tab-content profit-prediction-page" : "page-wrapper profit-prediction-page"}>
            {!isTab && <Navbar />}
            <main className={isTab ? "tab-main" : "main-content"}>
                {!isTab && (
                    <div className="page-hero page-hero-orange">
                        <div className="container">
                            <div className="hero-top-bar">
                                <div className="badge">📊 Market Intelligence</div>
                                <div className="lang-switcher">
                                    <span className="lang-icon">🌐</span>
                                    <select
                                        value={lang}
                                        onChange={(e) => setLang(e.target.value)}
                                        className="lang-select-pill"
                                    >
                                        {LANGUAGES.map(l => (
                                            <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <h1>Crop Recommendation & Analytics</h1>
                            <p>Data-driven crop suggestions based on your soil type, season, and preferences.</p>
                        </div>
                    </div>
                )}

                <div className="disease-page container">
                    <div className="profit-grid">
                        
                        {/* FORM PANEL */}
                        <div className="detection-panel">
                            <form className="profit-form" onSubmit={handleSubmit}>
                                <div className="profit-form-group">
                                    <label>Select Soil Type</label>
                                    <div className="soil-options">
                                        {[
                                            { name: 'Black', icon: '⬛' },
                                            { name: 'Red', icon: '🟥' },
                                            { name: 'Sandy', icon: '🏜️' },
                                            { name: 'Loamy', icon: '🟫' },
                                            { name: 'Other', icon: '✍️' }
                                        ].map(s => (
                                            <button
                                                key={s.name}
                                                type="button"
                                                className={`soil-btn ${soil === s.name ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSoil(s.name);
                                                    setIsOtherSoil(s.name === 'Other');
                                                }}
                                            >
                                                <span className="soil-icon">{s.icon}</span>
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                    {isOtherSoil && (
                                        <div className="custom-input-container animate-fadeInUp">
                                            <input
                                                type="text"
                                                placeholder="Enter soil type (e.g. Clay, Peaty...)"
                                                value={customSoil}
                                                onChange={(e) => setCustomSoil(e.target.value)}
                                                className="custom-soil-input"
                                                style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #ddd', marginTop: '10px' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="profit-form-group">
                                    <label>Cultivation Season</label>
                                    <div className="season-options">
                                        {[
                                            { val: 'Kharif', icon: '🌧️', desc: 'Monsoon Crop', months: '(June - Oct)' },
                                            { val: 'Rabi', icon: '❄️', desc: 'Winter Crop', months: '(Nov - Feb)' },
                                            { val: 'Zaid', icon: '☀️', desc: 'Summer Crop', months: '(Mar - June)' },
                                        ].map(s => (
                                            <button
                                                key={s.val}
                                                type="button"
                                                className={`season-btn ${season === s.val ? 'selected' : ''}`}
                                                onClick={() => setSeason(s.val)}
                                            >
                                                <span className="season-icon">{s.icon}</span>
                                                <div className="season-text">
                                                    <span className="s-val">{s.val}</span>
                                                    <span className="s-months">{s.months}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="profit-form-group">
                                    <label>Preferred Crop Category</label>
                                    <div className="category-options-grid">
                                        {cropCategories.map(cat => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                className={`cat-btn ${preferredCategory === cat.id ? 'selected' : ''}`}
                                                onClick={() => handleCategoryClick(cat.id)}
                                            >
                                                <span className="cat-icon">{cat.icon}</span>
                                                <span className="cat-label">{cat.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="predict-btn"
                                    disabled={(!soil && !isOtherSoil) || !season || loading}
                                >
                                    {loading ? (
                                        <><span className="spinner" /> Analyzing Data...</>
                                    ) : (
                                        <>📊 Generate Recommendation</>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* RESULT PANEL */}
                        <div className="results-panel">
                            <h2 className="panel-title"><span>📈</span> Crop Recommendations</h2>

                            {!result && !loading && (
                                <div className="result-empty">
                                    <div className="result-empty-icon">🌾</div>
                                    <p>Select your soil, season, and desired category to view data-driven recommendations.</p>
                                </div>
                            )}

                            {loading && (
                                <div className="result-empty">
                                    <div style={{ fontSize: '3.5rem', animation: 'float 2s ease-in-out infinite' }}>🧠</div>
                                    <p style={{ marginTop: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Loading datasets...</p>
                                </div>
                            )}

                            {result && result.length === 0 && (
                                <div className="result-empty">
                                    <div className="result-empty-icon">🔍</div>
                                    <p>No crops found matching these criteria. Try changing the category or soil type.</p>
                                </div>
                            )}

                            {result && result.length > 0 && (
                                <div className="result-container animate-fadeInUp">
                                    <div className="recommendations-header" style={{ marginBottom: '1.5rem', marginTop: '0' }}>
                                        <h3 style={{ fontSize: '1.6rem', fontWeight: 900 }}>Top Recommendations</h3>
                                        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Showing {Math.min(visibleCount, result.length)} out of {result.length} highly suitable crops.</p>
                                    </div>

                                    <div className="recommendations-grid">
                                        {result.slice(0, visibleCount).map((crop, idx) => {
                                            const seedBigha = (parseFloat(crop.seed_per_kattha) || 0) * 20;
                                            const yieldKattha = ((parseFloat(crop.yield_quintal_per_bigha) || 0) / 20).toFixed(2);
                                            
                                            // Ensure unit formatting looks normal (e.g., removing decimal when not needed)
                                            const formattedYieldKattha = yieldKattha.endsWith('.00') ? parseInt(yieldKattha) : yieldKattha;

                                            return (
                                                <div key={idx} className="recommendation-card-premium" style={{ animationDelay: `${(idx % 5) * 0.1}s` }}>
                                                    <div className="rec-rank-badge">#{idx + 1} YIELD</div>
                                                    <div className="rec-header">
                                                        <div className="rec-icon-box">🌾</div>
                                                        <div className="rec-name-group">
                                                            {/* 1. Crop Name */}
                                                            <h3>{crop.crop}</h3>
                                                            <p style={{marginTop: '2px', color: '#666'}}>{crop.category}</p>
                                                        </div>
                                                    </div>

                                                    <div className="rec-stats">
                                                        {/* 2. Seed Required */}
                                                        <div className="rec-stat" style={{ width: '100%', marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                                                            <span className="rs-label" style={{ fontWeight: 'bold' }}>🌱 Seed Required</span>
                                                            <span className="rs-value" style={{ fontSize: '1.1rem', marginTop: '4px' }}>
                                                                {seedBigha} {crop.seed_unit} <span style={{fontSize: '0.85rem', color: '#64748b'}}>/ bigha</span>
                                                            </span>
                                                            <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                                                                * {crop.seed_per_kattha} {crop.seed_unit} / kattha
                                                            </span>
                                                        </div>
                                                        
                                                        {/* 3. Expected Yield */}
                                                        <div className="rec-stat" style={{ width: '100%', marginBottom: '12px', background: '#f0fdf4', padding: '10px', borderRadius: '8px' }}>
                                                            <span className="rs-label" style={{ fontWeight: 'bold', color: 'var(--premium-emerald)' }}>🌾 Expected Yield</span>
                                                            <span className="rs-value" style={{ fontSize: '1.1rem', color: 'var(--premium-emerald)', marginTop: '4px' }}>
                                                                {crop.yield_quintal_per_bigha} Quintals <span style={{fontSize: '0.85rem', color: '#64748b'}}>/ bigha</span>
                                                            </span>
                                                            <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                                                                * {formattedYieldKattha} Quintals / kattha
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 4. Soil Tip */}
                                                    <div className="soil-tip-section" style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', fontSize: '0.9rem', borderLeft: '4px solid var(--premium-amber)' }}>
                                                        <strong style={{ display: 'block', marginBottom: '4px', color: '#b45309' }}>🌿 Soil Tip & Advisory</strong>
                                                        {crop.notes}
                                                    </div>

                                                    <button
                                                        className="rec-action-btn"
                                                        style={{ marginTop: '1.5rem', width: '100%', padding: '12px', background: 'var(--premium-emerald)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
                                                        onClick={() => {
                                                            setSelectedCrop(crop)
                                                            setShowCycleModal(true)
                                                        }}
                                                    >
                                                        View Details →
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* View More Button */}
                                    {visibleCount < result.length && (
                                        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                                            <button 
                                                className="predict-btn" 
                                                style={{ width: 'auto', padding: '12px 30px', display: 'inline-block' }}
                                                onClick={() => setVisibleCount(p => p + 5)}
                                            >
                                                View More ▼
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PHASE 2: GROWTH LIFECYCLE ROADMAP POPUP MODAL */}
                    {showCycleModal && selectedCrop && (() => {
                        const cropRoadmap = roadmapData.find(c => c.Crop_Name === selectedCrop.crop);

                        return (
                            <div className="cycle-modal-overlay animate-fadeIn" onClick={() => setShowCycleModal(false)}>
                                <div className="cycle-modal-content dashboard-style animate-zoomIn" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%', margin: '5% auto', borderRadius: '24px', overflow: 'hidden', padding: 0 }}>
                                    <button className="modal-close-btn" style={{ position: 'absolute', top: '15px', right: '20px', zIndex: 10, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50px', padding: '8px 15px', backdropFilter: 'blur(4px)', cursor: 'pointer' }} onClick={() => setShowCycleModal(false)}>✕ Close</button>

                                    {/* Attractive Image Header */}
                                    <div style={{ height: '220px', width: '100%', backgroundImage: `url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=1000')`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}></div>
                                        <div style={{ position: 'absolute', bottom: '25px', left: '30px', color: 'white' }}>
                                            <div className="modal-badge" style={{ marginBottom: '8px', background: 'var(--premium-emerald)', border: 'none', color: 'white', padding: '4px 10px', fontSize: '0.75rem' }}>LIFECYCLE ROADMAP</div>
                                            <h2 style={{ fontSize: '2.4rem', margin: '0', fontWeight: '900', letterSpacing: '-0.02em' }}>{selectedCrop.crop}</h2>
                                        </div>
                                    </div>

                                    <div className="modal-dashboard-grid" style={{ display: 'block', padding: '25px 30px' }}>
                                        <div className="m-dash-card timeline-card full-width" style={{ padding: '0', boxShadow: 'none' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }}>
                                                <h3 style={{ fontSize: '1.4rem', margin: 0 }}>📅 Growth Stages</h3>
                                                {cropRoadmap && (
                                                    <div style={{ background: '#ecfdf5', padding: '8px 15px', borderRadius: '30px' }}>
                                                        <span style={{ fontSize: '1rem', color: '#059669', fontWeight: 'bold' }}>
                                                            ⏳ {cropRoadmap.Total_Duration_Days} days
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {!cropRoadmap && (
                                                <div style={{ padding: '20px', background: '#fef2f2', borderRadius: '12px', color: '#ef4444', textAlign: 'center', fontWeight: 'bold' }}>
                                                    ⚠️ Roadmap data not found for this crop in the dataset.
                                                </div>
                                            )}

                                            <div className="timeline-static-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                {cropRoadmap && [1, 2, 3, 4, 5, 6].map(stageNum => {
                                                    const stageName = cropRoadmap[`Stage_${stageNum}_Name`];
                                                    const stageDays = cropRoadmap[`Stage_${stageNum}_Days`];
                                                    
                                                    if (!stageName || !stageDays) return null;

                                                    return (
                                                        <div key={stageNum} className="timeline-static-item" style={{ display: 'flex', alignItems: 'flex-start', background: '#f8fafc', padding: '15px 20px', borderRadius: '12px', borderLeft: '4px solid var(--premium-emerald)' }}>
                                                            <div className="tsi-day" style={{ minWidth: '90px', fontWeight: 'bold', color: 'var(--premium-emerald)', fontSize: '1.05rem', paddingTop: '2px' }}>
                                                                {stageDays} days
                                                            </div>
                                                            <div className="tsi-content" style={{ flex: 1 }}>
                                                                <h4 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{stageNum}. {stageName}</h4>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </main >
            {!isTab && <Footer />}
        </div >
    );
}

export default ProfitPrediction;

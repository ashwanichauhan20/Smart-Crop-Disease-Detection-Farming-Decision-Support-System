import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip, YAxis } from 'recharts'
import Navbar from '../../components/Navbar/Navbar'
import '../DiseaseDetection/DiseaseDetection.css'
import './Weather.css'

const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'))

// 10 preset crop options for the 7-day farmer plan
const CROP_OPTIONS = [
    { value: 'wheat',     label: '🌾 Wheat (Gehun)',        hi: 'गेहूं' },
    { value: 'rice',      label: '🍚 Rice / Paddy (Dhaan)', hi: 'धान / चावल' },
    { value: 'cotton',    label: '🌿 Cotton (Kapas)',        hi: 'कपास' },
    { value: 'potato',    label: '🥔 Potato (Aloo)',         hi: 'आलू' },
    { value: 'sugarcane', label: '🎋 Sugarcane (Ganna)',     hi: 'गन्ना' },
    { value: 'soybean',   label: '🫘 Soybean',               hi: 'सोयाबीन' },
    { value: 'mustard',   label: '🌼 Mustard (Sarson)',      hi: 'सरसों' },
    { value: 'tomato',    label: '🍅 Tomato (Tamatar)',      hi: 'टमाटर' },
    { value: 'onion',     label: '🧅 Onion (Pyaz)',          hi: 'प्याज' },
    { value: 'maize',     label: '🌽 Maize (Makka)',         hi: 'मक्का' },
    { value: 'custom',    label: '✍️ Custom Crop (Apni Fasal)', hi: 'अपनी फसल' },
]

function Weather({ isTab = false }) {
    const navigate = useNavigate()
    
    // UI Settings
    const [crop, setCrop] = useState('wheat')
    const [stage, setStage] = useState('growing')
    const [selectedDayIndex, setSelectedDayIndex] = useState(0)
    
    // 7-Day Farmer Plan specific
    const [planCrop, setPlanCrop] = useState('wheat')
    const [customCrop, setCustomCrop] = useState('')
    const [planStage, setPlanStage] = useState('growing')
    const [planGenerated, setPlanGenerated] = useState(false)
    
    // Core Data State
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [gpsLoading, setGpsLoading] = useState(false)
    const [planLoading, setPlanLoading] = useState(false)

    const fetchWithGPS = () => {
        setGpsLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    loadDashboard(pos.coords.latitude, pos.coords.longitude, crop, stage);
                },
                (err) => {
                    console.warn(err);
                    loadDashboard(19.9975, 73.7898, crop, stage); 
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            loadDashboard(19.9975, 73.7898, crop, stage); 
        }
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null');
        if (user?.role === 'expert' && user?.approved && !isTab) {
            navigate('/expert-dashboard');
        }
        fetchWithGPS();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate, isTab]);

    const loadDashboard = async (lat, lng, currentCrop = crop, currentStage = stage) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/weather/dashboard?lat=${lat}&lng=${lng}&crop=${currentCrop}&stage=${currentStage}`);
            const json = await res.json();
            if (json.success) {
                setDashboardData(json.data);
            } else {
                setError(json.message || 'Weather data unavailable. Please try again.');
            }
        } catch (err) {
            setError("Unable to connect to server. Is the backend running?");
        } finally {
            setLoading(false);
            setGpsLoading(false);
        }
    };

    const handleApplySettings = () => {
        if (!dashboardData) return;
        const { lat, lng } = dashboardData.location;
        loadDashboard(lat, lng, crop, stage);
    };

    const handleGPS = () => {
        fetchWithGPS();
    };

    // Generate 7-day plan for selected farmer crop
    const handleGeneratePlan = () => {
        if (!dashboardData) return;
        setPlanLoading(true);
        const { lat, lng } = dashboardData.location;
        const effectiveCrop = planCrop === 'custom' ? (customCrop.trim() || 'general') : planCrop;
        
        // Re-fetch with the selected crop + stage for the plan section
        fetch(`${API_BASE}/api/weather/dashboard?lat=${lat}&lng=${lng}&crop=${effectiveCrop}&stage=${planStage}`)
            .then(r => r.json())
            .then(json => {
                if (json.success) {
                    // Merge the new farming plan into existing dashboardData
                    setDashboardData(prev => ({
                        ...prev,
                        farming_plan: json.data.farming_plan,
                        advisory: json.data.advisory,
                    }));
                    setPlanGenerated(true);
                }
            })
            .catch(() => {})
            .finally(() => setPlanLoading(false));
    };

    const getShortDayRow = (dateStr, i) => {
        if (i === 0) return 'Today';
        return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short' });
    };

    const getRainEmoji = (prob) => {
        if (prob > 70) return '🌧️ Heavy Rain';
        if (prob > 40) return '🌦️ Likely Rain';
        if (prob > 20) return '⛅ Chance Rain';
        return '☀️ Clear';
    };

    if (loading && !dashboardData) {
        return <div className="weather-loading"><div className="spinner"></div><p>Loading smart weather...</p></div>;
    }

    if (!dashboardData) {
        return (
            <div className="weather-loading">
                <div style={{fontSize:'3rem'}}>⚠️</div>
                <p style={{color:'#ef4444', fontWeight:700, marginTop:'1rem'}}>{error}</p>
                <button onClick={handleGPS} style={{marginTop:'1rem', padding:'0.8rem 2rem', background:'#0284c7', color:'white', border:'none', borderRadius:'12px', cursor:'pointer', fontWeight:700}}>
                    🔄 Try Again
                </button>
            </div>
        );
    }

    const { current_weather, risk_level, advisory, forecast, hourly_forecast, location, farming_plan } = dashboardData;
    
    const cropImpacts = advisory?.cropImpact || [];
    const expertAdvice = advisory?.expertAdvice || advisory?.recommendations || [];
    const actionPlan = advisory?.actionPlan || [];

    const isToday = selectedDayIndex === 0;
    const activeForecast = forecast[selectedDayIndex] || {};
    
    const displayTemp = isToday ? Math.round(current_weather.temp) : Math.round(activeForecast.temp_max);
    const displayCondition = isToday ? current_weather.condition : activeForecast.desc;
    const displayRainProb = isToday ? current_weather.rain_prob : activeForecast.rain_prob;

    let weatherTheme = 'sunny';
    const condCheck = displayCondition.toLowerCase();
    if (condCheck.includes('rain') || condCheck.includes('drizzle') || condCheck.includes('shower') || condCheck.includes('thunder')) {
        weatherTheme = 'rainy';
    } else if (condCheck.includes('cloud') || condCheck.includes('overcast') || condCheck.includes('fog')) {
        weatherTheme = 'cloudy';
    }

    const summarySentence = `${displayCondition}. Expected High of ${Math.round(activeForecast.temp_max || current_weather.temp)}°C. Rain Prob: ${displayRainProb}%.`;

    const activeHourly = hourly_forecast 
        ? hourly_forecast.slice(selectedDayIndex * 24, (selectedDayIndex + 1) * 24).filter((_, i) => i % 3 === 0)
        : [];

    const effectivePlanCropLabel = planCrop === 'custom'
        ? (customCrop.trim() || 'Your Crop')
        : CROP_OPTIONS.find(c => c.value === planCrop)?.hi || planCrop;

    return (
        <div style={{height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            {!isTab && <Navbar />}

            <div className="snap-container">
                
                {/* ---------- SECTION 1: GOOGLE STYLE WEATHER CARD ---------- */}
                <div className="snap-section">
                    
                    <div className={`snap-content-wrapper g-weather-card theme-${weatherTheme}`}>
                        
                        <div className="gw-header">
                            <div className="gw-location" style={{display:'flex', justifyContent:'space-between'}}>
                                <span>📍 {location.city} ({Number(location.lat).toFixed(2)}, {Number(location.lng).toFixed(2)})</span>
                                <button onClick={handleGPS} disabled={gpsLoading} style={{background:'none', border:'none', cursor:'pointer', color:'#0284c7', fontSize:'0.9rem', fontWeight:'600'}}>
                                    {gpsLoading ? '⏳ Syncing...' : '⟳ Refresh Live Data'}
                                </button>
                            </div>
                            <div className="gw-temp-container">
                                <div className="gw-temp">{displayTemp}°</div>
                                <div className="gw-unit">C / F</div>
                            </div>
                            <div className="gw-summary">
                                {summarySentence}
                            </div>
                        </div>

                        {/* Ribbon */}
                        <div className="gw-ribbon-container">
                            {forecast && forecast.map((f, i) => (
                                <div 
                                    key={i} 
                                    className={`gw-day-card ${selectedDayIndex === i ? 'active' : ''}`}
                                    onClick={() => setSelectedDayIndex(i)}
                                >
                                    <div className="gw-d-name">{getShortDayRow(f.date, i)}</div>
                                    <div className="gw-d-icon">{f.rain_prob > 50 ? '🌧️' : f.rain_prob > 25 ? '⛅' : '☀️'}</div>
                                    <div className="gw-d-high">{Math.round(f.temp_max)}°</div>
                                    <div className="gw-d-low">{Math.round(f.temp_min)}°</div>
                                </div>
                            ))}
                        </div>

                        {/* Graph */}
                        <div className="gw-chart-header">
                            <span>Temperature</span>
                        </div>
                        <div style={{width: '100%', height: 180, marginTop: '20px'}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={activeHourly} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                    <XAxis 
                                        dataKey="time" 
                                        tickFormatter={v => new Date(v).toLocaleTimeString([], {hour:'numeric'})} 
                                        tick={{fill: '#64748b', fontSize: 12}}
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <YAxis hide={true} domain={['dataMin - 1', 'dataMax + 1']}/>
                                    <Tooltip 
                                        labelFormatter={l => new Date(l).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        formatter={(val) => [`${Math.round(val)}°C`, "Temp"]}
                                    />
                                    <Line type="monotone" dataKey="temp" stroke={weatherTheme === 'sunny' ? '#eab308' : weatherTheme === 'rainy' ? '#38bdf8' : '#94a3b8'} strokeWidth={4} dot={{r: 5, fill: '#fff', stroke: weatherTheme === 'sunny' ? '#eab308' : weatherTheme === 'rainy' ? '#38bdf8' : '#94a3b8', strokeWidth: 2}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="scroll-down-hint">
                        Scroll for Smart Advisory
                        <span>↓</span>
                    </div>
                </div>

                {/* ---------- SECTION 2: EXPERT ADVISORY ---------- */}
                <div className="snap-section">
                    <div className="snap-content-wrapper">
                        
                        <div className="setup-row">
                            <button className="btn-action" onClick={handleGPS} disabled={gpsLoading} style={{display:'flex', alignItems:'center', gap:'5px', background: 'transparent', color: '#0284c7', border: '1px solid #0284c7'}}>
                                📍 {gpsLoading ? 'Locating...' : 'Update Route Location'}
                            </button>
                            <span style={{color: '#94a3b8'}}>|</span>
                            <select value={crop} onChange={e => setCrop(e.target.value)}>
                                <option value="wheat">Wheat</option>
                                <option value="rice">Rice (Paddy)</option>
                                <option value="potato">Potato</option>
                                <option value="cotton">Cotton</option>
                                <option value="sugarcane">Sugarcane</option>
                                <option value="mustard">Mustard</option>
                                <option value="tomato">Tomato</option>
                                <option value="onion">Onion</option>
                                <option value="maize">Maize</option>
                                <option value="soybean">Soybean</option>
                            </select>
                            <select value={stage} onChange={e => setStage(e.target.value)}>
                                <option value="sowing">Sowing</option>
                                <option value="growing">Growing</option>
                                <option value="harvest">Harvest</option>
                            </select>
                            <button className="btn-action" onClick={handleApplySettings}>Run Smart Advisory</button>
                        </div>

                        {error && <div style={{color:'red', marginBottom:'15px'}}>{error}</div>}

                        <h2 style={{color: '#1e293b', marginBottom: '20px'}}>Smart Advisory Engine</h2>
                        
                        <div className="expert-advisory-box">
                            <div className="expert-header">
                                <div className="eh-crop">🎯 {(advisory?.crop || crop).toUpperCase()} ({advisory?.stage || stage})</div>
                                <div className={`eh-risk risk-${risk_level.toLowerCase()}`}>
                                    Risk Level: {risk_level}
                                </div>
                            </div>
                            <div className="expert-content">
                                <div className="ec-section">
                                    <h5>🌾 Crop Impact Analysis</h5>
                                    <ul>{cropImpacts.map((e,i)=><li key={i}>{e}</li>)}</ul>
                                </div>
                                <div className="ec-section">
                                    <h5>👨‍🌾 Expert Advice</h5>
                                    <ul>{expertAdvice.map((e,i)=><li key={i}>{e}</li>)}</ul>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ---------- SECTION 3: 7-DAY FARMER PLAN ---------- */}
                <div className="snap-section">
                    <div className="snap-content-wrapper">
                        <h2 style={{color: '#1e293b', marginBottom: '8px'}}>📅 7-Day Farmer Schedule</h2>
                        <p style={{color:'#64748b', marginBottom:'20px', fontSize:'0.95rem'}}>Apni fasal aur stage choose karo, weather ke hisab se 7 din ka schedule milega</p>

                        {/* Crop Selector Panel */}
                        <div className="farmer-plan-selector">
                            <div className="fps-row">
                                <div className="fps-group">
                                    <label className="fps-label">🌱 Apni Fasal Chuniye</label>
                                    <div className="fps-crop-grid">
                                        {CROP_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                className={`fps-crop-btn ${planCrop === opt.value ? 'active' : ''}`}
                                                onClick={() => { setPlanCrop(opt.value); setPlanGenerated(false); }}
                                            >
                                                <span className="fps-crop-hi">{opt.hi}</span>
                                                <span className="fps-crop-en">{opt.label.split(' ')[0]} {opt.label.split(' ')[1]}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {planCrop === 'custom' && (
                                        <input
                                            type="text"
                                            className="fps-custom-input"
                                            placeholder="Apni fasal ka naam likhein... (e.g. Arhar, Bajra)"
                                            value={customCrop}
                                            onChange={e => setCustomCrop(e.target.value)}
                                        />
                                    )}
                                </div>
                                <div className="fps-group fps-stage-group">
                                    <label className="fps-label">📋 Fasal Ki Stage</label>
                                    <div className="fps-stage-btns">
                                        {[
                                            { val: 'sowing', icon: '🌱', label: 'Sowing / Buwai' },
                                            { val: 'growing', icon: '🌿', label: 'Growing / Ugaav' },
                                            { val: 'harvest', icon: '✂️', label: 'Harvest / Katai' },
                                        ].map(s => (
                                            <button
                                                key={s.val}
                                                className={`fps-stage-btn ${planStage === s.val ? 'active' : ''}`}
                                                onClick={() => { setPlanStage(s.val); setPlanGenerated(false); }}
                                            >
                                                {s.icon} {s.label}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        className="fps-generate-btn"
                                        onClick={handleGeneratePlan}
                                        disabled={planLoading || (planCrop === 'custom' && !customCrop.trim())}
                                    >
                                        {planLoading ? '⏳ Generating...' : '📊 7-Din Ka Schedule Banao'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* 7-Day plan display */}
                        {planGenerated && (
                            <div className="plan-generated-badge">
                                ✅ Schedule for <strong>{effectivePlanCropLabel}</strong> ({planStage}) — Weather-based
                            </div>
                        )}

                        <div className="timeline-list" style={{marginTop:'1rem'}}>
                            {actionPlan && actionPlan.length > 0 && (
                                <div className="timeline-day" style={{borderLeft: '4px solid #f59e0b', background: '#fffbeb'}}>
                                    <div className="timeline-date">
                                        <div className="td-day">🚨 Turant Karein</div>
                                        <div className="td-weather" style={{color: '#b45309'}}>Critical actions</div>
                                    </div>
                                    <div className="timeline-action-card">
                                        {actionPlan.map((p,i)=><p style={{marginBottom:'5px'}} key={i}><strong>{p.time}:</strong> {p.action}</p>)}
                                    </div>
                                </div>
                            )}

                            {(farming_plan || []).map((dayPlan, i) => {
                                const forecastData = forecast[i] || {};
                                const rain = forecastData.rain_prob || 0;
                                return (
                                <div key={i} className={`timeline-day ${rain > 60 ? 'rain-day' : ''}`}>
                                    <div className="timeline-date">
                                        <div className="td-day">Din {dayPlan.day} {i === 0 ? '(Aaj)' : ''}</div>
                                        <div className="td-weather">
                                            {getRainEmoji(rain)}<br/>
                                            {Math.round(forecastData.temp_max || 0)}°/{Math.round(forecastData.temp_min || 0)}°C
                                        </div>
                                    </div>
                                    <div className="timeline-action-card">
                                        <div className="tl-crop-tag">{planGenerated ? effectivePlanCropLabel : (advisory?.crop || crop)}</div>
                                        <p>{dayPlan.action}</p>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Weather

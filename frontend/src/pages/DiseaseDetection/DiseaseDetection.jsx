import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../../components/Footer/Footer'
import Navbar from '../../components/Navbar/Navbar'
import { DISEASE_TRANSLATIONS, EXPERTS, LANGUAGES, TIME_SLOTS, UI } from '../../data/translations'
import BookingModal from '../../components/BookingModal/BookingModal'
import { jsPDF } from 'jspdf'
import './DiseaseDetection.css'

const diseaseDB = [
    { name: 'Powdery Mildew', confidence: 94, severity: 'Moderate', color: '#FFA000', crop: 'Wheat' },
    { name: 'Leaf Blight', confidence: 87, severity: 'High', color: '#e53935', crop: 'Tomato' },
    { name: 'Rust Disease', confidence: 78, severity: 'Moderate', color: '#FFA000', crop: 'Soybean' },
]

// ── Appointment Booking Modal ────────────────────────────
// BookingModal extracted to shared component


// ── Main Component ───────────────────────────────────────
function DiseaseDetection({ isTab = false }) {
    const navigate = useNavigate()

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null');
        if (user?.role === 'expert' && user?.approved && !isTab) {
            navigate('/expert-dashboard');
        }
    }, [navigate, isTab]);

    const [inputMode, setInputMode] = useState('upload')
    const [preview, setPreview] = useState(null)
    const [imageFile, setImageFile] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [lang, setLang] = useState('en')
    const [showBooking, setShowBooking] = useState(false)

    // Camera
    const [cameraActive, setCameraActive] = useState(false)
    const [cameraError, setCameraError] = useState('')
    const [captured, setCaptured] = useState(false)
    const [facingMode, setFacingMode] = useState('environment')

    const fileRef = useRef()
    const videoRef = useRef()
    const canvasRef = useRef()
    const streamRef = useRef(null)

    const t = UI[lang] || UI.en
    const tResult = result ? (DISEASE_TRANSLATIONS[result.name]?.[lang] || DISEASE_TRANSLATIONS[result.name]?.en) : null

    const displayResult = result ? {
        name: tResult?.name || result.name,
        causes: tResult?.causes || "Environmental factors / Unknown pathogen",
        remedy: tResult?.remedy || "Consult local agricultural extension for specific regional treatments.",
        chemical: result.pesticide || tResult?.chemical || "None Recommended",
        organic: result.organic || tResult?.organic || "None Recommended",
        nutrient: result.nutrient || "Balanced Nutrition",
        fertilizer: result.fertilizer || "Organic Compost",
        dosage: result.dosage || "As per soil health",
        prevention: tResult?.prevention || "Maintain good field hygiene and monitor crop regularily."
    } : null

    const handleFile = file => {
        if (!file) return
        setImageFile(file); setPreview(URL.createObjectURL(file)); setResult(null); setCaptured(false)
    }
    const handleDrop = e => {
        e.preventDefault(); setIsDragging(false)
        const f = e.dataTransfer.files[0]
        if (f && f.type.startsWith('image/')) handleFile(f)
    }

    const startCamera = useCallback(async () => {
        setCameraError(''); setCaptured(false); setPreview(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false })
            streamRef.current = stream
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
            setCameraActive(true)
        } catch (err) {
            setCameraError(err.name === 'NotAllowedError' ? '❌ Camera permission denied.' : err.name === 'NotFoundError' ? '❌ No camera found.' : `❌ ${err.message}`)
        }
    }, [facingMode])

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null; setCameraActive(false)
    }, [])

    const capturePhoto = () => {
        const cv = canvasRef.current; const vd = videoRef.current
        cv.width = vd.videoWidth; cv.height = vd.videoHeight
        cv.getContext('2d').drawImage(vd, 0, 0)
        cv.toBlob(blob => {
            setImageFile(new File([blob], 'capture.jpg', { type: 'image/jpeg' }))
            setPreview(cv.toDataURL('image/jpeg')); setCaptured(true); setResult(null); stopCamera()
        }, 'image/jpeg', 0.95)
    }

    useEffect(() => { if (inputMode === 'camera' && !captured) startCamera() }, [facingMode]) // eslint-disable-line
    useEffect(() => { if (inputMode !== 'camera') stopCamera() }, [inputMode, stopCamera])
    useEffect(() => () => stopCamera(), [stopCamera])

    const handleAnalyze = async () => {
        if (!imageFile && !preview) return
        setLoading(true)
        
        try {
            const formData = new FormData();
            if (imageFile) {
                formData.append('image', imageFile);
            } else if (preview) {
                const response = await fetch(preview);
                const blob = await response.blob();
                formData.append('image', blob, 'capture.jpg');
            }

            const res = await fetch('http://localhost:5002/predict', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Analysis failed. Is the AI server running?');
            
            const data = await res.json();
            
            // Map the backend response to the frontend's result state
            let extractedCrop = data.disease.match(/\(([^)]+)\)/)?.[1]
            if (extractedCrop) {
                // Formatting specific crop names for better UI
                extractedCrop = extractedCrop.trim()
            } else {
                extractedCrop = 'General'
            }

            setResult({
                name: data.disease,
                confidence: data.confidence.replace('%', ''),
                severity: data.disease.toLowerCase().includes('healthy') ? 'None' : 'Moderate',
                color: data.disease.toLowerCase().includes('healthy') ? '#4CAF50' : '#FFA000',
                crop: extractedCrop,
                pesticide: data.pesticide,
                organic: data.organic,
                nutrient: data.nutrient,
                fertilizer: data.fertilizer,
                dosage: data.dosage
            });

            // Update user stats
            const currentUser = JSON.parse(localStorage.getItem('fasalCurrentUser') || 'null');
            if (currentUser?._id) {
                try {
                    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';
                    await fetch(`${API_BASE}/api/user/${currentUser._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ $inc: { 'stats.detections': 1 } })
                    });
                } catch (e) {
                    console.error("Failed to update detection stats:", e);
                }
            }
        } catch (err) {
            console.error(err);
            alert("⚠️ AI Service Offline: Make sure to run 'python ai_app.py' in the backend folder.");
        } finally {
            setLoading(false);
        }
    }

    const handleDownloadReport = () => {
        if (!result || !displayResult) return;
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setTextColor(40, 167, 69);
        doc.text("Crop Health Diagnostic Report", 105, 20, { align: "center" });
        
        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);
        
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(`Detected: ${displayResult.name}`, 20, 40);
        doc.text(`Confidence: ${result.confidence}%`, 20, 50);
        doc.text(`Crop: ${result.crop}`, 20, 60);
        doc.text(`Severity: ${result.severity}`, 20, 70);
        
        doc.setFontSize(14);
        doc.text("Causes:", 20, 85);
        doc.setFontSize(11);
        doc.text(doc.splitTextToSize(displayResult.causes, 170), 20, 92);
        
        doc.setFontSize(14);
        doc.text("Recommendations:", 20, 115);
        doc.setFontSize(11);
        doc.text("Chemical:", 20, 122);
        doc.text(doc.splitTextToSize(displayResult.chemical, 160), 30, 127);
        doc.text("Organic:", 20, 145);
        doc.text(doc.splitTextToSize(displayResult.organic, 160), 30, 150);
        
        doc.text("Prevention:", 20, 170);
        doc.text(doc.splitTextToSize(displayResult.prevention, 170), 20, 175);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Smart Crop AI - ${new Date().toLocaleString()}`, 105, 280, { align: "center" });
        
        doc.save(`Disease_Report_${result.crop}.pdf`);
    };

    const handleReset = () => {
        setImageFile(null); setPreview(null); setResult(null); setCaptured(false); setLang('en')
        if (inputMode === 'camera') startCamera()
    }

    const switchMode = mode => {
        setInputMode(mode); setPreview(null); setImageFile(null); setResult(null); setCaptured(false)
    }

    return (
        <div className={isTab ? "dashboard-tab-content" : "page-wrapper"}>
            {!isTab && <Navbar />}
            <main className={isTab ? "tab-main" : "main-content"}>
                {!isTab && (
                    <div className="page-hero lab-hero">
                        <div className="lab-glow-top" />
                        <div className="container">
                            <div className="lab-badge">
                                <span className="pulse-dot" /> 📡 LIVE DIAGNOSTIC LAB
                            </div>
                            <h1 className="lab-title">Crop Disease <span className="text-gradient">Diagnostic Center</span></h1>
                            <p className="lab-subtitle">Advanced Computer Vision system trained on 200+ crop varieties and 500,000+ leaf patterns.</p>
                        </div>
                    </div>
                )}

                <div className="disease-page container">
                    <div className="detection-grid">
                        {/* ── Upload / Camera Panel ── */}
                        <div className="detection-panel">
                            <div className="input-mode-tabs">
                                <button className={`mode-tab ${inputMode === 'upload' ? 'active' : ''}`} onClick={() => switchMode('upload')}>📁 Upload Image</button>
                                <button className={`mode-tab ${inputMode === 'camera' ? 'active' : ''}`} onClick={() => switchMode('camera')}>📷 Use Camera</button>
                            </div>

                            {inputMode === 'upload' && (
                                <>
                                    <div className={`upload-zone ${isDragging ? 'dragging' : ''} ${preview ? 'has-preview' : ''}`}
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => !preview && fileRef.current.click()}>
                                        {preview
                                            ? <img src={preview} alt="preview" className="upload-preview" />
                                            : <div className="upload-placeholder">
                                                <div className="upload-icon">🌿</div>
                                                <p className="upload-main-text">Drag &amp; Drop your crop photo here</p>
                                                <p className="upload-sub-text">or click to browse from device</p>
                                                <p className="upload-formats">JPG · PNG · WEBP · Max 10 MB</p>
                                            </div>}
                                        <input ref={fileRef} type="file" accept="image/*" className="file-input-hidden" onChange={e => handleFile(e.target.files[0])} />
                                    </div>
                                    {preview && (
                                        <div className="upload-actions">
                                            <button className="change-image-btn" onClick={() => fileRef.current.click()}>🔄 Change</button>
                                            <button className="analyze-btn" onClick={handleAnalyze} disabled={loading}>
                                                {loading ? <><span className="spinner" /> Analyzing...</> : <>🔬 Analyze Disease</>}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {inputMode === 'camera' && (
                                <div className="camera-section">
                                    {cameraError && <div className="camera-error">{cameraError} <button className="retry-camera-btn" onClick={startCamera}>Retry</button></div>}
                                    {captured && preview && (
                                        <div className="captured-preview-wrapper">
                                            <img src={preview} alt="captured" className="upload-preview" />
                                            <div className="captured-label">📸 Photo Captured</div>
                                        </div>
                                    )}
                                    {!captured && (
                                        <div className="camera-viewfinder">
                                            <video ref={videoRef} className={`camera-video ${cameraActive ? 'active' : ''}`} autoPlay playsInline muted />
                                            <canvas ref={canvasRef} className="camera-canvas-hidden" />
                                            {cameraActive && (<>
                                                <div className="camera-frame-corner tl" /><div className="camera-frame-corner tr" />
                                                <div className="camera-frame-corner bl" /><div className="camera-frame-corner br" />
                                                <div className="camera-target-label">🌱 Point at the affected crop leaf</div>
                                            </>)}
                                            {!cameraActive && !cameraError && (
                                                <div className="camera-start-prompt"><div className="camera-big-icon">📷</div><p>Click to start camera</p></div>
                                            )}
                                        </div>
                                    )}
                                    <div className="camera-controls">
                                        {!cameraActive && !captured && !cameraError && <button className="cam-btn cam-btn-start" onClick={startCamera}>📷 Start Camera</button>}
                                        {cameraActive && <>
                                            <button className="cam-btn cam-btn-flip" onClick={() => { stopCamera(); setFacingMode(f => f === 'environment' ? 'user' : 'environment') }}>🔄 Flip</button>
                                            <button className="cam-btn cam-btn-capture" onClick={capturePhoto}>⚪</button>
                                            <button className="cam-btn cam-btn-stop" onClick={stopCamera}>✕</button>
                                        </>}
                                        {captured && <>
                                            <button className="cam-btn cam-btn-retake" onClick={() => { setCaptured(false); startCamera() }}>🔄 Retake</button>
                                            <button className="cam-btn cam-btn-analyze" onClick={handleAnalyze} disabled={loading}>
                                                {loading ? <><span className="spinner" /> Analyzing...</> : <>🔬 Analyze Disease</>}
                                            </button>
                                        </>}
                                    </div>
                                </div>
                            )}

                            <div className="upload-tips">
                                <h4>📌 Tips for Best Results</h4>
                                <ul>
                                    <li>✅ Close-up photo of affected leaf</li>
                                    <li>✅ Use natural daylight</li>
                                    <li>✅ Include both healthy &amp; diseased areas</li>
                                    <li>❌ Avoid blurry or dark photos</li>
                                </ul>
                            </div>
                        </div>

                        {/* ── Results Panel ── */}
                        <div className="results-panel">
                            <div className="results-panel-header">
                                <h2 className="panel-title">🧾 Analysis Result</h2>
                                {result && (
                                    <div className="lang-selector-wrap">
                                        <label>{t.translateResult}:</label>
                                        <select value={lang} onChange={e => setLang(e.target.value)} className="lang-select">
                                            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {!result && !loading && (
                                <div className="result-empty">
                                    <div className="result-empty-icon">🌿</div>
                                    <p>{inputMode === 'upload' ? 'Upload a crop image and click Analyze Disease' : 'Capture a photo and click Analyze Disease'}</p>
                                    <div className="ai-badge-row">
                                        <span className="ai-badge">🤖 CNN ResNet-50</span>
                                        <span className="ai-badge">📊 94% Accuracy</span>
                                        <span className="ai-badge">🌿 200+ Diseases</span>
                                    </div>
                                </div>
                            )}

                            {loading && (
                                <div className="analyzing-state">
                                    <div className="analyzing-animation">
                                        <div className="scan-line" />
                                        {preview && <img src={preview} alt="analyzing" className="analyzing-img" />}
                                    </div>
                                    <p className="analyzing-text">🤖 AI is analyzing your crop image...</p>
                                    <div className="analyzing-steps">
                                        {['Preprocessing image pixels...', 'Running CNN classifier (ResNet-50)...', 'Matching disease database...', 'Generating treatment report...'].map((s, i) => (
                                            <div key={i} className="analyzing-step">
                                                <span className="analyzing-dot" style={{ animationDelay: `${i * 0.4}s` }} />{s}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result && displayResult && (
                                <div className="result-content animate-fadeInUp">
                                    <div className="disease-result-card" style={{ '--result-color': result.color }}>
                                        <div className="disease-result-header">
                                            <div>
                                                <p className="disease-result-label">{t.detectedDisease}</p>
                                                <h3 className="disease-result-name">{displayResult.name}</h3>
                                                <p className="disease-cause">{displayResult.causes}</p>
                                            </div>
                                            <div className="confidence-circle">
                                                <span className="confidence-val">{result.confidence}%</span>
                                                <span className="confidence-label">{t.confidence}</span>
                                            </div>
                                        </div>
                                        <div className="disease-result-meta">
                                            <span className={`severity-badge sev-${result.severity.toLowerCase()}`}>⚡ {result.severity} {t.severity}</span>
                                            <span className="disease-result-crop">🌾 {t.crop}: {result.crop}</span>
                                            <span className="ai-model-tag">🤖 CNN Model</span>
                                        </div>
                                    </div>

                                    <div className="remedy-card">
                                        <h4>{t.treatment}</h4>
                                        <p className="remedy-text">{displayResult.remedy}</p>
                                        <div className="remedy-tabs">
                                            <div className="remedy-option">
                                                <span className="remedy-type chemical">{t.chemical}</span>
                                                <p>{displayResult.chemical}</p>
                                            </div>
                                            <div className="remedy-option">
                                                <span className="remedy-type organic">{t.organic}</span>
                                                <p>{displayResult.organic}</p>
                                            </div>
                                        </div>

                                        <div className="nutrition-box animate-fadeIn">
                                            <h5 style={{ color: '#4CAF50', marginTop: '15px' }}>🥗 Nutrient &amp; Fertilizer Support</h5>
                                            <div className="nutrition-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                                <div className="nut-item" style={{ padding: '10px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '12px', opacity: 0.8 }}>Missing Nutrient</span>
                                                    <p style={{ fontWeight: 'bold' }}>{displayResult.nutrient}</p>
                                                </div>
                                                <div className="nut-item" style={{ padding: '10px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '12px', opacity: 0.8 }}>Fertilizer Source</span>
                                                    <p style={{ fontWeight: 'bold' }}>{displayResult.fertilizer}</p>
                                                </div>
                                            </div>
                                            <div className="dosage-item" style={{ marginTop: '10px', padding: '10px', background: 'rgba(255, 160, 0, 0.1)', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '12px', opacity: 0.8 }}>Recommended Dosage</span>
                                                <p style={{ fontWeight: 'bold' }}>{displayResult.dosage}</p>
                                            </div>
                                        </div>
                                        <div className="prevention-box">
                                            <h5>{t.prevention}</h5>
                                            <p>{displayResult.prevention}</p>
                                        </div>
                                    </div>

                                    <div className="result-actions">
                                        <button className="result-action-btn primary" onClick={handleDownloadReport}>{t.downloadReport}</button>
                                        <button className="result-action-btn secondary" onClick={() => setShowBooking(true)}>{t.bookExpert}</button>
                                        <button className="result-action-btn ghost" onClick={handleReset}>{t.newScan}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="detection-steps">
                        <h3>How AI Disease Detection Works</h3>
                        <div className="detection-steps-grid">
                            {[
                                { icon: '📸', step: '1', title: 'Upload / Capture', desc: 'Upload or take a live camera photo of the affected crop' },
                                { icon: '🤖', step: '2', title: 'CNN AI Analysis', desc: 'ResNet-50 deep learning scans 200+ disease patterns' },
                                { icon: '📋', step: '3', title: 'Get Diagnosis', desc: 'Receive disease name, confidence score, and severity' },
                                { icon: '💊', step: '4', title: 'Treatment Plan', desc: 'Chemical & organic remedy in your language' },
                            ].map(s => (
                                <div key={s.step} className="ds-step">
                                    <div className="ds-step-num">{s.step}</div>
                                    <div className="ds-step-icon">{s.icon}</div>
                                    <h4>{s.title}</h4>
                                    <p>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            {!isTab && <Footer />}

            {showBooking && <BookingModal onClose={() => setShowBooking(false)} diseaseName={result?.name || 'Unknown'} />}
        </div>
    )
}

export default DiseaseDetection

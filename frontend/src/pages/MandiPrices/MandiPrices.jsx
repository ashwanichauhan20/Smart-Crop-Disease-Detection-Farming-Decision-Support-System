import { useState, useEffect, useCallback } from 'react'
import './MandiPrices.css'

const API_BASE = import.meta.env.VITE_MANDI_API || 'http://localhost:5001/api/mandis'

// ─── Predefined city coordinates for manual input fallback ───────────────────
const CITY_COORDS = {
  'nashik': { lat: 19.9975, lng: 73.7898 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'amritsar': { lat: 31.6340, lng: 74.8723 },
  'ludhiana': { lat: 30.9010, lng: 75.8573 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'aurangabad': { lat: 19.8762, lng: 75.3433 },
  'solapur': { lat: 17.6868, lng: 75.9064 },
  'hisar': { lat: 29.1492, lng: 75.7217 },
  'karnal': { lat: 29.6858, lng: 76.9905 },
  'ballia': { lat: 25.7613, lng: 84.1484 },
}

function TrendBadge({ trend, suggestion, confidence }) {
  const icon = trend === 'rising' ? '📈' : trend === 'falling' ? '📉' : '➡️'
  const label = trend === 'rising' ? 'Rising' : trend === 'falling' ? 'Falling' : 'Stable'
  return (
    <div className="trend-row">
      <span className={`trend-badge trend-${trend}`}>{icon} {label}</span>
      <span className={`suggest-badge suggest-${suggestion?.toLowerCase()}`}>
        {suggestion === 'SELL' ? '💰 SELL NOW' : suggestion === 'WAIT' ? '⏳ WAIT' : '🤔 HOLD'}
      </span>
      <span className={`confidence-dot confidence-${confidence}`}>{confidence} confidence</span>
    </div>
  )
}

function PredictionPanel({ mandi, crop, onClose }) {
  const [pred, setPred] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/prediction?mandi=${encodeURIComponent(mandi)}&crop=${encodeURIComponent(crop)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setPred(d)
        else setError(d.message)
      })
      .catch(() => setError('Could not load prediction'))
      .finally(() => setLoading(false))
  }, [mandi, crop])

  return (
    <div className="prediction-panel animate-slide-up">
      <div className="pred-header">
        <h3>🤖 AI Price Prediction</h3>
        <button className="pred-close" onClick={onClose}>✕</button>
      </div>
      <p className="pred-subtitle">{crop} @ {mandi} Mandi</p>

      {loading && <div className="pred-loading"><div className="spinner" /><p>Analyzing 30-day price trends...</p></div>}
      {error && <div className="pred-error">⚠️ {error}</div>}

      {pred && !loading && (
        <div className="pred-content">
          <div className="pred-prices">
            <div className="pred-price-box current">
              <span className="price-label">Current Price</span>
              <span className="price-value">₹{pred.current_price?.toLocaleString('en-IN')}</span>
              <span className="price-unit">per Quintal</span>
            </div>
            <div className="pred-arrow">{pred.trend === 'rising' ? '→📈' : pred.trend === 'falling' ? '→📉' : '→'}</div>
            <div className="pred-price-box predicted">
              <span className="price-label">Predicted (Next Day)</span>
              <span className="price-value">
                {pred.predicted_price ? `₹${pred.predicted_price?.toLocaleString('en-IN')}` : 'N/A'}
              </span>
              <span className="price-unit">per Quintal</span>
            </div>
          </div>

          {pred.last_5_days && pred.last_5_days.length > 0 && (
            <div className="pred-history-section">
                <h4 style={{ margin: '15px 0 10px', fontSize: '13px', color: '#666', textTransform: 'uppercase' }}>📊 Previous 5 Days History</h4>
                <div className="history-bar-grid" style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                    {pred.last_5_days.map((day, idx) => (
                        <div key={idx} style={{ flex: 1, background: '#f5f7fa', padding: '10px 5px', borderRadius: '6px', textAlign: 'center', border: '1px solid #e0e5eb' }}>
                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                                {new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short'})}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}>
                                ₹{day.price?.toLocaleString('en-IN')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          <TrendBadge trend={pred.trend} suggestion={pred.suggestion} confidence={pred.confidence} />

          <div className="pred-meta">
            <span>📊 Based on {pred.history_days} days of data</span>
            <span>📊 Change: {pred.change_percent > 0 ? '+' : ''}{pred.change_percent}%</span>
          </div>

          {pred.suggestion === 'SELL' && (
            <div className="pred-advice advice-sell">
              ✅ <strong>Sell Now</strong> — Prices are {pred.trend}. Good time to take to market.
            </div>
          )}
          {pred.suggestion === 'WAIT' && (
            <div className="pred-advice advice-wait">
              ⏳ <strong>Wait</strong> — Prices are falling. Consider holding stock for recovery.
            </div>
          )}
          {pred.message && (
            <div className="pred-advice advice-info">ℹ️ {pred.message}</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MandiPrices({ isTab = false }) {
  // ─── Location State ───────────────────────────────────────────────────────
  const [location, setLocation] = useState(null)
  const [cityInput, setCityInput] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)

  // ─── Mandi State ──────────────────────────────────────────────────────────
  const [mandis, setMandis] = useState([])
  const [mandisLoading, setMandisLoading] = useState(false)
  const [selectedMandi, setSelectedMandi] = useState(null)
  const [radius, setRadius] = useState(150)

  // ─── Price State ─────────────────────────────────────────────────────────
  const [prices, setPrices] = useState([])
  const [pricesLoading, setPricesLoading] = useState(false)
  const [priceDate, setPriceDate] = useState(null)
  const [searchCrop, setSearchCrop] = useState('')
  const [sortField, setSortField] = useState('modal_price')
  const [sortDir, setSortDir] = useState('desc')

  // ─── Prediction State ─────────────────────────────────────────────────────
  const [predCrop, setPredCrop] = useState(null)

  // ─── Fetch Nearby Mandis ──────────────────────────────────────────────────
  const fetchNearbyMandis = useCallback(async (lat, lng) => {
    setMandisLoading(true)
    setMandis([])
    setSelectedMandi(null)
    setPrices([])
    try {
      const res = await fetch(`${API_BASE}/nearby?lat=${lat}&lng=${lng}&radius=${radius}`)
      const data = await res.json()
      if (data.success) {
        setMandis(data.data)
        if (data.data.length === 0) setLocationError('No mandis found within ' + radius + 'km. Try increasing radius.')
        else setLocationError(null)
      } else {
        setLocationError(data.message)
      }
    } catch {
      setLocationError('Could not connect to backend. Make sure the server is running.')
    } finally {
      setMandisLoading(false)
    }
  }, [radius])

  // ─── GPS Location ─────────────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.')
      return
    }
    setGpsLoading(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(coords)
        setGpsLoading(false)
        fetchNearbyMandis(coords.lat, coords.lng)
      },
      (err) => {
        setGpsLoading(false)
        setLocationError('GPS access denied. Please enter your city manually.')
      },
      { timeout: 10000 }
    )
  }

  // ─── Manual City Input ────────────────────────────────────────────────────
  const handleCitySearch = () => {
    const key = cityInput.trim().toLowerCase()
    if (!key) return
    const coords = CITY_COORDS[key]
    if (coords) {
      setLocation(coords)
      setLocationError(null)
      fetchNearbyMandis(coords.lat, coords.lng)
    } else {
      setLocationError(`City "${cityInput}" not found. Try: Nashik, Pune, Delhi, Jaipur, Lucknow, Amritsar...`)
    }
  }

  // ─── Select Mandi → Load Prices ───────────────────────────────────────────
  const handleSelectMandi = async (mandi) => {
    setSelectedMandi(mandi)
    setPrices([])
    setPriceDate(null)
    setSearchCrop('')
    setPredCrop(null)
    setPricesLoading(true)

    try {
      const res = await fetch(`${API_BASE}/prices?mandi=${encodeURIComponent(mandi.mandi_name)}&district=${encodeURIComponent(mandi.district || '')}`)
      const data = await res.json()
      if (data.success) {
        setPrices(data.data)
        setPriceDate(data.data_date)
      }
    } catch {
      setPrices([])
    } finally {
      setPricesLoading(false)
    }
  }

  // ─── Sort & Filter Prices ─────────────────────────────────────────────────
  const filteredPrices = prices
    .filter(p => !searchCrop || p.crop.toLowerCase().includes(searchCrop.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortField] ?? 0
      const vb = b[sortField] ?? 0
      return sortDir === 'desc' ? vb - va : va - vb
    })

  const bestModalPrice = prices.length > 0 ? Math.max(...prices.map(p => p.modal_price)) : 0

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>
    return <span className="sort-icon active">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  return (
    <div className={`mandi-page ${isTab ? 'is-tab' : ''}`}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      {!isTab && (
        <div className="mandi-page-header">
          <h1>🏪 Mandi Price Tracker</h1>
          <p>Find nearby agricultural markets and check real-time crop prices</p>
        </div>
      )}

      {/* ─── Location Bar ─────────────────────────────────────────────────── */}
      <div className="location-bar">
        <div className="location-bar-inner">
          <div className="location-gps-side">
            <button
              className={`btn-gps ${gpsLoading ? 'loading' : ''}`}
              onClick={handleGPS}
              disabled={gpsLoading}
            >
              {gpsLoading ? <><div className="btn-spinner" /> Locating...</> : <><span>📍</span> Use My GPS</>}
            </button>
            {location && (
              <span className="location-badge">
                📌 {location.lat.toFixed(3)}°N, {location.lng.toFixed(3)}°E
              </span>
            )}
          </div>

          <div className="location-divider">or</div>

          <div className="city-search-side">
            <input
              type="text"
              className="city-input"
              placeholder="Enter city name (e.g. Nashik, Jaipur, Ludhiana)"
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
            />
            <button className="btn-search" onClick={handleCitySearch}>Search</button>
          </div>

          <div className="radius-select-wrap">
            <label>Radius:</label>
            <select value={radius} onChange={e => { setRadius(+e.target.value); if (location) fetchNearbyMandis(location.lat, location.lng) }}>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={150}>150 km</option>
              <option value={300}>300 km</option>
            </select>
          </div>
        </div>

        {locationError && <div className="location-error">⚠️ {locationError}</div>}
      </div>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <div className="mandi-content-grid">

        {/* ─── Left: Mandi List ──────────────────────────────────────────── */}
        <aside className="mandi-list-panel">
          <div className="panel-header">
            <h2>🗺️ Nearby Mandis</h2>
            {mandis.length > 0 && <span className="count-badge">{mandis.length}</span>}
          </div>

          {mandisLoading && (
            <div className="panel-loading">
              <div className="spinner" />
              <p>Finding mandis...</p>
            </div>
          )}

          {!mandisLoading && mandis.length === 0 && location && !locationError && (
            <div className="panel-empty">
              <span>🌾</span>
              <p>No mandis found</p>
              <small>Try increasing the search radius</small>
            </div>
          )}

          {!mandisLoading && !location && (
            <div className="panel-hint">
              <span>📍</span>
              <p>Use GPS or enter your city to find nearby mandis</p>
            </div>
          )}

          <div className="mandi-list">
            {mandis.map((m, i) => (
              <button
                key={m._id || i}
                className={`mandi-card ${selectedMandi?.mandi_name === m.mandi_name ? 'active' : ''}`}
                onClick={() => handleSelectMandi(m)}
              >
                <div className="mandi-card-top">
                  <span className="mandi-name">{m.mandi_name}</span>
                  <span className="distance-badge">{m.distance_km} km</span>
                </div>
                <div className="mandi-card-bottom">
                  <span>📍 {m.district}, {m.state}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ─── Right: Price Table + Prediction ─────────────────────────── */}
        <main className="mandi-prices-panel">
          {!selectedMandi && (
            <div className="prices-placeholder">
              <div className="placeholder-icon">🌾</div>
              <h3>Select a Mandi</h3>
              <p>Click on any mandi from the list to view real-time crop prices and AI predictions</p>
            </div>
          )}

          {selectedMandi && (
            <>
              <div className="prices-header">
                <div className="prices-header-left">
                  <h2>🏪 {selectedMandi.mandi_name} Mandi</h2>
                  <p>
                    {selectedMandi.district}, {selectedMandi.state}
                    {priceDate && <span className="data-date"> · Data as of {priceDate}</span>}
                  </p>
                </div>
                {priceDate && (
                  <div className="data-freshness">
                    <span className="fresh-dot" />
                    Live Data
                  </div>
                )}
              </div>

              {/* Prediction Panel */}
              {predCrop && (
                <PredictionPanel
                  mandi={selectedMandi.mandi_name}
                  crop={predCrop}
                  onClose={() => setPredCrop(null)}
                />
              )}

              {/* Search & Filter */}
              <div className="price-toolbar">
                <input
                  type="text"
                  className="crop-search"
                  placeholder="🔍 Search crop..."
                  value={searchCrop}
                  onChange={e => setSearchCrop(e.target.value)}
                />
                <span className="result-count">
                  {filteredPrices.length} crop{filteredPrices.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Price Table */}
              {pricesLoading && (
                <div className="panel-loading">
                  <div className="spinner" />
                  <p>Loading prices...</p>
                </div>
              )}

              {!pricesLoading && prices.length === 0 && (
                <div className="panel-empty">
                  <span>📊</span>
                  <p>No real-time price data available for <strong>{selectedMandi.mandi_name}</strong></p>
                  <small>Government mandi price data (Agmarknet) needs to be synced.</small>
                  <div style={{marginTop:'15px', background:'#f8fafc', padding:'15px', borderRadius:'8px', textAlign:'left'}}>
                    <p style={{margin:'0 0 8px', fontWeight:'600', color:'#334155'}}>To get real prices, follow these steps:</p>
                    <ol style={{margin:'0', paddingLeft:'20px', color:'#475569', lineHeight:'1.8'}}>
                      <li>Register at <a href="https://data.gov.in/user/register" target="_blank" rel="noreferrer" style={{color:'#0284c7'}}>data.gov.in</a> to get a free API key</li>
                      <li>Add <code style={{background:'#e2e8f0',padding:'2px 6px',borderRadius:'4px'}}>DATA_GOV_API_KEY=your_key</code> to your <code style={{background:'#e2e8f0',padding:'2px 6px',borderRadius:'4px'}}>.env</code> file</li>
                      <li>Run in your backend terminal: <code style={{background:'#e2e8f0',padding:'2px 6px',borderRadius:'4px'}}>node scraper/agmarknetScraper.js</code></li>
                    </ol>
                  </div>
                </div>
              )}

              {!pricesLoading && filteredPrices.length > 0 && (
                <div className="price-table-wrap">
                  <table className="price-table">
                    <thead>
                      <tr>
                        <th>Crop</th>
                        <th className="sortable" onClick={() => handleSort('min_price')}>
                          Min Price <SortIcon field="min_price" />
                        </th>
                        <th className="sortable" onClick={() => handleSort('max_price')}>
                          Max Price <SortIcon field="max_price" />
                        </th>
                        <th className="sortable" onClick={() => handleSort('modal_price')}>
                          Modal Price <SortIcon field="modal_price" />
                        </th>
                        <th>Unit</th>
                        <th>Predict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPrices.map((p, i) => (
                        <tr
                          key={i}
                          className={p.modal_price === bestModalPrice ? 'best-price-row' : ''}
                        >
                          <td className="crop-cell">
                            <span className="crop-icon">🌾</span>
                            <span>{p.crop}</span>
                            {p.variety && p.variety !== 'Mixed' && (
                              <span className="variety-tag">{p.variety}</span>
                            )}
                          </td>
                          <td className="price-cell min">₹{p.min_price?.toLocaleString('en-IN')}</td>
                          <td className="price-cell max">₹{p.max_price?.toLocaleString('en-IN')}</td>
                          <td className="price-cell modal">
                            ₹{p.modal_price?.toLocaleString('en-IN')}
                            {p.modal_price === bestModalPrice && (
                              <span className="best-tag">⭐ Best</span>
                            )}
                          </td>
                          <td className="unit-cell">{p.unit || 'Qtl'}</td>
                          <td>
                            <button
                              className="btn-predict"
                              onClick={() => setPredCrop(prev => prev === p.crop ? null : p.crop)}
                              title="Get AI price prediction"
                            >
                              {predCrop === p.crop ? '▲ Hide' : '🤖 Predict'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

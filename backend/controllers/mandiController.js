const MandiLocation = require('../models/MandiLocation')
const MandiPrice = require('../models/MandiPrice')
const fs = require('fs')
const path = require('path')

// ─── Helper: Haversine Distance (km) ─────────────────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── GET /api/mandis/nearby ────────────────────────────────────────────────────
// Query: lat, lng, radius (km, default 150)
async function getNearbyMandis(req, res) {
  try {
    const lat = parseFloat(req.query.lat)
    const lng = parseFloat(req.query.lng)
    const radius = parseFloat(req.query.radius) || 150

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng are required' })
    }

    // Rough bounding box filter for performance before precise haversine
    const latDelta = radius / 111
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180))

    const mandis = await MandiLocation.find({
      latitude: { $gte: lat - latDelta, $lte: lat + latDelta },
      longitude: { $gte: lng - lngDelta, $lte: lng + lngDelta }
    }).lean()

    const withDistance = mandis
      .map((m) => ({
        ...m,
        distance_km: parseFloat(haversineDistance(lat, lng, m.latitude, m.longitude).toFixed(1))
      }))
      .filter((m) => m.distance_km <= radius)
      .sort((a, b) => a.distance_km - b.distance_km)

    res.json({
      success: true,
      count: withDistance.length,
      data: withDistance
    })
  } catch (err) {
    console.error('getNearbyMandis error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/mandis/prices ────────────────────────────────────────────────────
// Query: mandi (name), crop (optional filter), district (optional filter)
async function getMandiPrices(req, res) {
  try {
    const { mandi, crop } = req.query

    if (!mandi) {
      return res.status(400).json({ success: false, message: 'mandi query param is required' })
    }

    // 1. First, try to fetch from live Data.gov.in API using the user's API Key
    const API_KEY = '579b464db66ec23bdd000001a8d9ddf0ff05405f6ecd44f89ed9e340'
    try {
      // Build the URL with filters
      let liveUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${API_KEY}&format=json&limit=100`
      if (req.query.district) {
          liveUrl += `&filters[district]=${encodeURIComponent(req.query.district)}`
      } else {
          liveUrl += `&filters[market]=${encodeURIComponent(mandi)}`
      }
      
      const liveRes = await fetch(liveUrl)
      const liveData = await liveRes.json()
      
      if (liveData && liveData.records && liveData.records.length > 0) {
          // Format live data
          let formattedData = liveData.records.map(r => ({
              crop: r.commodity,
              min_price: parseInt(r.min_price),
              max_price: parseInt(r.max_price),
              modal_price: parseInt(r.modal_price),
              date: new Date(r.arrival_date),
              state: r.state,
              district: r.district,
              mandi: r.market
          }))

          if (crop) {
              formattedData = formattedData.filter(d => d.crop.toLowerCase().includes(crop.toLowerCase()))
          }

          if (formattedData.length > 0) {
              return res.json({
                  success: true,
                  mandi: formattedData[0].mandi,
                  data_date: formattedData[0].date,
                  count: formattedData.length,
                  data: formattedData
              })
          }
      }

      // 1.1 If specific mandi failed, try with "APMC" suffix or district-level if mandi looks too short
      if (!req.query.district && (!liveData.records || liveData.records.length === 0)) {
          const alternativeMandi = mandi.toLowerCase().endsWith('apmc') ? mandi : `${mandi} APMC`;
          const altUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${API_KEY}&format=json&limit=100&filters[market]=${encodeURIComponent(alternativeMandi)}`
          const altRes = await fetch(altUrl)
          const altData = await altRes.json()
          
          if (altData?.records?.length > 0) {
              let formattedData = altData.records.map(r => ({
                  crop: r.commodity,
                  min_price: parseInt(r.min_price),
                  max_price: parseInt(r.max_price),
                  modal_price: parseInt(r.modal_price),
                  date: new Date(r.arrival_date),
                  state: r.state,
                  district: r.district,
                  mandi: r.market
              }))
              return res.json({
                  success: true,
                  mandi: formattedData[0].mandi,
                  data_date: formattedData[0].date,
                  count: formattedData.length,
                  data: formattedData
              })
          }
      }
    } catch (apiErr) {
      console.warn("Live API failed, falling back to DB:", apiErr.message)
    }

    // 2. Fallback to Database
    const filterConditions = [
        { mandi: { $regex: new RegExp(mandi, 'i') } }
    ]
    if (req.query.district) {
        filterConditions.push({ district: { $regex: new RegExp(req.query.district, 'i') } })
    }

    const filter = { $or: filterConditions }
    if (crop) {
      filter.crop = { $regex: new RegExp(crop, 'i') }
    }

    // Get latest date's data for this mandi/district
    const latestEntry = await MandiPrice.findOne(filter).sort({ date: -1 }).lean()
    if (!latestEntry) {
      return res.json({
        success: true,
        mandi,
        data_date: null,
        count: 0,
        data: [],
        message: 'No real-time price data found from live API or Database for this region.'
      })
    }

    const latestDate = new Date(latestEntry.date)
    const dayStart = new Date(latestDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(latestDate)
    dayEnd.setHours(23, 59, 59, 999)

    filter.date = { $gte: dayStart, $lte: dayEnd }

    const prices = await MandiPrice.find(filter).sort({ crop: 1 }).lean()

    res.json({
      success: true,
      mandi,
      data_date: latestDate,
      count: prices.length,
      data: prices
    })
  } catch (err) {
    console.error('getMandiPrices error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/mandis/prediction ───────────────────────────────────────────────
// Query: mandi, crop
// Returns: current price, predicted price, trend (up/down/stable), suggestion (SELL/WAIT)
async function getPricePrediction(req, res) {
  try {
    const { mandi, crop } = req.query

    if (!mandi || !crop) {
      return res.status(400).json({ success: false, message: 'mandi and crop are required' })
    }

    // Get last 30 days of data for this mandi+crop
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const history = await MandiPrice.find({
      mandi: { $regex: new RegExp(mandi, 'i') },
      crop: { $regex: new RegExp(crop, 'i') },
      date: { $gte: thirtyDaysAgo }
    })
      .sort({ date: 1 })
      .lean()

    if (history.length < 2) {
      return res.json({
        success: true,
        mandi,
        crop,
        current_price: history[0]?.modal_price || null,
        predicted_price: null,
        trend: 'insufficient_data',
        suggestion: 'HOLD',
        confidence: 'low',
        message: 'Not enough historical data for prediction (need at least 2 data points)'
      })
    }

    const prices = history.map((h) => h.modal_price)
    const currentPrice = prices[prices.length - 1]

    // ─── Simple Linear Regression for next-day prediction
    const n = prices.length
    const xMean = (n - 1) / 2
    const yMean = prices.reduce((a, b) => a + b, 0) / n

    let numerator = 0
    let denominator = 0
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (prices[i] - yMean)
      denominator += (i - xMean) ** 2
    }
    const slope = denominator !== 0 ? numerator / denominator : 0
    const intercept = yMean - slope * xMean
    const predictedPrice = Math.round(intercept + slope * n)

    // ─── 7-day moving average trend
    const recent7 = prices.slice(-7)
    const older7 = prices.slice(-14, -7)
    const recentAvg = recent7.reduce((a, b) => a + b, 0) / recent7.length
    const olderAvg = older7.length > 0
      ? older7.reduce((a, b) => a + b, 0) / older7.length
      : recentAvg

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100
    let trend, suggestion, confidence

    if (changePercent > 2 && slope > 0) {
      trend = 'rising'
      suggestion = 'SELL' // prices going up — good time to sell
      confidence = changePercent > 5 ? 'high' : 'medium'
    } else if (changePercent < -2 && slope < 0) {
      trend = 'falling'
      suggestion = 'WAIT' // prices falling — wait for recovery
      confidence = Math.abs(changePercent) > 5 ? 'high' : 'medium'
    } else {
      trend = 'stable'
      suggestion = 'SELL' // stable — safe to sell now
      confidence = 'medium'
    }

    res.json({
      success: true,
      mandi,
      crop,
      current_price: currentPrice,
      predicted_price: Math.max(0, predictedPrice),
      trend,
      change_percent: parseFloat(changePercent.toFixed(2)),
      suggestion,
      confidence,
      history_days: n,
      slope: parseFloat(slope.toFixed(2)),
      last_5_days: history.slice(-5).map(h => ({
          date: new Date(h.date).toISOString().split('T')[0],
          price: h.modal_price
      }))
    })
  } catch (err) {
    console.error('getPricePrediction error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/mandis/all ──────────────────────────────────────────────────────
// Returns all mandi names (for search/autocomplete)
async function getAllMandis(req, res) {
  try {
    const mandis = await MandiLocation.find({}).select('mandi_name district state').lean()
    res.json({ success: true, count: mandis.length, data: mandis })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
// ─── GET /api/mandis/repair ───────────────────────────────────────────────────
// Reads up_mandis.csv directly into MongoDB accurately.
async function repairMandiDatabase(req, res) {
  try {
    const csvPath = path.join(__dirname, '../data/up_mandis.csv');
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ success: false, message: 'CSV file not found in data folder' });
    }
    
    // Clear the existing DB
    await MandiLocation.deleteMany({});
    
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const rows = csvData.trim().split('\n').map(r => r.split(','));
    
    const validEntries = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 4) {
            const [name, district, lat, lng] = row;
            if (name && lat && lng && !isNaN(parseFloat(lat))) {
                validEntries.push({
                   mandi_name: name.trim(),
                   district: district.trim(),
                   state: 'Uttar Pradesh',
                   latitude: parseFloat(lat),
                   longitude: parseFloat(lng)
                });
            }
        }
    }
    
    await MandiLocation.insertMany(validEntries);
    res.json({ success: true, message: `Successfully repaired and inserted ${validEntries.length} Mandi Coordinates. The 'Nearby' feature should now work.` });
  } catch (err) {
    console.error('repairMandi error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getNearbyMandis, getMandiPrices, getPricePrediction, getAllMandis, repairMandiDatabase }

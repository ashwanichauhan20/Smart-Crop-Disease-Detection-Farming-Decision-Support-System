const axios = require('axios')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const MandiPrice = require('../models/MandiPrice')
const dns = require('dns')

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])
dotenv.config()

// ─── Working public Agmarknet endpoint (used by agmarknet.gov.in itself) ────────
// This is the actual JSON API that powers the agmarknet.gov.in website tables
const AGMARKNET_API = 'https://agmarknet.gov.in/SearchCmmMkt.aspx'

// State codes used in the agmarknet form
const STATE_CODES = [
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'PB', name: 'Punjab' },
  { code: 'HR', name: 'Haryana' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'GJ', name: 'Gujarat' },
]

// Crop codes for agmarknet
const CROP_IDS = [
  { id: '23', name: 'Wheat' },
  { id: '78', name: 'Rice' },
  { id: '66', name: 'Potato' },
  { id: '50', name: 'Maize' },
  { id: '59', name: 'Onion' },
  { id: '29', name: 'Cotton' },
]

// ─── Fetch from data.gov.in resource API (public, no key required for some resources) ──
async function fetchFromDataGovIn(dateStr) {
  const results = []
  
  // data.gov.in Agmarknet Dataset resource ID
  // Resource: Daily Mandi Prices - https://data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
  const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'
  
  try {
    const url = `https://api.data.gov.in/resource/${RESOURCE_ID}`
    const params = {
      'api-key': process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001a8d9ddf0ff05405f6ecd44f89ed9e340',
      format: 'json',
      limit: 500,
      'filters[arrival_date]': dateStr
    }
    
    const response = await axios.get(url, { params, timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 Smart-Fasal-Suraksha/1.0' }
    })
    
    if (response.data?.records) {
      for (const row of response.data.records) {
        const modal = parseFloat(row.modal_price)
        if (isNaN(modal) || modal <= 0) continue
        results.push({
          mandi: (row.market || row.mandi || '').trim(),
          district: (row.district || '').trim(),
          state: (row.state || '').trim(),
          crop: (row.commodity || row.crop || '').trim(),
          variety: (row.variety || 'FAQ').trim(),
          min_price: parseFloat(row.min_price) || 0,
          max_price: parseFloat(row.max_price) || 0,
          modal_price: modal,
          unit: 'Quintal',
          date: new Date(dateStr)
        })
      }
    }
  } catch (err) {
    console.warn(`  ⚠️ data.gov.in API failed: ${err.message}`)
  }
  
  return results
}

// ─── Fallback: Agmarknet website scrape via their internal AJAX endpoint ────────
async function fetchFromAgmarknetDirect(dateStr) {
  const results = []
  
  // Agmarknet's own internal REST endpoint (reversed from their site)
  const endpoints = [
    {
      url: 'https://agmarknet.gov.in/PriceTrend/SA_Arrivals_MSP.aspx',
      description: 'Price trend endpoint'
    }
  ]
  
  // Format: DD/MM/YYYY for Agmarknet
  const [year, month, day] = dateStr.split('-')
  const formattedDate = `${day}/${month}/${year}`
  
  for (const { url, description } of endpoints) {
    try {
      console.log(`  🌐 Trying ${description}...`)
      const response = await axios.get(url, {
        params: {
          Tx_Commodity: 23,   // Wheat
          Tx_State: 0,        // All states
          Tx_District: 0,
          Tx_Market: 0,
          DateFrom: formattedDate,
          DateTo: formattedDate,
          Fr_Date: formattedDate,
          To_Date: formattedDate,
          Tx_Trend: 0,
          Tx_CommodityHead: 'Wheat',
          Tx_StateHead: '%--All States--',
          Tx_DistrictHead: '%--All Districts--',
          Tx_MarketHead: '%--All Markets--'
        },
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Referer': 'https://agmarknet.gov.in/'
        }
      })
      
      // Parse if we got HTML data
      if (response.data && typeof response.data === 'string' && response.data.includes('Mandi')) {
        // Extract price data from HTML
        const rows = response.data.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
        for (const row of rows) {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
          if (cells.length >= 6) {
            const getText = (cell) => cell.replace(/<[^>]+>/g, '').trim()
            const modal = parseFloat(getText(cells[5] || ''))
            if (modal > 0) {
              results.push({
                mandi: getText(cells[2] || '') || 'Unknown',
                district: getText(cells[1] || '') || 'Unknown',
                state: getText(cells[0] || '') || 'Unknown',
                crop: 'Wheat',
                variety: 'FAQ',
                min_price: parseFloat(getText(cells[3] || '')) || 0,
                max_price: parseFloat(getText(cells[4] || '')) || 0,
                modal_price: modal,
                unit: 'Quintal',
                date: new Date(dateStr)
              })
            }
          }
        }
      }
    } catch {
      // silently continue to next endpoint
    }
  }
  
  return results
}

// ─── Save results to MongoDB (upsert to avoid duplicates) ────────────────────
async function savePricesToDB(records) {
  let inserted = 0
  let duplicates = 0

  for (const rec of records) {
    if (!rec.mandi || !rec.crop || !rec.modal_price) continue
    if (rec.mandi.toLowerCase().includes('central mandi')) continue // Skip old mock data

    const dateOnly = new Date(rec.date)
    dateOnly.setHours(0, 0, 0, 0)

    try {
      const result = await MandiPrice.updateOne(
        { mandi: rec.mandi, crop: rec.crop, date: dateOnly },
        { $setOnInsert: { ...rec, date: dateOnly } },
        { upsert: true }
      )
      if (result.upsertedCount > 0) inserted++
      else duplicates++
    } catch (err) {
      if (err.code !== 11000) {
        console.error(`  ❌ DB error for ${rec.mandi}/${rec.crop}:`, err.message)
      } else {
        duplicates++
      }
    }
  }

  return { inserted, duplicates }
}

// ─── Main scraper function ────────────────────────────────────────────────────
async function runScraper() {
  console.log('\n🌾 ===== SMART MANDI PRICE FETCHER STARTED =====')
  
  // Try today first, then yesterday (government data often lags 1-2 days)
  const dates = []
  for (let i = 0; i <= 2; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }

  let totalFetched = 0
  let totalInserted = 0
  let totalDuplicates = 0

  for (const dateStr of dates) {
    console.log(`\n📅 Trying date: ${dateStr}`)
    
    // Strategy 1: Try data.gov.in API
    let records = await fetchFromDataGovIn(dateStr)
    if (records.length > 0) {
      console.log(`  ✅ data.gov.in returned ${records.length} real records`)
    }
    
    // Strategy 2: Try Agmarknet direct
    if (records.length === 0) {
      records = await fetchFromAgmarknetDirect(dateStr)
      if (records.length > 0) {
        console.log(`  ✅ Agmarknet direct returned ${records.length} real records`)
      }
    }
    
    // If we got real records from any source, save and stop looping dates
    if (records.length > 0) {
      totalFetched += records.length
      const { inserted, duplicates } = await savePricesToDB(records)
      totalInserted += inserted
      totalDuplicates += duplicates
      console.log(`  💾 Saved: ${inserted} new, ${duplicates} duplicates skipped`)
      break // Found data for a date, don't go further back
    } else {
      console.log(`  ⚠️ No real data found for ${dateStr}, trying next date...`)
    }
  }

  console.log('\n✅ ===== SCRAPER COMPLETE =====')
  console.log(`📊 Total fetched: ${totalFetched}`)
  console.log(`💾 Newly inserted: ${totalInserted}`)
  console.log(`🔁 Duplicates skipped: ${totalDuplicates}`)

  if (totalInserted === 0 && totalFetched === 0) {
    console.log('\n⚠️  NOTE: Both APIs returned no data.')
    console.log('   This may mean:')
    console.log('   - The government API is temporarily down')
    console.log('   - Prices not yet published for recent dates')
    console.log('   - You need a DATA_GOV_API_KEY in your .env file')
    console.log('\n   👉 Get a FREE API key at: https://data.gov.in/user/register')
    console.log('   Then add: DATA_GOV_API_KEY=your_key_here to your .env file\n')
  }

  return { totalFetched, totalInserted, totalDuplicates }
}

if (require.main === module) {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not set in .env file')
    process.exit(1)
  }

  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('✅ MongoDB connected')
      return runScraper()
    })
    .then(() => {
      mongoose.disconnect()
      process.exit(0)
    })
    .catch((err) => {
      console.error('❌ Scraper failed:', err)
      mongoose.disconnect()
      process.exit(1)
    })
}

module.exports = { runScraper }

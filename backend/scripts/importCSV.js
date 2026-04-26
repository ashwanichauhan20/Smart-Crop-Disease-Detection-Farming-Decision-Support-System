/**
 * CSV Import Script
 * Usage: node scripts/importCSV.js --file path/to/mandis.csv
 * 
 * Expected CSV columns (flexible header matching):
 *   mandi_name, district, latitude, longitude
 *   OR: name, district, lat, lng
 *   OR: Market, District, Latitude, Longitude
 */

const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const dns = require('dns')
const MandiLocation = require('../models/MandiLocation')

dotenv.config()

// Set DNS servers to Google/Cloudflare to fix SRV lookup issues on some Windows networks
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])

// Parse CLI args
const args = process.argv.slice(2)
const fileArgIdx = args.indexOf('--file')
const csvFile = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null

if (!csvFile) {
  console.error('❌ Usage: node scripts/importCSV.js --file path/to/mandis.csv')
  process.exit(1)
}

const resolvedPath = path.resolve(csvFile)
if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ File not found: ${resolvedPath}`)
  process.exit(1)
}

// ─── Normalize CSV headers to standard field names ───────────────────────────
function normalize(row) {
  const keys = Object.keys(row)
  const get = (...candidates) => {
    for (const c of candidates) {
      // Very flexible matching (ignore case, spaces, underscores, symbols like °)
      const cleanCandidate = c.toLowerCase().replace(/[\s_°]/g, '')
      const key = keys.find(k => k.toLowerCase().replace(/[\s_°]/g, '') === cleanCandidate)
      if (key && row[key] !== undefined && row[key] !== '') return row[key]
    }
    return ''
  }

  return {
    mandi_name: get('mandi_name', 'mandi', 'market', 'name', 'mandiname', 'marketname'),
    district: get('district', 'dist'),
    state: get('state', 'statename', 'state_name') || 'Uttar Pradesh', // default for this file
    latitude: parseFloat(get('latitude', 'lat', 'latn', 'latitude_n')),
    longitude: parseFloat(get('longitude', 'lng', 'lon', 'lnge', 'longitude_e'))
  }
}

async function importCSV() {
  console.log(`\n📂 Importing from: ${resolvedPath}`)

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not set in .env file')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ MongoDB connected')

  const rows = []

  let headerFound = false
  await new Promise((resolve, reject) => {
    fs.createReadStream(resolvedPath)
      .pipe(csv({
        mapHeaders: ({ header }) => {
          const h = header.toLowerCase().trim()
          if (h.includes('mandi name') || h.includes('market')) headerFound = true
          return header
        }
      }))
      .on('data', (row) => {
        // Only process rows if we've encountered a header that looks like a mandi name header
        // and current row actually has a mandi name (skips empty spacer rows)
        const norm = normalize(row)
        if (norm.mandi_name && !isNaN(norm.latitude)) {
          rows.push(norm)
          if (rows.length % 50 === 0) console.log(`   📝 Parsed ${rows.length} rows...`)
        }
      })
      .on('end', resolve)
      .on('error', reject)
  })

  console.log(`📊 Parsed ${rows.length} rows`)

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    if (!row.mandi_name || isNaN(row.latitude) || isNaN(row.longitude)) {
      skipped++
      continue
    }

    try {
      await MandiLocation.updateOne(
        { mandi_name: row.mandi_name, district: row.district },
        { $setOnInsert: row },
        { upsert: true }
      )
      inserted++
    } catch (err) {
      if (err.code === 11000) {
        skipped++ // already exists
      } else {
        console.error(`  ❌ Error for ${row.mandi_name}:`, err.message)
        errors++
      }
    }
  }

  console.log('\n✅ Import complete!')
  console.log(`   ✔️  Inserted/updated: ${inserted}`)
  console.log(`   ⏭️  Skipped (duplicate/invalid): ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)

  await mongoose.disconnect()
  process.exit(0)
}

importCSV().catch((err) => {
  console.error('❌ Import failed:', err)
  process.exit(1)
})

/**
 * Seed Script — inserts sample mandi data for testing the frontend
 * Run: node scripts/seedSampleData.js
 */

const mongoose = require('mongoose')
const dotenv = require('dotenv')
const MandiLocation = require('../models/MandiLocation')
const MandiPrice = require('../models/MandiPrice')

dotenv.config()

const sampleMandis = [
  { mandi_name: 'Nashik', district: 'Nashik', state: 'Maharashtra', latitude: 19.9975, longitude: 73.7898 },
  { mandi_name: 'Pune', district: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  { mandi_name: 'Aurangabad', district: 'Aurangabad', state: 'Maharashtra', latitude: 19.8762, longitude: 75.3433 },
  { mandi_name: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', latitude: 21.1458, longitude: 79.0882 },
  { mandi_name: 'Solapur', district: 'Solapur', state: 'Maharashtra', latitude: 17.6868, longitude: 75.9064 },
  { mandi_name: 'Amritsar', district: 'Amritsar', state: 'Punjab', latitude: 31.6340, longitude: 74.8723 },
  { mandi_name: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', latitude: 30.9010, longitude: 75.8573 },
  { mandi_name: 'Karnal', district: 'Karnal', state: 'Haryana', latitude: 29.6858, longitude: 76.9905 },
  { mandi_name: 'Hisar', district: 'Hisar', state: 'Haryana', latitude: 29.1492, longitude: 75.7217 },
  { mandi_name: 'Agra', district: 'Agra', state: 'Uttar Pradesh', latitude: 27.1767, longitude: 78.0081 },
  { mandi_name: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
  { mandi_name: 'Indore', district: 'Indore', state: 'Madhya Pradesh', latitude: 22.7196, longitude: 75.8577 },
  { mandi_name: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.2599, longitude: 77.4126 },
  { mandi_name: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  { mandi_name: 'Jodhpur', district: 'Jodhpur', state: 'Rajasthan', latitude: 26.2389, longitude: 73.0243 },
  { mandi_name: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714 },
  { mandi_name: 'Surat', district: 'Surat', state: 'Gujarat', latitude: 21.1702, longitude: 72.8311 },
]

const crops = [
  'Wheat', 'Rice', 'Maize', 'Soybean', 'Cotton', 'Tomato',
  'Onion', 'Potato', 'Sugarcane', 'Groundnut', 'Mustard', 'Bajra'
]

function randBetween(min, max) {
  return Math.round(Math.random() * (max - min) + min)
}

function generatePriceHistory(mandiName, cropName, days = 30) {
  const records = []
  const basePrice = randBetween(800, 3500)

  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    // Random walk price simulation
    const variation = randBetween(-80, 80)
    const modalPrice = Math.max(200, basePrice + variation * (days - i) / 10)
    const minPrice = Math.round(modalPrice * (0.85 + Math.random() * 0.1))
    const maxPrice = Math.round(modalPrice * (1.05 + Math.random() * 0.1))

    records.push({
      mandi: mandiName,
      district: '',
      state: '',
      crop: cropName,
      variety: 'Mixed',
      min_price: minPrice,
      max_price: maxPrice,
      modal_price: Math.round(modalPrice),
      unit: 'Quintal',
      date
    })
  }
  return records
}

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not set in .env file')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ MongoDB connected\n')

  // Insert mandi locations
  console.log('📍 Seeding mandi locations...')
  for (const mandi of sampleMandis) {
    await MandiLocation.updateOne(
      { mandi_name: mandi.mandi_name, district: mandi.district },
      { $setOnInsert: mandi },
      { upsert: true }
    )
  }
  console.log(`   ✔️  ${sampleMandis.length} mandis seeded`)

  // Insert price history
  console.log('\n💰 Seeding price history (30 days × 17 mandis × 12 crops)...')
  let count = 0
  for (const mandi of sampleMandis.slice(0, 5)) { // first 5 mandis for speed
    for (const crop of crops) {
      const records = generatePriceHistory(mandi.mandi_name, crop, 30)
      for (const rec of records) {
        try {
          await MandiPrice.updateOne(
            { mandi: rec.mandi, crop: rec.crop, date: rec.date },
            { $setOnInsert: rec },
            { upsert: true }
          )
          count++
        } catch (e) {
          // skip duplicates
        }
      }
    }
  }
  console.log(`   ✔️  ${count} price records seeded`)

  console.log('\n🎉 Sample data ready! You can now test the frontend.')
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})

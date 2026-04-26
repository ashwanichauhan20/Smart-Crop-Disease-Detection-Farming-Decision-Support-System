const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')
const dns = require('dns')

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])

dotenv.config({ path: path.join(__dirname, '.env') })

// Define essential schemas manually to avoid import issues
const mandiPriceSchema = new mongoose.Schema({
  mandi: String,
  district: String,
  state: String,
  crop: String,
  variety: String,
  min_price: Number,
  max_price: Number,
  modal_price: Number,
  unit: String,
  date: Date
})

const mandiLocationSchema = new mongoose.Schema({
  mandi_name: String,
  district: String,
  state: String,
  lat: Number,
  lng: Number
})

const MandiPrice = mongoose.models.MandiPrice || mongoose.model('MandiPrice', mandiPriceSchema)
const MandiLocation = mongoose.models.MandiLocation || mongoose.model('MandiLocation', mandiLocationSchema)

const CROPS = ['Wheat', 'Rice', 'Tomato', 'Potato', 'Onion', 'Cotton', 'Maize', 'Sugarcane', 'Mustard', 'Soyabean']

async function seedData() {
  console.log('🌱 Starting highly-specific seed script for UP Mandis...')
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    // Find all mandis in UP
    const upMandis = await MandiLocation.find({ 
      state: { $regex: /Uttar Pradesh/i } 
    })
    
    console.log(`🗺️ Found ${upMandis.length} real actual UP Mandis in database.`)
    
    if(upMandis.length === 0) {
        console.log("No UP Mandis found in MandiLocation Collection! The CSV might not be imported.");
        process.exit(1);
    }
    
    // Also get all mandis generally to provide a few prices elsewhere just in case
    const allMandis = await MandiLocation.find({});

    let recordsInserted = 0;
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Seed the full list of Mandis
    for (const location of allMandis) {
        // More crops for UP specifically
        const isUP = location.state.toLowerCase().includes('uttar pradesh');
        const numCrops = isUP ? (Math.floor(Math.random() * 5) + 3) : 2; 
        
        for (let i=0; i<numCrops; i++) {
            const crop = CROPS[Math.floor(Math.random() * CROPS.length)];
            const basePrice = Math.floor(Math.random() * 3000) + 800; // 800 to 3800
            
            const p = new MandiPrice({
                mandi: location.mandi_name, // Exact Match!
                district: location.district || 'Unknown',
                state: location.state || 'Unknown',
                crop: crop,
                variety: 'FAQ',
                min_price: basePrice - 150,
                max_price: basePrice + 150,
                modal_price: basePrice,
                unit: 'Quintal',
                date: new Date(dateStr)
            });
            
            await MandiPrice.updateOne(
                { mandi: location.mandi_name, crop: crop, date: p.date },
                { $setOnInsert: p },
                { upsert: true }
            );
            recordsInserted++;
        }
    }

    console.log(`🥳 Successfully inserted ${recordsInserted} price records perfectly mapped to actual Mandi UI dropdowns!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

seedData();

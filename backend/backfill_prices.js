const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')
const dns = require('dns')

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])

dotenv.config({ path: path.join(__dirname, '.env') })

const mandiPriceSchema = new mongoose.Schema({
  mandi: String, district: String, state: String, crop: String, variety: String,
  min_price: Number, max_price: Number, modal_price: Number, unit: String, date: Date
})

const MandiPrice = mongoose.models.MandiPrice || mongoose.model('MandiPrice', mandiPriceSchema)

async function backfillHistory() {
  console.log('🌱 Backfilling 5 days of history...')
  try {
    await mongoose.connect(process.env.MONGO_URI)
    
    // Get all unique mandi/crop combinations currently seeded 
    const currentPrices = await MandiPrice.find({ date: { $gte: new Date(new Date().setHours(0,0,0,0)) } })
    
    let inserted = 0;
    
    for (const p of currentPrices) {
        let lastPrice = p.modal_price;
        
        // Go backwards 5 days
        for(let d=1; d<=5; d++) {
            const historicalDate = new Date(p.date);
            historicalDate.setDate(historicalDate.getDate() - d);
            
            // Randomly fluctuate price up to 5% backwards
            const fluctuation = 1 + ((Math.random() * 0.1) - 0.05);
            lastPrice = Math.round(lastPrice * fluctuation);
            
            const histP = new MandiPrice({
                mandi: p.mandi,
                district: p.district,
                state: p.state,
                crop: p.crop,
                variety: p.variety,
                min_price: lastPrice - 150,
                max_price: lastPrice + 150,
                modal_price: lastPrice,
                unit: p.unit,
                date: historicalDate
            });
            
            await MandiPrice.updateOne(
                { mandi: p.mandi, crop: p.crop, date: historicalDate },
                { $setOnInsert: histP },
                { upsert: true }
            );
            inserted++;
        }
    }

    console.log(`🥳 Successfully backfilled ${inserted} historical prices!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

backfillHistory();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
const fs = require('fs');

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
console.log("Starting script...");
dotenv.config();

const mandiLocationSchema = new mongoose.Schema({
  mandi_name: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, default: 'Uttar Pradesh' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true }
}, { collection: 'mandilocations' });

const MandiLocation = mongoose.model('MandiLocation', mandiLocationSchema);

async function checkAndFixDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Read the CSV
    const csvData = fs.readFileSync('./data/up_mandis.csv', 'utf-8');
    const rows = csvData.trim().split('\n').map(row => row.split(','));
    console.log(`Found ${rows.length} rows in CSV`);
    
    const count = await MandiLocation.countDocuments();
    console.log(`Current DB count: ${count}`);
    
    if (count < 10) {
       console.log("DB count is suspiciously low. Re-inserting mandi locations from up_mandis.csv");
       await MandiLocation.deleteMany({});
       
       const insertPayload = [];
       // skip header
       for (let i = 1; i < rows.length; i++) {
          const [mandiName, district, lat, lng] = rows[i];
          if(mandiName && district && lat && lng) {
             insertPayload.push({
               mandi_name: mandiName.trim(),
               district: district.trim(),
               state: 'Uttar Pradesh',
               latitude: parseFloat(lat),
               longitude: parseFloat(lng)
             });
          }
       }
       
       await MandiLocation.insertMany(insertPayload);
       console.log(`Successfully inserted ${insertPayload.length} Mandi Locations!`);
    } else {
        const first = await MandiLocation.findOne();
        console.log("DB already has Mandi Locations.", first);
        if (typeof first.latitude !== 'number') {
            console.log("DATATYPE ERROR! Latitude is string. Need to fix database!");
        }
    }

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

checkAndFixDb();

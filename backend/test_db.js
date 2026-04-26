const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mandiLocationSchema = new mongoose.Schema({
  mandi_name: String,
  district: String,
  state: String,
  latitude: Number,
  longitude: Number
}, { collection: 'mandilocations' });

const MandiLocation = mongoose.model('MandiLocation', mandiLocationSchema);

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crop_disease_db');
    console.log('Connected to MongoDB');
    
    const count = await MandiLocation.countDocuments();
    console.log(`Total MandiLocations: ${count}`);
    
    if (count > 0) {
      const first = await MandiLocation.findOne();
      console.log('First record:', first);

      // Check types
      console.log('Latitude type:', typeof first.latitude);
      console.log('Longitude type:', typeof first.longitude);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

checkDb();

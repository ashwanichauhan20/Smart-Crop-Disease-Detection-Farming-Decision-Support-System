const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MandiPrice = require('./models/MandiPrice');
const MandiLocation = require('./models/MandiLocation');

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const priceCount = await MandiPrice.countDocuments();
    const locationCount = await MandiLocation.countDocuments();
    console.log(`MandiPrice count: ${priceCount}`);
    console.log(`MandiLocation count: ${locationCount}`);

    if (priceCount > 0) {
      const samplePrices = await MandiPrice.find().limit(5).lean();
      console.log('Sample Prices:', JSON.stringify(samplePrices, null, 2));
    }

    if (locationCount > 0) {
      const sampleLocations = await MandiLocation.find().limit(5).lean();
      console.log('Sample Locations:', JSON.stringify(sampleLocations, null, 2));
    }

    // Check if any names match
    const priceNames = await MandiPrice.distinct('mandi');
    const locationNames = await MandiLocation.distinct('mandi_name');

    const matches = priceNames.filter(p => locationNames.some(l => l.toLowerCase() === p.toLowerCase()));
    console.log(`Total price mandis: ${priceNames.length}`);
    console.log(`Total location mandis: ${locationNames.length}`);
    console.log(`Matches: ${matches.length}`);
    
    if (matches.length === 0 && priceNames.length > 0) {
        console.log('No matches found between prices and locations!');
        console.log('Price Mandi Names (first 10):', priceNames.slice(0, 10));
        console.log('Location Mandi Names (first 10):', locationNames.slice(0, 10));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MandiPrice = require('./models/MandiPrice');

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkAgra() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const latestAgra = await MandiPrice.find({ state: 'Uttar Pradesh' }).sort({ date: -1 }).limit(1).lean();
    console.log('Latest UP Price Record:', JSON.stringify(latestAgra, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAgra();

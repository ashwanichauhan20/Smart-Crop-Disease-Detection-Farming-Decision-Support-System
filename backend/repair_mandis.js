const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const dns = require('dns');

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const MONGO_URI = process.env.MONGO_URI;
const CSV_FILE = path.join(__dirname, 'up_mandis.csv');

async function repair() {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db('farmdb');
        const collection = db.collection('mandilocations');

        console.log('Clearing existing documents...');
        await collection.deleteMany({});

        console.log('Reading CSV...');
        const lines = fs.readFileSync(CSV_FILE, 'utf8').split('\n');
        const headers = lines[0].split(',');
        
        const mandis = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length < 4) continue;
            
            mandis.push({
                mandi_name: cols[0].trim(),
                district: cols[1].trim(),
                state: 'Uttar Pradesh',
                latitude: parseFloat(cols[2]),
                longitude: parseFloat(cols[3]),
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        console.log(`Inserting ${mandis.length} mandis...`);
        if (mandis.length > 0) {
            await collection.insertMany(mandis);
            console.log('✅ INSERT SUCCESSFUL');
        } else {
            console.log('❌ NO MANDIS PARSED FROM CSV');
        }

        const count = await collection.countDocuments();
        console.log(`FINAL_COUNT:${count}`);
        
        // Ensure indexes
        await collection.createIndex({ latitude: 1, longitude: 1 });
        await collection.createIndex({ mandi_name: 1, district: 1 }, { unique: true });
        console.log('✅ INDEXES CREATED');

    } catch (err) {
        console.error('❌ REPAIR_FAILED:', err);
    } finally {
        await client.close();
        process.exit(0);
    }
}

repair();

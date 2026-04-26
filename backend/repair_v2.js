const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const dns = require('dns');

dotenv.config();

// Fix SRV lookup issues for MongoDB Atlas on Windows
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const MONGO_URI = process.env.MONGO_URI;
const CSV_FILE = path.join(__dirname, 'up_mandis.csv');

async function repair() {
    console.log('\n--- MANDI DATABASE REPAIR TASK ---');
    console.log('1. Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI, {
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
    });

    try {
        await client.connect();
        const db = client.db('farmdb');
        const collection = db.collection('mandilocations');

        console.log('2. Cleansing existing Mandi data...');
        const deleteRes = await collection.deleteMany({});
        console.log(`   ⏭️ Removed: ${deleteRes.deletedCount} old records`);

        console.log('3. Reading up_mandis.csv...');
        if (!fs.existsSync(CSV_FILE)) {
            throw new Error(`up_mandis.csv NOT FOUND at ${CSV_FILE}`);
        }

        const data = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
        
        // Skip header
        const mandis = [];
        console.log(`   📝 Parsing ${lines.length - 1} rows...`);

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            if (cols.length < 4) continue;
            
            const lat = parseFloat(cols[2]);
            const lng = parseFloat(cols[3]);

            if (isNaN(lat) || isNaN(lng)) {
                console.warn(`      ⚠️ Row ${i} skipped: Invalid coords (${cols[2]}, ${cols[3]})`);
                continue;
            }

            mandis.push({
                mandi_name: cols[0],
                district: cols[1],
                state: 'Uttar Pradesh',
                latitude: lat,
                longitude: lng,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        console.log(`4. Inserting ${mandis.length} verified mandis...`);
        if (mandis.length > 0) {
            const insertRes = await collection.insertMany(mandis, { ordered: false });
            console.log(`   ✅ INSERT SUCCESS: ${insertRes.insertedCount} records`);
        } else {
            console.log('   ❌ ERROR: NO DATA TO INSERT');
        }

        // Re-create indexes
        console.log('5. Re-indexing collection...');
        await collection.createIndex({ latitude: 1, longitude: 1 });
        await collection.createIndex({ mandi_name: 1, district: 1 }, { unique: true });
        console.log('   ✅ INDEXES READY');

        const finalCount = await collection.countDocuments();
        console.log(`--- FINISHED! TOTAL MANDIS IN DB: ${finalCount} ---\n`);

    } catch (err) {
        console.error('\n❌ REPAIR_FAILED:', err.message);
        if (err.message.includes('ECONNREFUSED')) {
            console.error('   💡 Try setting your Atlas IP whitelist to 0.0.0.0/0');
        }
    } finally {
        await client.close();
    }
}

repair();

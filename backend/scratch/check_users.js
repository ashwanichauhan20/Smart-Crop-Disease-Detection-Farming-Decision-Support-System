const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const users = await User.find({}).select('+password');
        console.log(`Found ${users.length} users:`);
        
        users.forEach(u => {
            const isHashed = u.password.startsWith('$2a$') || u.password.startsWith('$2b$');
            console.log(`- ${u.email} (${u.role}): ${isHashed ? 'Hashed' : 'PLAIN TEXT!'} -> ${u.password.substring(0, 10)}...`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();

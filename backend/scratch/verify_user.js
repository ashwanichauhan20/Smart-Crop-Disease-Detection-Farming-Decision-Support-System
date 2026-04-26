require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true }
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        const emailToFind = 'alokyadvaji00004@gmail.com';
        const user = await User.findOne({ email: emailToFind });
        
        if (user) {
            console.log('✅ Found User:', JSON.stringify({
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }, null, 2));
        } else {
            console.log('❌ User not found with exact email');
            const partial = await User.find({ email: /alokyadvaji/i });
            console.log('Similar emails found:', partial.map(u => u.email));
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
}

check();

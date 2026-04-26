const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config();

const User = require('./models/User');

async function fixUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log(`Found ${users.length} users in DB.`);
    
    let updated = 0;
    for (const user of users) {
      let needsSave = false;
      
      // Fix roles if they are not lowercase
      if (user.role && user.role !== user.role.toLowerCase()) {
        user.role = user.role.toLowerCase();
        needsSave = true;
      }
      
      // Auto-approve experts if they were pending and user wants them updated
      if (user.role === 'expert' && !user.approved) {
        user.approved = true;
        needsSave = true;
      }

      if (needsSave) {
        await user.save();
        updated++;
      }
    }
    
    console.log(`Updated ${updated} users.`);
    
    // Ensure Admin exists unconditionally
    const adminEmail = 'ashwanikumarchauhan014@gmail.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
        await User.create({
            name: 'Super Admin',
            email: adminEmail,
            password: 'Ashwani@2005',
            role: 'admin'
        });
        console.log(`Created admin user: ${adminEmail}`);
    } else {
        console.log('Admin user already exists.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

fixUsers();

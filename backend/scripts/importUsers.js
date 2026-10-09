require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const users = [
  {
    name: 'Admin User',
    email: 'admin@villagecrunch.com',
    password: process.env.SEED_ADMIN_PASSWORD || require('crypto').randomBytes(12).toString('base64url'),
    phone: '9876543210',
    role: 'admin',
    addresses: [{
      street: '123 Admin Street',
      city: 'Patna',
      state: 'Bihar',
      pincode: '800001',
      isDefault: true
    }]
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: require('crypto').randomBytes(12).toString('base64url'),
    phone: '9876543211',
    addresses: [{
      street: '456 Main Street',
      city: 'Patna',
      state: 'Bihar',
      pincode: '800002',
      isDefault: true
    }]
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: require('crypto').randomBytes(12).toString('base64url'),
    phone: '9876543212',
    addresses: [{
      street: '789 Oak Road',
      city: 'Gaya',
      state: 'Bihar',
      pincode: '823001',
      isDefault: true
    }]
  }
];

const importUsers = async () => {
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_WIPE_USERS !== 'yes') {
    console.error('Refusing to delete all users in production. Set CONFIRM_WIPE_USERS=yes to override.');
    process.exit(1);
  }
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️ Existing users deleted');

    // Insert new users
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Successfully imported ${createdUsers.length} users`);
    
    // Print user IDs for reference in orders
    console.log('\nUser IDs for reference:');
    createdUsers.forEach(user => {
      console.log(`${user.name}: ${user._id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing users:', error);
    process.exit(1);
  }
};

importUsers();
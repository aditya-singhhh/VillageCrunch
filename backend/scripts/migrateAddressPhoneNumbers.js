require('dotenv').config();
const db = require('../db');
const User = require('../models/User');

// Database connection
const connectDB = async () => {
  try {
    await db.connect();
      } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Migration function to add phone numbers to existing addresses
const migrateAddressPhoneNumbers = async () => {
  try {
    console.log('🔄 Starting address phone number migration...');

    // Find all users who have addresses without phone numbers
    const users = await User.find({
      'addresses': { $elemMatch: { phone: { $exists: false } } }
    });

    console.log(`📋 Found ${users.length} users with addresses missing phone numbers`);

    let updatedCount = 0;
    let totalAddressesUpdated = 0;

    for (const user of users) {
      let userUpdated = false;
      
      // Update each address that doesn't have a phone number
      user.addresses.forEach(address => {
        if (!address.phone) {
          address.phone = user.phone; // Use user's main phone number as default
          userUpdated = true;
          totalAddressesUpdated++;
          console.log(`  ✓ Added phone ${user.phone} to address for user ${user.email}`);
        }
      });

      if (userUpdated) {
        await user.save();
        updatedCount++;
      }
    }

    console.log(`✅ Migration completed successfully!`);
    console.log(`   📊 Users updated: ${updatedCount}`);
    console.log(`   📊 Total addresses updated: ${totalAddressesUpdated}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateAddressPhoneNumbers();
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
};

// Only run if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateAddressPhoneNumbers };
require('dotenv').config({ path: __dirname + '/../../.env' });
const mongoose = require('mongoose');
const Product = require('../../models/Product');

const updateMakhanaWeight = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in .env file');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Update all makhana products to 100gm
    const result = await Product.updateMany(
      { category: 'makhana' },
      { $set: { weight: '100gm' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} makhana products to 100gm`);

    // Display updated products
    const updatedProducts = await Product.find({ category: 'makhana' }, 'name weight price');
    console.log('\n📦 Updated Makhana Products:');
    updatedProducts.forEach(p => {
      console.log(`   - ${p.name}: ${p.weight} - ₹${p.price}`);
    });

    mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateMakhanaWeight();
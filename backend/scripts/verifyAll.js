require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const verifyAllData = async () => {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}\n`);

    // Verify Users
    console.log('=== Users Summary ===');
    const users = await User.find({});
    console.log(`Total Users: ${users.length}`);
    console.log('User Roles:', users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}));
    console.log('\nSample User:', {
      name: users[0].name,
      email: users[0].email,
      role: users[0].role,
      hasAddress: users[0].addresses.length > 0
    });

    // Verify Products
    console.log('\n=== Products Summary ===');
    const products = await Product.find({});
    console.log(`Total Products: ${products.length}`);
    const categories = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});
    console.log('Products by Category:', categories);
    console.log('Featured Products:', products.filter(p => p.featured).length);

    // Verify Orders
    console.log('\n=== Orders Summary ===');
    const orders = await Order.find({}).populate('user', 'name email');
    console.log(`Total Orders: ${orders.length}`);
    
    // Orders by status
    const orderStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    console.log('Orders by Status:', orderStatus);

    // Calculate total revenue
    const totalRevenue = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    console.log(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);

    // Average order value
    console.log(`Average Order Value: ₹${(totalRevenue / orders.length).toFixed(2)}`);

    // Sample order details
    const sampleOrder = orders[0];
    console.log('\nSample Order Details:');
    console.log({
      orderNumber: sampleOrder.orderNumber,
      customerName: sampleOrder.user.name,
      items: sampleOrder.items.length,
      totalPrice: sampleOrder.totalPrice,
      status: sampleOrder.status,
      isPaid: sampleOrder.isPaid
    });

    // Verify relationships
    console.log('\n=== Data Integrity Check ===');
    const orderUsers = await Order.distinct('user');
    console.log(`Users with orders: ${orderUsers.length}`);
    console.log(`Average orders per user: ${(orders.length / orderUsers.length).toFixed(1)}`);

    // Check product references in orders
    const orderProducts = orders.reduce((acc, order) => {
      order.items.forEach(item => acc.add(item.product.toString()));
      return acc;
    }, new Set());
    console.log(`Unique products in orders: ${orderProducts.size}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying data:', error);
    process.exit(1);
  }
};

verifyAllData();
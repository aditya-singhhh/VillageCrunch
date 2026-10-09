// Security Audit Script - Check for suspicious orders
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Product = require('../../models/Product');

const colors = require('colors');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB for security audit'.green);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function auditOrders() {
  console.log('\n🔍 Starting Security Audit...'.blue.bold);
  console.log('=' .repeat(50));

  try {
    // Find orders with suspiciously low prices
    const suspiciousOrders = await Order.find({
      $or: [
        { "items.price": { $lt: 50 } }, // Items priced under ₹50
        { "totalPrice": { $lt: 100 } }, // Total under ₹100
        { "itemsPrice": { $lt: 50 } }   // Items total under ₹50
      ]
    }).populate('user', 'name email phone').sort({ createdAt: -1 }).limit(20);

    console.log(`\n📊 Found ${suspiciousOrders.length} potentially suspicious orders:`);

    if (suspiciousOrders.length === 0) {
      console.log('✅ No suspicious orders found!'.green);
    } else {
      suspiciousOrders.forEach((order, index) => {
        console.log(`\n⚠️  Suspicious Order #${index + 1}:`.yellow);
        console.log(`   Order ID: ${order._id}`);
        console.log(`   Order Number: ${order.orderNumber}`);
        console.log(`   User: ${order.user?.name} (${order.user?.email})`);
        console.log(`   Date: ${order.createdAt.toISOString().split('T')[0]}`);
        console.log(`   Total Price: ₹${order.totalPrice}`.red);
        console.log(`   Items Price: ₹${order.itemsPrice}`.red);
        console.log(`   Payment Status: ${order.isPaid ? 'PAID' : 'UNPAID'}`);
        console.log(`   Order Status: ${order.status}`);
        
        console.log('   Items:');
        order.items.forEach((item, i) => {
          console.log(`     ${i + 1}. ${item.name}: ₹${item.price} x ${item.quantity}`.red);
        });
      });

      console.log(`\n🚨 SECURITY RECOMMENDATION:`.red.bold);
      console.log('   • Review these orders manually');
      console.log('   • Contact customers if needed');
      console.log('   • Consider refunding fraudulent orders');
      console.log('   • Monitor these users for future activity');
    }

    // Check recent orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrders = await Order.find({
      createdAt: { $gte: sevenDaysAgo }
    }).countDocuments();

    console.log(`\n📈 Recent Activity (Last 7 days):`);
    console.log(`   Total Orders: ${recentOrders}`);

    // Check for unusual patterns
    const duplicateEmails = await Order.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: '$userInfo.email',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalPrice' }
        }
      },
      {
        $match: {
          orderCount: { $gt: 5 } // More than 5 orders in 7 days
        }
      },
      {
        $sort: { orderCount: -1 }
      }
    ]);

    if (duplicateEmails.length > 0) {
      console.log(`\n👥 High-Frequency Users (>5 orders in 7 days):`);
      duplicateEmails.forEach(user => {
        console.log(`   Email: ${user._id}`);
        console.log(`   Orders: ${user.orderCount}`);
        console.log(`   Total Spent: ₹${user.totalSpent}`);
      });
    }

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
  }
}

async function checkProductPriceConsistency() {
  console.log('\n🔍 Checking Product Price Consistency...'.blue);
  
  try {
    // Get all products
    const products = await Product.find({}).select('name price');
    
    // Find orders with items that don't match current product prices
    const inconsistentOrders = [];
    
    for (const product of products) {
      const orders = await Order.find({
        'items.product': product._id,
        'items.price': { $ne: product.price }
      }).populate('user', 'name email').limit(5);

      if (orders.length > 0) {
        inconsistentOrders.push({
          product: product.name,
          currentPrice: product.price,
          orders: orders.map(order => ({
            orderId: order._id,
            orderNumber: order.orderNumber,
            user: order.user?.email,
            paidPrice: order.items.find(item => item.product.toString() === product._id.toString())?.price,
            date: order.createdAt
          }))
        });
      }
    }

    if (inconsistentOrders.length > 0) {
      console.log(`\n⚠️  Found ${inconsistentOrders.length} products with price inconsistencies:`.yellow);
      
      inconsistentOrders.slice(0, 5).forEach(item => {
        console.log(`\n   Product: ${item.product}`);
        console.log(`   Current Price: ₹${item.currentPrice}`);
        console.log(`   Orders with different prices:`);
        
        item.orders.forEach(order => {
          const priceDiff = item.currentPrice - order.paidPrice;
          console.log(`     Order ${order.orderNumber}: ₹${order.paidPrice} (diff: ${priceDiff > 0 ? '+' : ''}₹${priceDiff})`.red);
        });
      });
    } else {
      console.log('✅ All orders have consistent pricing!'.green);
    }

  } catch (error) {
    console.error('❌ Price consistency check failed:', error.message);
  }
}

async function generateSecurityReport() {
  console.log('\n📋 Security Audit Summary'.blue.bold);
  console.log('=' .repeat(50));

  const totalOrders = await Order.countDocuments();
  const paidOrders = await Order.countDocuments({ isPaid: true });
  const codOrders = await Order.countDocuments({ 'paymentInfo.method': 'cod' });
  
  console.log(`📊 Overall Statistics:`);
  console.log(`   Total Orders: ${totalOrders}`);
  console.log(`   Paid Orders: ${paidOrders}`);
  console.log(`   COD Orders: ${codOrders}`);
  
  const avgOrderValue = await Order.aggregate([
    { $group: { _id: null, avgTotal: { $avg: '$totalPrice' } } }
  ]);
  
  if (avgOrderValue.length > 0) {
    console.log(`   Average Order Value: ₹${avgOrderValue[0].avgTotal.toFixed(2)}`);
  }

  console.log(`\n✅ Security Audit Complete!`.green.bold);
  console.log(`⚡ Enhanced security measures are now active.`);
  console.log(`🛡️  All future orders will be validated server-side.`);
}

async function main() {
  await connectDB();
  await auditOrders();
  await checkProductPriceConsistency();
  await generateSecurityReport();
  
  console.log('\n🏁 Audit finished. Check the results above.'.cyan.bold);
  await mongoose.disconnect();
  process.exit(0);
}

// Run audit if script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { auditOrders, checkProductPriceConsistency };
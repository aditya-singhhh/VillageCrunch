require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Sample function to generate order number
const generateOrderNumber = () => {
  return 'ORD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
};

const createSampleOrders = async () => {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Get users and products for reference
    const users = await User.find({});
    const products = await Product.find({});

    if (users.length === 0 || products.length === 0) {
      console.log('❌ Please import users and products first');
      process.exit(1);
    }

    // Clear existing orders
    await Order.deleteMany({});
    console.log('🗑️ Existing orders deleted');

    // Create sample orders
    const orders = [];
    
    // Create orders for each user
    for (const user of users) {
      // Create 2 orders per user
      for (let i = 0; i < 2; i++) {
        // Randomly select 1-3 products for each order
        const orderProducts = [];
        const numProducts = Math.floor(Math.random() * 3) + 1;
        
        let itemsPrice = 0;
        for (let j = 0; j < numProducts; j++) {
          const product = products[Math.floor(Math.random() * products.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const price = product.price;
          
          orderProducts.push({
            product: product._id,
            name: product.name,
            image: product.image,
            quantity,
            price,
            weight: product.weight
          });
          
          itemsPrice += price * quantity;
        }

        const shippingPrice = itemsPrice > 999 ? 0 : 99;
        const taxPrice = Math.round(itemsPrice * 0.18); // 18% GST
        const totalPrice = itemsPrice + shippingPrice + taxPrice;

        const order = {
          user: user._id,
          orderNumber: generateOrderNumber(),
          items: orderProducts,
          shippingAddress: {
            name: user.name,
            phone: user.phone,
            ...user.addresses[0]
          },
          itemsPrice,
          shippingPrice,
          taxPrice,
          totalPrice,
          status: ['confirmed', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
          isPaid: true,
          paidAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          isDelivered: Math.random() > 0.3,
          deliveredAt: Math.random() > 0.3 ? new Date() : undefined,
          paymentInfo: {
            razorpayOrderId: 'order_' + Date.now() + Math.random().toString(36).substring(7),
            razorpayPaymentId: 'pay_' + Date.now() + Math.random().toString(36).substring(7),
            razorpaySignature: 'sign_' + Date.now() + Math.random().toString(36).substring(7),
            method: 'razorpay'
          }
        };

        if (order.status === 'delivered') {
          order.isDelivered = true;
          order.deliveredAt = new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000);
        }

        orders.push(order);
      }
    }

    // Insert orders
    const createdOrders = await Order.insertMany(orders);
    console.log(`✅ Successfully imported ${createdOrders.length} orders`);

    // Print some order statistics
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    console.log('\nOrders by status:');
    ordersByStatus.forEach(status => {
      console.log(`${status._id}: ${status.count} orders`);
    });

    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    console.log(`\nTotal Revenue: ₹${totalRevenue[0].total.toFixed(2)}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing orders:', error);
    process.exit(1);
  }
};

createSampleOrders();
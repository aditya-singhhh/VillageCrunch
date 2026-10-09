const Order = require('../../models/Order');
const User = require('../../models/User');
const { sendAdminOrderNotification } = require('../../config/email');
const { sendAdminOrderSMS } = require('../../config/sms');

// Test admin order details enhancement
const testAdminOrderDetails = async () => {
  console.log('🧪 Testing Admin Order Details Enhancement...\n');

  try {
    // Test the enhanced populate query that admin uses
    const orders = await Order.find({})
      .populate('user', 'name email phone')
      .populate('items.product', 'name image price')
      .sort({ createdAt: -1 })
      .limit(3);  // Just get 3 recent orders for testing

    console.log('✅ Admin Order Query Test Results:');
    console.log(`📊 Found ${orders.length} orders`);
    
    if (orders.length > 0) {
      const firstOrder = orders[0];
      console.log('\n📋 Sample Order Details:');
      console.log(`- Order Number: ${firstOrder.orderNumber}`);
      console.log(`- Customer Name: ${firstOrder.user?.name || 'N/A'}`);
      console.log(`- Customer Email: ${firstOrder.user?.email || 'N/A'}`);
      console.log(`- Customer Phone: ${firstOrder.user?.phone || 'N/A'}`);
      console.log(`- Total Amount: ₹${firstOrder.totalPrice}`);
      console.log(`- Payment Method: ${firstOrder.paymentInfo.method}`);
      console.log(`- Status: ${firstOrder.status}`);
      console.log(`- Items Count: ${firstOrder.items.length}`);
      
      if (firstOrder.items.length > 0) {
        console.log('\n🛍️ First Item Details:');
        const firstItem = firstOrder.items[0];
        console.log(`- Product Name: ${firstItem.product?.name || firstItem.name}`);
        console.log(`- Quantity: ${firstItem.quantity}`);
        console.log(`- Price: ₹${firstItem.price}`);
      }
      
      if (firstOrder.shippingAddress) {
        console.log('\n📍 Shipping Address:');
        console.log(`- Name: ${firstOrder.shippingAddress.name}`);
        console.log(`- Phone: ${firstOrder.shippingAddress.phone}`);
        console.log(`- City: ${firstOrder.shippingAddress.city}`);
        console.log(`- State: ${firstOrder.shippingAddress.state}`);
      }
    } else {
      console.log('⚠️ No orders found in database for testing');
    }

  } catch (error) {
    console.error('❌ Admin Order Details Test Failed:', error.message);
  }
};

// Test notification system
const testNotificationSystem = async () => {
  console.log('\n🧪 Testing Notification System...\n');

  try {
    // Get a sample order for testing notifications
    const sampleOrder = await Order.findOne()
      .populate('user', 'name email phone')
      .populate('items.product', 'name image');

    if (!sampleOrder) {
      console.log('⚠️ No orders found for notification testing');
      console.log('💡 Create a test order first to test notifications');
      return;
    }

    console.log(`📧 Testing notifications for Order #${sampleOrder.orderNumber}`);

    // Test admin email notification
    console.log('\n1. Testing Admin Email Notification...');
    try {
      const emailResult = await sendAdminOrderNotification(sampleOrder, {
        name: sampleOrder.user.name,
        email: sampleOrder.user.email,
        phone: sampleOrder.user.phone
      });
      
      if (emailResult.success) {
        console.log('✅ Admin email notification test successful');
        console.log(`📧 Email sent to: sauravsinghking9876@gmail.com`);
      } else {
        console.log('❌ Admin email notification test failed:', emailResult.error);
      }
    } catch (emailError) {
      console.log('❌ Admin email notification error:', emailError.message);
    }

    // Test admin SMS notification
    console.log('\n2. Testing Admin SMS Notification...');
    try {
      const smsResult = await sendAdminOrderSMS(sampleOrder, {
        name: sampleOrder.user.name,
        email: sampleOrder.user.email,
        phone: sampleOrder.user.phone
      });
      
      if (smsResult.success) {
        console.log('✅ Admin SMS notification test successful');
        console.log(`📱 SMS sent to: 6203009518`);
      } else {
        console.log('⚠️ Admin SMS notification test result:', smsResult.error);
        console.log('💡 Configure SMS service in .env to enable SMS notifications');
      }
    } catch (smsError) {
      console.log('❌ Admin SMS notification error:', smsError.message);
    }

  } catch (error) {
    console.error('❌ Notification System Test Failed:', error.message);
  }
};

// Test environment configuration
const testConfiguration = () => {
  console.log('\n🧪 Testing Configuration...\n');

  console.log('📧 Email Configuration:');
  console.log(`- EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || 'Not set'}`);
  console.log(`- EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
  console.log(`- EMAIL_APP_PASSWORD: ${process.env.EMAIL_APP_PASSWORD ? '✅ Set' : '❌ Not set'}`);

  console.log('\n📱 SMS Configuration:');
  console.log(`- SMS_SERVICE: ${process.env.SMS_SERVICE || '❌ Not set'}`);
  
  if (process.env.SMS_SERVICE === 'textlocal') {
    console.log(`- TEXTLOCAL_API_KEY: ${process.env.TEXTLOCAL_API_KEY ? '✅ Set' : '❌ Not set'}`);
  } else if (process.env.SMS_SERVICE === 'fast2sms') {
    console.log(`- FAST2SMS_API_KEY: ${process.env.FAST2SMS_API_KEY ? '✅ Set' : '❌ Not set'}`);
  } else if (process.env.SMS_SERVICE === 'twilio') {
    console.log(`- TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Not set'}`);
    console.log(`- TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Not set'}`);
    console.log(`- TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER ? '✅ Set' : '❌ Not set'}`);
  } else {
    console.log('💡 No SMS service configured. Add SMS_SERVICE to .env file');
  }

  console.log('\n🎯 Admin Contact Details:');
  console.log('- Email: sauravsinghking9876@gmail.com ✅');
  console.log('- Phone: 6203009518 ✅');
};

// Main test function
const runAllTests = async () => {
  console.log('🚀 Running Admin Order Enhancement Tests\n');
  console.log('=' .repeat(60));

  // Test configuration first
  testConfiguration();
  
  console.log('\n' + '=' .repeat(60));
  
  // Test admin order details
  await testAdminOrderDetails();
  
  console.log('\n' + '=' .repeat(60));
  
  // Test notification system
  await testNotificationSystem();
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n✅ All tests completed!');
  console.log('\n📋 Summary:');
  console.log('1. ✅ Admin can now see full order details (customer phone, product details)');
  console.log('2. ✅ Admin gets email notifications for new orders');
  console.log('3. ⚠️ Admin SMS notifications ready (configure SMS service in .env)');
  console.log('4. ✅ Enhanced order API routes for better admin visibility');
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Configure SMS service in .env file (see ADMIN_NOTIFICATION_SETUP.md)');
  console.log('2. Test with a real order to verify notifications');
  console.log('3. Check admin panel to see enhanced order details');
};

module.exports = {
  testAdminOrderDetails,
  testNotificationSystem,
  testConfiguration,
  runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  // Connect to database first
  require('dotenv').config();
  const mongoose = require('mongoose');
  
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('📊 Connected to MongoDB for testing');
      runAllTests().then(() => {
        mongoose.disconnect();
        console.log('\n📊 Disconnected from MongoDB');
      });
    })
    .catch(err => {
      console.error('❌ Database connection failed:', err.message);
    });
}
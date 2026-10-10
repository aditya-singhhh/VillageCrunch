// Test script for Live Order functionality
// Run this file to test the live order creation and management

const db = require('../db');
const LiveOrder = require('../models/LiveOrder');
const LiveOrderManager = require('./liveOrderManager');

// Test configuration
const testConfig = {
  testUserId: '507f1f77bcf86cd799439011', // Replace with a valid user ID from your database
};

async function connectDb() {
  try {
    await db.connect();
    console.log('✅ Connected to Firestore');
    return true;
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    return false;
  }
}

async function testLiveOrderCreation() {
  console.log('\n🧪 Testing Live Order Creation...');
  
  try {
    const testLiveOrder = new LiveOrder({
      razorpayOrderId: `test_order_${Date.now()}`,
      user: testConfig.testUserId,
      userInfo: {
        userId: testConfig.testUserId,
        name: 'Test User',
        email: 'test@example.com',
        phone: '9876543210',
      },
      amount: 599,
      currency: 'INR',
      cartItems: [
        {
          productId: '507f1f77bcf86cd799439012', // Replace with valid product ID
          name: 'Premium Almonds',
          price: 299,
          quantity: 1,
          weight: '250g',
          image: 'almond.jpg',
          category: 'dry-fruits',
        },
        {
          productId: '507f1f77bcf86cd799439013', // Replace with valid product ID
          name: 'Cashews',
          price: 350,
          quantity: 1,
          weight: '200g',
          image: 'cashew.jpg',
          category: 'dry-fruits',
        }
      ],
      priceBreakdown: {
        itemsPrice: 649,
        shippingPrice: 0,
        taxPrice: 116.82,
        totalPrice: 765.82,
        promocodeDiscount: 0,
      },
      status: 'created',
    });
    
    await testLiveOrder.save();
    console.log('✅ Live order created successfully:', testLiveOrder._id);
    
    return testLiveOrder;
  } catch (error) {
    console.error('❌ Error creating live order:', error);
    throw error;
  }
}

async function testLiveOrderQueries(testOrder) {
  console.log('\n🔍 Testing Live Order Queries...');
  
  try {
    // Test get all orders
    const allOrders = await LiveOrderManager.getAllOrders();
    console.log(`✅ Found ${allOrders.length} total orders`);
    
    // Test get orders by status
    const createdOrders = await LiveOrderManager.getAllOrders('created');
    console.log(`✅ Found ${createdOrders.length} orders with 'created' status`);
    
    // Test get order by Razorpay ID
    const orderByRazorpay = await LiveOrderManager.getOrderByRazorpayId(testOrder.razorpayOrderId);
    console.log(`✅ Found order by Razorpay ID:`, orderByRazorpay ? orderByRazorpay._id : 'Not found');
    
    // Test get orders by user
    const userOrders = await LiveOrderManager.getOrdersByUser(testConfig.testUserId);
    console.log(`✅ Found ${userOrders.length} orders for the test user`);
    
    // Test get statistics
    const stats = await LiveOrderManager.getOrderStats();
    console.log('✅ Order statistics:', JSON.stringify(stats, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Error testing queries:', error);
    throw error;
  }
}

async function testStatusUpdates(testOrder) {
  console.log('\n🔄 Testing Status Updates...');
  
  try {
    // Test status update
    await LiveOrderManager.updateOrderStatus(testOrder._id, 'payment_pending');
    console.log('✅ Updated status to payment_pending');
    
    await LiveOrderManager.updateOrderStatus(testOrder._id, 'paid');
    console.log('✅ Updated status to paid');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing status updates:', error);
    throw error;
  }
}

async function cleanupTestData(testOrder) {
  console.log('\n🗑️ Cleaning up test data...');
  
  try {
    await LiveOrder.findByIdAndDelete(testOrder._id);
    console.log('✅ Test order cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting Live Order Tests...');
  
  const connected = await connectDb();
  if (!connected) {
    console.log('❌ Cannot run tests without database connection');
    return;
  }
  
  let testOrder;
  try {
    // Test 1: Create live order
    testOrder = await testLiveOrderCreation();
    
    // Test 2: Query live orders
    await testLiveOrderQueries(testOrder);
    
    // Test 3: Update statuses
    await testStatusUpdates(testOrder);
    
    console.log('\n🎉 All tests passed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error);
  } finally {
    // Cleanup
    if (testOrder) {
      await cleanupTestData(testOrder);
    }
    
    // Close connection
    await db.disconnect();
    console.log('✅ Database connection closed');
  }
}

// Sample API testing functions
function generateSampleApiRequests() {
  console.log('\n📋 Sample API Requests for Testing:');
  console.log('=====================================\n');
  
  console.log('1. Create Payment Order (POST /api/payment/create-order):');
  console.log(JSON.stringify({
    amount: 599,
    cartItems: [
      {
        productId: '507f1f77bcf86cd799439012',
        price: 299,
        quantity: 1
      }
    ]
  }, null, 2));
  
  console.log('\n2. Get Live Orders (GET /api/live-orders):');
  console.log('Headers: { Authorization: "Bearer <admin-token>" }');
  
  console.log('\n3. Get Live Order Stats (GET /api/live-orders/stats):');
  console.log('Headers: { Authorization: "Bearer <admin-token>" }');
  
  console.log('\n4. Update Order Status (PUT /api/live-orders/:id/status):');
  console.log(JSON.stringify({
    status: 'paid'
  }, null, 2));
}

// Run tests if called directly
if (require.main === module) {
  console.log('⚠️  Before running tests, please update:');
  console.log('   - Firestore credentials (GOOGLE_APPLICATION_CREDENTIALS) or FIRESTORE_EMULATOR_HOST');
  console.log('   - Valid user ID in testConfig.testUserId');
  console.log('   - Valid product IDs in the test data\n');
  
  // generateSampleApiRequests();
  
  // Uncomment the line below to run tests
  // runTests();
}

module.exports = {
  connectDb,
  testLiveOrderCreation,
  testLiveOrderQueries,
  testStatusUpdates,
  cleanupTestData,
  runTests,
  generateSampleApiRequests
};
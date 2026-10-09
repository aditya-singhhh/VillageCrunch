// Simple test utility to debug API endpoints
const axios = require('axios');

const testEndpoints = async () => {
  try {
    console.log('🔍 Testing API endpoints...\n');

    // Test server health on different addresses
    const addresses = [
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://0.0.0.0:8080'
    ];

    for (const baseUrl of addresses) {
      try {
        console.log(`Testing ${baseUrl}...`);
        const response = await axios.get(`${baseUrl}/api/auth/stats`, {
          headers: { 
            'Authorization': 'Bearer invalid_token_for_testing' 
          },
          timeout: 2000
        });
        console.log('✅ Server is responding');
        break;
      } catch (error) {
        if (error.response) {
          console.log(`✅ Server responding at ${baseUrl} (expected auth error)`);
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Message: ${error.response.data?.message || 'No message'}`);
          break;
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`❌ Connection refused at ${baseUrl}`);
        } else {
          console.log(`⚠️  Connection issue at ${baseUrl}:`, error.message);
        }
      }
    }

    console.log('\n🎯 Test completed');
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
};

testEndpoints();
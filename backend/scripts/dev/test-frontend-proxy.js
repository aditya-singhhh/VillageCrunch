const axios = require('axios');

const testFrontendProxy = async () => {
  try {
    console.log('Testing frontend proxy on port 5174...');
    
    // Test the proxy route through the frontend server
    const healthResponse = await axios.get('http://localhost:5174/api/health');
    console.log('✅ Frontend proxy health check:', healthResponse.data);
    
    const productsResponse = await axios.get('http://localhost:5174/api/products');
    console.log('✅ Frontend proxy products endpoint working, found', productsResponse.data.length, 'products');
    
  } catch (error) {
    console.error('❌ Frontend proxy test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

testFrontendProxy();
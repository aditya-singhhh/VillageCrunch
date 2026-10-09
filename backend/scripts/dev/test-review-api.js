const axios = require('axios');

const testReviewAPI = async () => {
  try {
    console.log('Testing review API endpoint...');
    
    // Test if the API base URL is reachable
    const healthResponse = await axios.get('http://127.0.0.1:8080/api/health');
    console.log('✅ Backend health check:', healthResponse.data);
    
    // Test products endpoint
    const productsResponse = await axios.get('http://127.0.0.1:8080/api/products');
    console.log('✅ Products endpoint working, found', productsResponse.data.length, 'products');
    
    if (productsResponse.data.length > 0) {
      const productId = productsResponse.data[0]._id;
      console.log('Testing with product ID:', productId);
      
      // Test the review endpoint (this should fail with 401 since no auth)
      try {
        await axios.post(`http://127.0.0.1:8080/api/products/${productId}/reviews`, {
          rating: 5,
          comment: 'Test review'
        });
      } catch (error) {
        if (error.response.status === 401) {
          console.log('✅ Review endpoint exists (returned 401 - unauthorized as expected)');
        } else {
          console.log('❌ Unexpected error:', error.response.status, error.response.data);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ API Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

testReviewAPI();
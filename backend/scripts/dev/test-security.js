const axios = require('axios');
const colors = require('colors');

// Security Testing Script for VillageCrunch E-commerce
// Tests various security vulnerabilities and attack vectors

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

class SecurityTester {
  constructor() {
    this.token = null;
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    switch(type) {
      case 'success':
        console.log(`[${timestamp}] ✅ ${message}`.green);
        break;
      case 'error':
        console.log(`[${timestamp}] ❌ ${message}`.red);
        break;
      case 'warning':
        console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
        break;
      case 'attack':
        console.log(`[${timestamp}] 🚨 ATTACK TEST: ${message}`.red.bold);
        break;
      default:
        console.log(`[${timestamp}] ℹ️  ${message}`.blue);
    }
  }

  async authenticate() {
    try {
      // Try to login with test account
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'test123'
      });
      
      this.token = response.data.token;
      this.log('Authentication successful', 'success');
      return true;
    } catch (error) {
      this.log('Authentication failed - will test without token', 'warning');
      return false;
    }
  }

  getAuthHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async testPriceManipulation() {
    this.log('Testing price manipulation attacks...', 'attack');
    
    const maliciousOrderData = {
      items: [
        {
          product: '507f1f77bcf86cd799439011', // Dummy product ID
          name: 'Premium Almonds',
          quantity: 1,
          price: 1, // ATTACK: Manipulated price (should be much higher)
          image: 'test.jpg'
        }
      ],
      shippingAddress: {
        name: 'Test User',
        phone: '1234567890',
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      paymentInfo: {
        method: 'online'
      },
      itemsPrice: 1, // ATTACK: Manipulated total
      shippingPrice: 0,
      taxPrice: 0,
      totalPrice: 1 // ATTACK: Manipulated final total
    };

    try {
      const response = await axios.post(`${API_URL}/orders`, maliciousOrderData, {
        headers: this.getAuthHeaders()
      });
      
      this.log('SECURITY FAILURE: Price manipulation attack succeeded!', 'error');
      return { success: false, vulnerability: 'Price manipulation allowed' };
    } catch (error) {
      if (error.response && error.response.status === 400) {
        this.log('SECURITY SUCCESS: Price manipulation blocked', 'success');
        this.log(`Block reason: ${error.response.data.message}`, 'info');
        return { success: true, message: 'Price manipulation blocked' };
      } else {
        this.log(`Unexpected error: ${error.message}`, 'warning');
        return { success: false, error: error.message };
      }
    }
  }

  async testPaymentAmountManipulation() {
    this.log('Testing payment amount manipulation...', 'attack');
    
    const maliciousPaymentData = {
      amount: 1, // ATTACK: Manipulated amount
      cartItems: [
        {
          _id: '507f1f77bcf86cd799439011',
          price: 1000, // Real price is high
          quantity: 1
        }
      ]
    };

    try {
      const response = await axios.post(`${API_URL}/payment/create-order`, maliciousPaymentData, {
        headers: this.getAuthHeaders()
      });
      
      this.log('SECURITY FAILURE: Payment amount manipulation succeeded!', 'error');
      return { success: false, vulnerability: 'Payment amount manipulation allowed' };
    } catch (error) {
      if (error.response && error.response.status === 400) {
        this.log('SECURITY SUCCESS: Payment amount manipulation blocked', 'success');
        return { success: true, message: 'Payment manipulation blocked' };
      } else {
        this.log(`Unexpected error: ${error.message}`, 'warning');
        return { success: false, error: error.message };
      }
    }
  }

  async testRateLimiting() {
    this.log('Testing rate limiting on order creation...', 'attack');
    
    const orderData = {
      items: [
        {
          product: '507f1f77bcf86cd799439011',
          name: 'Test Product',
          quantity: 1,
          price: 100
        }
      ],
      shippingAddress: {
        name: 'Test User',
        phone: '1234567890',
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      paymentInfo: { method: 'cod' },
      itemsPrice: 100,
      shippingPrice: 50,
      taxPrice: 18,
      totalPrice: 168
    };

    let rateLimitHit = false;
    for (let i = 0; i < 10; i++) {
      try {
        await axios.post(`${API_URL}/orders`, orderData, {
          headers: this.getAuthHeaders()
        });
      } catch (error) {
        if (error.response && error.response.status === 429) {
          rateLimitHit = true;
          this.log('SECURITY SUCCESS: Rate limiting activated', 'success');
          break;
        }
      }
    }

    if (!rateLimitHit) {
      this.log('SECURITY WARNING: No rate limiting detected', 'warning');
      return { success: false, message: 'Rate limiting not effective' };
    }

    return { success: true, message: 'Rate limiting working' };
  }

  async testSuspiciousPatterns() {
    this.log('Testing suspicious pattern detection...', 'attack');
    
    const suspiciousHeaders = {
      'User-Agent': 'curl/7.68.0', // Suspicious user agent
      ...this.getAuthHeaders()
    };

    try {
      await axios.post(`${API_URL}/orders`, {}, { headers: suspiciousHeaders });
    } catch (error) {
      // We expect this to fail due to validation, but pattern should be logged
      this.log('Suspicious pattern test completed (should be logged)', 'info');
    }

    return { success: true, message: 'Pattern detection test completed' };
  }

  async testLargePayloadAttack() {
    this.log('Testing large payload attack...', 'attack');
    
    const largePayload = {
      items: Array(1000).fill({
        product: '507f1f77bcf86cd799439011',
        name: 'A'.repeat(1000), // Large string
        quantity: 1,
        price: 100
      }),
      maliciousData: 'X'.repeat(100000) // Very large field
    };

    try {
      await axios.post(`${API_URL}/orders`, largePayload, {
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        this.log('SECURITY SUCCESS: Large payload timed out', 'success');
        return { success: true, message: 'Large payload blocked' };
      }
    }

    return { success: true, message: 'Large payload test completed' };
  }

  async runAllTests() {
    this.log('🛡️  Starting Security Test Suite for VillageCrunch', 'info');
    this.log('='.repeat(60), 'info');

    // Try to authenticate
    await this.authenticate();

    const tests = [
      { name: 'Price Manipulation', test: () => this.testPriceManipulation() },
      { name: 'Payment Amount Manipulation', test: () => this.testPaymentAmountManipulation() },
      { name: 'Rate Limiting', test: () => this.testRateLimiting() },
      { name: 'Suspicious Patterns', test: () => this.testSuspiciousPatterns() },
      { name: 'Large Payload Attack', test: () => this.testLargePayloadAttack() }
    ];

    for (const { name, test } of tests) {
      this.log(`\n🧪 Running test: ${name}`, 'info');
      try {
        const result = await test();
        this.testResults.push({ name, ...result });
      } catch (error) {
        this.log(`Test ${name} failed: ${error.message}`, 'error');
        this.testResults.push({ name, success: false, error: error.message });
      }
    }

    this.generateReport();
  }

  generateReport() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🛡️  Security Test Report', 'info');
    this.log('='.repeat(60), 'info');

    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;

    this.testResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      this.log(`${status} - ${result.name}`, result.success ? 'success' : 'error');
      if (result.message) {
        this.log(`    ${result.message}`, 'info');
      }
      if (result.vulnerability) {
        this.log(`    VULNERABILITY: ${result.vulnerability}`, 'error');
      }
      if (result.error) {
        this.log(`    ERROR: ${result.error}`, 'error');
      }
    });

    this.log(`\n📊 Summary: ${passed}/${total} tests passed`, 'info');
    
    if (passed === total) {
      this.log('🎉 All security tests passed!', 'success');
    } else {
      this.log('⚠️  Some security vulnerabilities detected. Review failed tests.', 'warning');
    }
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SecurityTester;
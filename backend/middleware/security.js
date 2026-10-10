const rateLimit = require('express-rate-limit');

// Rate limiting for order creation (prevent spam orders)
const orderRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 orders per 15 minutes per IP
  message: {
    error: 'Too many order attempts. Please wait before placing another order.',
    code: 'ORDER_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log('🚨 SECURITY: Order rate limit exceeded');
    console.log('🚨 IP:', req.ip);
    console.log('🚨 User-Agent:', req.get('User-Agent'));
    if (req.user) {
      console.log('🚨 User:', req.user._id, req.user.email);
    }
    res.status(429).json({
      error: 'Too many order attempts. Please wait before placing another order.',
      code: 'ORDER_RATE_LIMIT'
    });
  }
});

// Rate limiting for payment creation
const paymentRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Maximum 10 payment attempts per 5 minutes per IP
  message: {
    error: 'Too many payment attempts. Please wait before trying again.',
    code: 'PAYMENT_RATE_LIMIT'
  },
  handler: (req, res) => {
    console.log('🚨 SECURITY: Payment rate limit exceeded');
    console.log('🚨 IP:', req.ip);
    console.log('🚨 User-Agent:', req.get('User-Agent'));
    if (req.user) {
      console.log('🚨 User:', req.user._id, req.user.email);
    }
    res.status(429).json({
      error: 'Too many payment attempts. Please wait before trying again.',
      code: 'PAYMENT_RATE_LIMIT'
    });
  }
});

// Rate limiting for cart operations
const cartRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Maximum 30 cart operations per minute per IP
  message: {
    error: 'Too many cart operations. Please slow down.',
    code: 'CART_RATE_LIMIT'
  }
});


// Generic API limiter (per IP) - protects every /api route from floods
const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.', code: 'API_RATE_LIMIT' },
});

// Strict limiter for credential endpoints: login, register, forgot/verify/reset password
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count towards the limit
  message: { message: 'Too many attempts. Please try again in 15 minutes.', code: 'AUTH_RATE_LIMIT' },
});

// Public form/lookup endpoints (contact form, promo code checks)
const publicFormRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.', code: 'FORM_RATE_LIMIT' },
});

// Security monitoring middleware
const securityMonitor = (req, res, next) => {
  // Log suspicious patterns
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /postman/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious && (req.path.includes('/orders') || req.path.includes('/payment'))) {
    console.log('⚠️ SECURITY: Suspicious user agent detected');
    console.log('⚠️ Path:', req.path);
    console.log('⚠️ User-Agent:', userAgent);
    console.log('⚠️ IP:', req.ip);
    if (req.user) {
      console.log('⚠️ User:', req.user._id, req.user.email);
    }
  }
  
  // Log large payloads (potential attack)
  if (req.body && JSON.stringify(req.body).length > 50000) {
    console.log('⚠️ SECURITY: Large payload detected');
    console.log('⚠️ Size:', JSON.stringify(req.body).length, 'characters');
    console.log('⚠️ Path:', req.path);
    console.log('⚠️ IP:', req.ip);
  }
  
  next();
};

// Price validation middleware
const validatePrices = async (req, res, next) => {
  // Only apply to order and payment routes
  if (!req.path.includes('/orders') && !req.path.includes('/payment')) {
    return next();
  }
  
  // Check for suspicious price patterns
  const bodyStr = JSON.stringify(req.body);
  
  // Look for common manipulation patterns
  if (bodyStr.includes('"price":1') || bodyStr.includes('"price":"1"')) {
    console.log('🚨 SECURITY ALERT: Suspicious price pattern detected (price: 1)');
    console.log('🚨 Body:', JSON.stringify(req.body, null, 2));
    console.log('🚨 User:', req.user ? req.user._id : 'Anonymous');
    console.log('🚨 IP:', req.ip);
  }
  
  if (bodyStr.includes('"totalPrice":1') || bodyStr.includes('"totalPrice":"1"')) {
    console.log('🚨 SECURITY ALERT: Suspicious total price detected (total: 1)');
    console.log('🚨 Body:', JSON.stringify(req.body, null, 2));
    console.log('🚨 User:', req.user ? req.user._id : 'Anonymous');
    console.log('🚨 IP:', req.ip);
  }
  
  next();
};

// Admin action logging
const logAdminActions = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    console.log('👑 ADMIN ACTION:');
    console.log('👑 User:', req.user.email);
    console.log('👑 Action:', req.method, req.originalUrl);
    console.log('👑 IP:', req.ip);
    console.log('👑 Time:', new Date().toISOString());
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('👑 Body:', JSON.stringify(req.body, null, 2));
    }
  }
  next();
};

module.exports = {
  apiRateLimit,
  authRateLimit,
  publicFormRateLimit,
  orderRateLimit,
  paymentRateLimit,
  cartRateLimit,
  securityMonitor,
  validatePrices,
  logAdminActions
};
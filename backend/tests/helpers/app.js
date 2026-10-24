/**
 * Builds an Express app with every API router mounted, wired to the in-memory fake
 * Firestore and with outbound integrations (email, SMS, Razorpay) stubbed.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-test-secret-test-secret-123';
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.ONLINE_PAYMENTS = 'on';
process.env.ALLOW_TEST_PAYMENTS = 'true';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';

const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const mongoSanitize = require('express-mongo-sanitize');
const jwt = require('jsonwebtoken');

process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(os.tmpdir(), `vc-test-uploads-${process.pid}`);

const { setDb } = require('../../db');
const { FakeFirestore } = require('./fakeFirestore');

const fake = new FakeFirestore();
setDb(fake);

/* ---- outbound stubs ------------------------------------------------------------ */
const sent = { sms: [], emails: [] };
const razorpayCalls = [];
const razorpayPaid = {};
const stub = (rel, exports) => {
  const p = require.resolve(rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
};
stub('../../config/email', {
  sendOrderConfirmationEmail: async (to) => void sent.emails.push({ type: 'order', to }),
  sendAdminOrderNotification: async () => {},
  sendPasswordResetEmail: async (to, token) => void sent.emails.push({ type: 'reset', to, token }),
});
stub('../../config/sms', {
  sendAdminOrderSMS: async () => {},
  sendCustomerOrderSMS: async () => {},
  sendSMS: async (phone, message) => void sent.sms.push({ phone, message }),
});
stub('../../config/razorpay', {
  orders: {
    create: async (opts) => {
      razorpayCalls.push(opts);
      return { id: `order_${razorpayCalls.length}_${Date.now()}`, amount: opts.amount, currency: opts.currency };
    },
    // tests set razorpayPaid[orderId] = { id, amount } to simulate a captured payment
    fetchPayments: async (orderId) => ({ items: razorpayPaid[orderId] ? [{ status: 'captured', ...razorpayPaid[orderId] }] : [] }),
  },
});

// Per-IP rate limiters would trip because every test request shares one loopback IP.
{
  const real = require('../../middleware/security');
  const pass = (req, res, next) => next();
  stub('../../middleware/security', {
    ...real,
    apiRateLimit: pass, authRateLimit: pass, publicFormRateLimit: pass,
    orderRateLimit: pass, paymentRateLimit: pass, cartRateLimit: pass,
  });
}

const models = {
  User: require('../../models/User'),
  Product: require('../../models/Product'),
  Order: require('../../models/Order'),
  LiveOrder: require('../../models/LiveOrder'),
  Cart: require('../../models/Cart'),
  Contact: require('../../models/Contact'),
  CustomerSupport: require('../../models/CustomerSupport'),
  Promocode: require('../../models/Promocode'),
  Campaign: require('../../models/Campaign'),
  Settings: require('../../models/Settings'),
  GharClaim: require('../../models/GharClaim'),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(mongoSanitize());
  const mount = (p, r) => app.use(p, require(r));
  mount('/api/auth', '../../routes/auth');
  mount('/api/products', '../../routes/products');
  mount('/api/orders', '../../routes/orders');
  mount('/api/payment', '../../routes/payment');
  mount('/api/live-orders', '../../routes/liveOrders');
  mount('/api/contact', '../../routes/contact');
  mount('/api/promocodes', '../../routes/promocodes');
  mount('/api/campaigns', '../../routes/campaigns');
  mount('/api/settings', '../../routes/settings');
  mount('/api/cart', '../../routes/cart');
  mount('/api/addresses', '../../routes/addresses');
  mount('/api/wishlist', '../../routes/wishlist');
  mount('/api/seo', '../../routes/seo');
  mount('/api/support', '../../routes/support');
  mount('/api/ghar', '../../routes/ghar');
  mount('/api/pincode', '../../routes/pincode');
  app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.message }));
  return app;
}

async function start() {
  const server = await new Promise((resolve) => {
    const s = http.createServer(buildApp()).listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  /** api('POST', '/api/x', body, token) -> { status, body } */
  const api = async (method, url, body, token) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json = null;
    const text = await res.text();
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = text; }
    return { status: res.status, body: json };
  };
  return { api, close: () => server.close() };
}

let seq = 0;
const uniq = () => `${Date.now().toString(36)}${(seq += 1)}`;

/** Create a user directly (bypassing the API) and return { user, token }. */
async function makeUser(over = {}) {
  const id = uniq();
  const user = await models.User.create({
    name: `User ${id}`,
    email: `user${id}@example.com`,
    phone: `9${String(100000000 + seq).slice(-9)}`,
    password: 'password123',
    ...over,
  });
  const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET);
  return { user, token };
}

const makeAdmin = (over = {}) => makeUser({ role: 'admin', ...over });

const makeProduct = (over = {}) =>
  models.Product.create({
    name: `Product ${uniq()}`, description: 'desc', category: 'dryfruits', price: 300, image: '/p.jpg', stock: 10, weight: '250g', ...over,
  });

const address = { name: 'Asha', phone: '9876543210', street: '1 MG Road', city: 'Patna', state: 'Bihar', pincode: '800001' };

const razorpaySignature = (orderId, paymentId) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

module.exports = { start, fake, models, sent, razorpayCalls, razorpayPaid, makeUser, makeAdmin, makeProduct, address, razorpaySignature, uniq };

/**
 * Offline tests (no MongoDB needed): models are stubbed so we can verify the
 * security-critical logic - server-side pricing, role escalation, payment gating.
 *   npm test
 */
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// --- Stub notification modules before routes load them ---------------------------
const stub = (rel, exports) => {
  const p = require.resolve(rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
};
stub('../config/email', {
  sendOrderConfirmationEmail: async () => {}, sendAdminOrderNotification: async () => {},
  sendPasswordResetEmail: async () => {},
});
stub('../config/sms', { sendAdminOrderSMS: async () => {}, sendCustomerOrderSMS: async () => {}, sendSMS: async () => {} });

const User = require('../models/User');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const Promocode = require('../models/Promocode');
const LiveOrder = require('../models/LiveOrder');
const Order = require('../models/Order');
const { priceCart, PricingError } = require('../services/pricing');

const oid = () => new mongoose.Types.ObjectId();
const P1 = { _id: oid(), name: 'Almonds', category: 'dryfruits', price: 300, stock: 10, image: '/a.jpg', weight: '250g' };
const P2 = { _id: oid(), name: 'Makhana', category: 'makhana', price: 100, stock: 1, image: '/m.jpg', weight: '100g' };
const MASALA = { _id: oid(), name: 'Garam Masala', category: 'Masala', price: 50, stock: 5, image: '/g.jpg' };
const products = [P1, P2, MASALA];

const settings = {
  pricing: {
    currency: 'INR', taxRate: 18, codCharges: 25,
    shippingCharges: { standard: { rate: 50, freeShippingThreshold: 500 } },
  },
};
Settings.getSettings = async () => settings;
Product.find = async (q) => {
  const ids = q._id.$in.map(String);
  return products.filter((p) => ids.includes(String(p._id)));
};
const stock = Object.fromEntries(products.map((p) => [String(p._id), p.stock]));
Product.updateOne = async (filter, update) => {
  const id = String(filter._id);
  if (filter.stock && stock[id] < filter.stock.$gte) return { modifiedCount: 0 };
  stock[id] += update.$inc.stock;
  return { modifiedCount: 1 };
};

const SAVE10 = {
  _id: oid(), code: 'SAVE10', type: 'percentage', value: 10, description: '10% off', isActive: true,
  canUserUse: () => true,
  calculateDiscount: (orderValue) => ({ valid: true, discount: Math.round(orderValue * 0.1) }),
};
Promocode.findOne = async ({ code }) => (code === 'SAVE10' ? SAVE10 : null);
Promocode.updateOne = async () => ({});

// ---------------------------------------------------------------------------------
test('priceCart computes shipping, GST on subtotal+shipping, and ignores client prices', async () => {
  const r = await priceCart({ items: [{ product: String(P1._id), quantity: 1, price: 1 }] });
  assert.equal(r.subtotal, 300);
  assert.equal(r.shipping, 50);           // below free-shipping threshold
  assert.equal(r.tax, 63);                // 18% of 350
  assert.equal(r.total, 413);
});

test('priceCart: free shipping above threshold, COD charge, promocode', async () => {
  const r = await priceCart({
    items: [{ productId: String(P1._id), quantity: 2 }], paymentMethod: 'cod', promocodeCode: 'save10',
  });
  assert.equal(r.shipping, 0);
  assert.equal(r.codCharge, 25);
  assert.equal(r.discount, 60);
  assert.equal(r.total, 600 + 108 + 25 - 60);
});

test('priceCart rejects negative/fractional/huge quantities, bad ids, masala, low stock, bad promo', async () => {
  const bad = async (items, extra = {}) =>
    assert.rejects(priceCart({ items, ...extra }), (e) => e instanceof PricingError);
  await bad([{ product: String(P1._id), quantity: -5 }]);
  await bad([{ product: String(P1._id), quantity: 1.5 }]);
  await bad([{ product: String(P1._id), quantity: 9999 }]);
  await bad([{ product: 'not-an-id', quantity: 1 }]);
  await bad([{ product: String(MASALA._id), quantity: 1 }]);
  await bad([{ product: String(P2._id), quantity: 2 }]);
  await bad([{ product: String(P1._id), quantity: 1 }], { promocodeCode: 'FAKE' });
  await bad([]);
});

// --- HTTP-level tests ---------------------------------------------------------------
const makeServer = (mount) => {
  const app = express();
  app.use(express.json());
  mount(app);
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
};
const post = (base, url, body, token) =>
  fetch(base + url, {
    method: url.includes('/pay') ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const customer = { _id: oid(), name: 'Cust', email: 'c@x.com', phone: '9999999999', role: 'user' };
const adminUser = { _id: oid(), name: 'Admin', email: 'a@x.com', role: 'admin' };
User.findById = (id) => ({ select: async () => [customer, adminUser].find((u) => String(u._id) === String(id)) });
const tokenFor = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET);

test('register ignores a client-supplied role', async () => {
  let created;
  User.findOne = async () => null;
  User.create = async (data) => { created = data; return { _id: oid(), ...data }; };
  const { server, base } = await makeServer((app) => app.use('/api/auth', require('../routes/auth')));
  const res = await post(base, '/api/auth/register', {
    name: 'Eve', email: 'eve@x.com', phone: '9876543210', password: 'longenough1', role: 'admin',
  });
  server.close();
  assert.equal(res.status, 201);
  assert.equal(created.role, 'user');
});

test('register rejects weak passwords', async () => {
  User.findOne = async () => null;
  const { server, base } = await makeServer((app) => app.use('/api/auth', require('../routes/auth')));
  const res = await post(base, '/api/auth/register', { name: 'E', email: 'e@x.com', phone: '9876543210', password: '123' });
  server.close();
  assert.equal(res.status, 400);
});

test('online order without a verified payment is rejected', async () => {
  LiveOrder.findOneAndUpdate = async () => null;
  const { server, base } = await makeServer((app) => app.use('/api/orders', require('../routes/orders')));
  const res = await post(base, '/api/orders', {
    items: [{ product: String(P1._id), quantity: 1, price: 300 }],
    shippingAddress: { name: 'A', phone: '9999999999', street: 's', city: 'c', state: 'st', pincode: '800001' },
    paymentInfo: { method: 'Online', razorpayOrderId: 'order_fake', razorpayPaymentId: 'pay_fake', razorpaySignature: 'x' },
    totalPrice: 1,
  }, tokenFor(customer));
  server.close();
  assert.equal(res.status, 402);
});

test('COD order: client-supplied shipping/tax/total/discount are ignored; stock is reserved', async () => {
  let saved;
  Order.create = async (data) => { saved = data; return { _id: oid(), ...data }; };
  User.findByIdAndUpdate = async () => ({});
  Order.findById = () => ({ populate: async () => ({}) });
  const before = stock[String(P1._id)];
  const { server, base } = await makeServer((app) => app.use('/api/orders', require('../routes/orders')));
  const res = await post(base, '/api/orders', {
    items: [{ product: String(P1._id), quantity: 1, price: 300 }],
    shippingAddress: { name: 'A', phone: '9999999999', street: 's', city: 'c', state: 'st', pincode: '800001' },
    paymentInfo: { method: 'cod' },
    itemsPrice: 300, shippingPrice: 0, taxPrice: 0, totalPrice: 1, promocodeDiscount: 9999,
  }, tokenFor(customer));
  server.close();
  assert.equal(res.status, 201);
  assert.equal(saved.totalPrice, 300 + 50 + 63 + 25);   // server-computed incl. COD charge
  assert.equal(saved.shippingPrice, 50);
  assert.equal(saved.promocodeDiscount, 0);
  assert.equal(saved.isPaid, false);
  assert.equal(stock[String(P1._id)], before - 1);
});

test('PUT /orders/:id/pay is admin only', async () => {
  const { server, base } = await makeServer((app) => app.use('/api/orders', require('../routes/orders')));
  const res = await post(base, `/api/orders/${oid()}/pay`, {}, tokenFor(customer));
  server.close();
  assert.equal(res.status, 403);
});

test.after(() => setTimeout(() => process.exit(0), 50));

/**
 * Smoke test of the data layer against REAL Firestore semantics (emulator or a dev project).
 * The unit tests use an in-memory fake; run this once against the emulator to confirm parity:
 *
 *   firebase emulators:exec --only firestore --project demo-villagecrunch "node scripts/smokeFirestore.js"
 */
const assert = require('node:assert/strict');
const db = require('../db');

(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Refusing to run without FIRESTORE_EMULATOR_HOST');
  await db.connect();
  const User = require('../models/User');
  const Product = require('../models/Product');
  const Order = require('../models/Order');

  const u = await User.create({ name: 'Smoke', email: `smoke${Date.now()}@example.com`, phone: '9876543210', password: 'password123' });
  await assert.rejects(User.create({ name: 'Dup', email: u.email, phone: '9876543211', password: 'password123' }), (e) => e.code === 11000);
  assert.ok((await User.findOne({ email: u.email })).comparePassword);

  const p = await Product.create({ name: 'Smoke Nut', description: 'd', category: 'dryfruits', price: 10, image: '/x', stock: 5, weight: '1kg' });
  const results = await Promise.all([1, 2, 3, 4, 5, 6, 7].map(() =>
    Product.findOneAndUpdate({ _id: p._id, stock: { $gte: 1 } }, { $inc: { stock: -1 } }, { new: true })));
  assert.equal(results.filter(Boolean).length, 5, 'exactly 5 of 7 concurrent decrements must succeed');
  assert.equal((await Product.findById(p._id)).stock, 0);
  assert.equal((await Product.find({ category: 'dryfruits' }).sort({ price: 1 }).limit(1)).length, 1);
  assert.equal(await Product.countDocuments({ _id: p._id }), 1);
  await Product.deleteOne({ _id: p._id });
  assert.equal(await Product.findById(p._id), null);
  void Order;
  console.log('Firestore smoke test passed');
  await db.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

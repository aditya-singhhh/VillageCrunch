/**
 * Data-layer tests (Firestore persistence for Mongoose schemas).
 * Runs against the strict in-memory fake by default.
 */
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { setDb } = require('../db');
const { FakeFirestore } = require('./helpers/fakeFirestore');

const fake = new FakeFirestore();
setDb(fake);

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Settings = require('../models/Settings');
const Promocode = require('../models/Promocode');
const Campaign = require('../models/Campaign');
const LiveOrder = require('../models/LiveOrder');

const mkProduct = (over = {}) => ({ name: 'Almonds', description: 'd', category: 'dryfruits', price: 300, image: '/a.jpg', stock: 10, ...over });
const mkUser = (over = {}) => ({ name: 'Asha', email: `a${Math.random().toString(36).slice(2)}@x.com`, phone: '9999999999', password: 'secret123', ...over });

test('create stores plain data under the document id; ids are 24-hex strings', async () => {
  const p = await Product.create(mkProduct());
  assert.match(String(p._id), /^[a-f0-9]{24}$/);
  const raw = fake.raw('products', String(p._id));
  assert.equal(raw.name, 'Almonds');
  assert.equal(raw.isActive, true); // schema default
  assert.ok(raw.createdAt instanceof Date && raw.updatedAt instanceof Date);
  assert.equal(raw._id, undefined);
});

test('findById / findOne / find with sort, limit, skip, select, lean', async () => {
  const a = await Product.create(mkProduct({ name: 'A', price: 10, category: 'sortcat' }));
  const b = await Product.create(mkProduct({ name: 'B', price: 30, category: 'sortcat' }));
  const c = await Product.create(mkProduct({ name: 'C', price: 20, category: 'sortcat' }));

  const found = await Product.findById(String(a._id));
  assert.equal(found.name, 'A');
  assert.equal(found.isNew, false);

  const byPrice = await Product.find({ category: 'sortcat' }).sort({ price: -1 });
  assert.deepEqual(byPrice.map((p) => p.name), ['B', 'C', 'A']);

  const page = await Product.find({ category: 'sortcat' }).sort('price').skip(1).limit(1);
  assert.deepEqual(page.map((p) => p.name), ['C']);

  const slim = await Product.find({ category: 'sortcat' }, 'name');
  assert.equal(slim[0].name !== undefined, true);
  assert.equal(slim[0].price, undefined);

  const noPrice = await Product.findById(String(b._id)).select('-price');
  assert.equal(noPrice.price, undefined);
  assert.equal(noPrice.name, 'B');

  const lean = await Product.find({ category: 'sortcat' }).lean();
  assert.equal(lean.length, 3);
  assert.equal(typeof lean[0]._id, 'string');
  assert.equal(await Product.findById('not-an-id'), null);
  assert.equal(c.name, 'C');
});

test('query operators: $in, $gt, $regex/$options, $or, $ne for missing field', async () => {
  const x = await Product.create(mkProduct({ name: 'Roasted Makhana', price: 100, category: 'opscat' }));
  const y = await Product.create(mkProduct({ name: 'Peri Peri', price: 250, category: 'opscat' }));
  assert.equal((await Product.find({ _id: { $in: [String(x._id), y._id] } })).length, 2);
  assert.equal((await Product.find({ category: 'opscat', price: { $gt: 100 } })).length, 1);
  assert.equal((await Product.find({ category: 'opscat', name: { $regex: 'MAKHANA', $options: 'i' } })).length, 1);
  assert.equal((await Product.find({ category: 'opscat', $or: [{ name: /peri/i }, { price: { $lt: 50 } }] })).length, 1);
  assert.equal((await Product.find({ category: 'opscat', isActive: { $ne: false } })).length, 2);
  assert.equal(await Product.countDocuments({ category: 'opscat' }), 2);
  assert.ok((await Product.countDocuments()) >= 2);
  await assert.rejects(Product.find({ category: 'opscat', price: { $bogus: 1 } }), /Unsupported query operator/);
});

test('save() writes only changed top-level fields (no lost stock update)', async () => {
  const p = await Product.create(mkProduct({ stock: 10 }));
  const stale = await Product.findById(String(p._id)); // loaded when stock was 10
  await Product.updateOne({ _id: p._id }, { $inc: { stock: -3 } }); // concurrent purchase
  stale.reviews.push({ name: 'R', rating: 5, comment: 'nice' });
  await stale.save();
  const fresh = await Product.findById(String(p._id));
  assert.equal(fresh.stock, 7, 'stock decrement must survive an unrelated save');
  assert.equal(fresh.reviews.length, 1);
  assert.ok(fresh.reviews.id(fresh.reviews[0]._id));
});

test('unique fields: duplicate create rejected with E11000, update re-keys, delete frees the key', async () => {
  const email = `dupe${Date.now()}@x.com`;
  const u = await User.create(mkUser({ email: email.toUpperCase() })); // lowercased by schema
  assert.equal(u.email, email);
  await assert.rejects(User.create(mkUser({ email })), (e) => e.code === 11000 && /email/.test(e.message));

  const other = await User.create(mkUser());
  other.email = email;
  await assert.rejects(other.save(), (e) => e.code === 11000);

  u.email = `renamed${Date.now()}@x.com`;
  await u.save();
  await User.create(mkUser({ email })); // old key was released

  const gone = await User.findOne({ email: u.email });
  await gone.deleteOne();
  await User.create(mkUser({ email: u.email }));
});

test('password is hashed once, even if the document is saved twice', async () => {
  const u = await User.create(mkUser({ password: 'plaintext1' }));
  const hash1 = u.password;
  assert.match(hash1, /^\$2[aby]\$/);
  u.name = 'Changed';
  await u.save();
  assert.equal(u.password, hash1);
  assert.equal(await u.comparePassword('plaintext1'), true);
  assert.equal(await u.comparePassword('nope'), false);
  const reloaded = await User.findById(String(u._id));
  assert.equal(await reloaded.comparePassword('plaintext1'), true);
  reloaded.password = 'newpassword1';
  await reloaded.save();
  assert.equal(await (await User.findById(String(u._id))).comparePassword('newpassword1'), true);
});

test('validation still applies (required, enum, min)', async () => {
  await assert.rejects(Product.create({ name: 'x' }), { name: 'ValidationError' });
  await assert.rejects(Order.create({ user: (await User.create(mkUser()))._id }), { name: 'ValidationError' });
  const p = await Product.create(mkProduct());
  p.stock = -1;
  await assert.rejects(p.save(), { name: 'ValidationError' });
});

test('populate: nested subdocument refs, array refs, field selection, and save after populate', async () => {
  const user = await User.create(mkUser({ name: 'Buyer' }));
  const p1 = await Product.create(mkProduct({ name: 'P1', price: 100 }));
  const p2 = await Product.create(mkProduct({ name: 'P2', price: 200 }));

  const order = await Order.create({
    user: user._id, orderNumber: `ORD${Date.now()}`,
    items: [{ product: p1._id, quantity: 2, price: 100 }, { product: p2._id, quantity: 1, price: 200 }],
    paymentInfo: { method: 'cod' }, itemsPrice: 400, shippingPrice: 0, taxPrice: 0, totalPrice: 400,
  });

  const got = await Order.findById(order._id).populate('user', 'name email').populate('items.product', 'name price');
  assert.equal(got.user.name, 'Buyer');
  assert.equal(got.user.password, undefined);
  assert.deepEqual(got.items.map((i) => i.product.name), ['P1', 'P2']);
  assert.equal(JSON.parse(JSON.stringify(got)).items[0].product.price, 100);

  // saving a populated document must write ids back, not embedded copies
  got.status = 'shipped';
  await got.save();
  const raw = fake.raw('orders', String(order._id));
  assert.equal(raw.status, 'shipped');
  assert.equal(typeof raw.items[0].product, 'string');
  assert.equal(typeof raw.user, 'string');

  // wishlist (array of refs)
  user.wishlist.push(p1._id, p2._id);
  await user.save();
  const withList = await User.findById(String(user._id)).select('-password').populate('wishlist');
  assert.deepEqual(withList.wishlist.map((p) => p.name).sort(), ['P1', 'P2']);
  assert.equal(withList.password, undefined);

  // review authors (ref inside subdocument array)
  p1.reviews.push({ user: user._id, name: 'Buyer', rating: 4, comment: 'ok' });
  await p1.save();
  const reviewed = await Product.findById(String(p1._id)).populate('reviews.user', 'name');
  assert.equal(reviewed.reviews[0].user.name, 'Buyer');

  // deleted reference populates to null instead of crashing
  await p2.deleteOne();
  const after = await Order.findById(order._id).populate('items.product', 'name');
  assert.equal(after.items[1].product, null);
});

test('findOneAndUpdate claims a document exactly once (payment claim pattern)', async () => {
  const lo = await LiveOrder.create({
    razorpayOrderId: `order_${Date.now()}`, user: (await User.create(mkUser()))._id,
    userInfo: { userId: 'u', name: 'n', email: 'e@x.com' }, amount: 100,
    cartItems: [{ productId: (await Product.create(mkProduct()))._id, name: 'n', price: 1, quantity: 1 }],
    status: 'paid', paymentVerified: true,
    notes: new Map([['cart_signature', 'abc'], ['promocode', 'SAVE10']]),
  });
  assert.equal(fake.raw('liveOrders', String(lo._id)).notes.promocode, 'SAVE10'); // Map stored as object

  const claim = () => LiveOrder.findOneAndUpdate(
    { razorpayOrderId: lo.razorpayOrderId, user: lo.user, paymentVerified: true, status: 'paid' },
    { $set: { status: 'converted_to_order' } }, { new: true }
  );
  const first = await claim();
  assert.equal(first.status, 'converted_to_order');
  assert.equal(first.notes.get('promocode'), 'SAVE10'); // Map restored on read
  assert.equal(await claim(), null);
});

test('updateOne with a stock guard never oversells', async () => {
  const p = await Product.create(mkProduct({ stock: 2 }));
  const reserve = () => Product.updateOne({ _id: p._id, stock: { $gte: 1 } }, { $inc: { stock: -1 } });
  assert.equal((await reserve()).modifiedCount, 1);
  assert.equal((await reserve()).modifiedCount, 1);
  assert.equal((await reserve()).modifiedCount, 0);
  assert.equal((await Product.findById(String(p._id))).stock, 0);
});

test('findByIdAndUpdate / $push / $pull / $unset / updateMany / findByIdAndDelete', async () => {
  const user = await User.create(mkUser());
  const camp = await Campaign.create({ name: 'C', type: 'seasonal', startDate: new Date(), endDate: new Date(Date.now() + 86400000), createdBy: user._id });
  const promo = await Promocode.create({ code: `p${Date.now()}`, name: 'P', type: 'fixed', value: 10, createdBy: user._id, campaign: camp._id });
  assert.equal(promo.code, promo.code.toUpperCase());

  await Campaign.findByIdAndUpdate(camp._id, { $push: { promocodes: promo._id } });
  let c = await Campaign.findById(camp._id).populate('promocodes', 'code name');
  assert.equal(c.promocodes[0].name, 'P');

  const updated = await Campaign.findByIdAndUpdate(camp._id, { status: 'active' }, { new: true, runValidators: true });
  assert.equal(updated.status, 'active');
  const stale = await Campaign.findByIdAndUpdate(camp._id, { status: 'paused' }); // returns the pre-update doc
  assert.equal(stale.status, 'active');
  await assert.rejects(Campaign.findByIdAndUpdate(camp._id, { status: 'bogus' }, { runValidators: true }), { name: 'ValidationError' });

  await Promocode.updateMany({ campaign: camp._id }, { $unset: { campaign: 1 } });
  assert.equal((await Promocode.findById(promo._id)).campaign, undefined);
  assert.equal(fake.raw('promocodes', String(promo._id)).campaign, undefined);

  await Campaign.findByIdAndUpdate(camp._id, { $pull: { promocodes: promo._id } });
  assert.equal((await Campaign.findById(camp._id)).promocodes.length, 0);

  const gone = await Campaign.findByIdAndDelete(camp._id);
  assert.equal(gone.name, 'C');
  assert.equal(await Campaign.findById(camp._id), null);
});

test('virtuals, schema methods and embedded subdocuments survive the round trip', async () => {
  const user = await User.create(mkUser());
  const promo = await Promocode.create({ code: `v${Date.now()}`, name: 'V', type: 'percentage', value: 10, createdBy: user._id, userUsageLimit: 1 });
  assert.equal(promo.isCurrentlyValid, true);
  assert.equal(promo.canUserUse(user._id), true);
  await Promocode.updateOne({ _id: promo._id }, { $push: { usedBy: { user: user._id, orderValue: 100, discountAmount: 10 } }, $inc: { usageCount: 1 } });
  const again = await Promocode.findById(promo._id);
  assert.equal(again.usageCount, 1);
  assert.equal(again.canUserUse(user._id), false);
  assert.equal(again.calculateDiscount(500).discount, 50);
});

test('Cart: one cart per user, instance methods persist', async () => {
  const user = await User.create(mkUser());
  const product = await Product.create(mkProduct());
  const cart = await Cart.create({ user: user._id, items: [] });
  await cart.addItem(product._id, 2, 300);
  assert.equal((await Cart.findOne({ user: user._id })).items[0].quantity, 2);
  await assert.rejects(Cart.create({ user: user._id, items: [] }), (e) => e.code === 11000);
  const loaded = await Cart.findOne({ user: user._id }).populate('items.product', 'name price');
  assert.equal(loaded.items[0].product.name, 'Almonds');
  assert.equal(loaded.getTotal(), 600);
  await loaded.clearCart();
  assert.equal((await Cart.findOne({ user: user._id })).items.length, 0);
});

test('Settings is a single fixed document', async () => {
  const a = await Settings.getSettings();
  const b = await Settings.getSettings();
  assert.equal(a._id, 'main');
  assert.equal(String(a._id), String(b._id));
  assert.equal(a.pricing.taxRate, 5);
  a.pricing.taxRate = 12;
  await a.save();
  assert.equal((await Settings.getSettings()).pricing.taxRate, 12);
});

test('nothing but plain values reaches Firestore (strict fake would throw otherwise)', async () => {
  const user = await User.create(mkUser());
  const p = await Product.create(mkProduct());
  const order = await Order.create({
    user: user._id, orderNumber: `ORD-${Date.now()}`, items: [{ product: p._id, quantity: 1, price: 300 }],
    paymentInfo: { method: 'Online', razorpayOrderId: 'o' }, itemsPrice: 300, shippingPrice: 50, taxPrice: 63, totalPrice: 413,
    promocode: { code: 'X', discount: 0 },
  });
  const raw = fake.raw('orders', String(order._id));
  assert.equal(typeof raw.user, 'string');
  assert.equal(typeof raw.items[0]._id, 'string');
  assert.ok(raw.createdAt instanceof Date);
});

test.after(() => setTimeout(() => process.exit(0), 50));

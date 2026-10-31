process.env.META_IN_TEST = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const h = require('./helpers/app');
const capi = require('../services/metaCapi');

let app;
const calls = [];
test.before(async () => {
  app = await h.start();
  capi.__setSender(async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); return { ok: true, text: async () => '' }; });
});
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');

test('token is write-only, rejected for non-admins, and saving it backfills recent orders once', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  // an order placed before tracking was set up
  const cod = await app.api('POST', '/api/orders', { items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address, paymentInfo: { method: 'cod' } }, buyer.token);
  assert.equal(cod.status, 201);
  assert.equal(calls.length, 0, 'nothing sent without a token');

  assert.equal((await app.api('PUT', '/api/settings/meta-capi', { token: 'x'.repeat(60) }, buyer.token)).status, 403);
  assert.equal((await app.api('PUT', '/api/settings/meta-capi', { token: 'bad token!' }, admin.token)).status, 400);
  const saved = await app.api('PUT', '/api/settings/meta-capi', { token: 'EAAB' + 'x'.repeat(80) }, admin.token);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.configured, true);
  assert.ok(saved.body.backfill.sent >= 1);
  const ev = calls.find((c) => c.body.data[0].event_id === `order_${cod.body._id}`);
  assert.ok(ev, 'backfilled order sent with the browser-matching event id');
  assert.match(ev.url, /\/2110816376318504\/events\?access_token=EAAB/);

  const info = await app.api('GET', '/api/settings/meta-capi', undefined, admin.token);
  assert.equal(info.body.configured, true);
  assert.equal(JSON.stringify(info.body).includes('EAAB'), false, 'token never returned');

  const n = calls.length;
  await app.api('POST', '/api/settings/meta-capi/backfill', {}, admin.token);
  assert.equal(calls.filter((c) => c.body.data[0].event_id === `order_${cod.body._id}`).length, 1, 'never sent twice');
  assert.ok(calls.length >= n);
});

test('new orders are sent with hashed customer data, value and Meta browser ids', async () => {
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  const fbc = 'fb.1.1761800000000.IwAR123abc';
  const fbp = 'fb.1.1761800000000.1234567890';
  const r = await app.api('POST', '/api/orders', { items: [{ product: String(p._id), quantity: 2 }], shippingAddress: h.address, paymentInfo: { method: 'cod' }, meta: { fbp, fbc } }, buyer.token);
  assert.equal(r.status, 201);
  await new Promise((res) => setTimeout(res, 50));
  const ev = calls.find((c) => c.body.data[0].event_id === `order_${r.body._id}`).body.data[0];
  assert.equal(ev.event_name, 'Purchase');
  assert.equal(ev.action_source, 'website');
  assert.equal(ev.custom_data.currency, 'INR');
  assert.equal(ev.custom_data.value, r.body.totalPrice);
  assert.equal(ev.custom_data.num_items, 2);
  assert.deepEqual(ev.user_data.ph, [sha('919876543210')]);
  assert.deepEqual(ev.user_data.zp, [sha('800001')]);
  assert.deepEqual(ev.user_data.ct, [sha('patna')]);
  assert.equal(ev.user_data.fbc, fbc);
  assert.equal(ev.user_data.fbp, fbp);
  assert.equal(JSON.stringify(ev).includes('9876543210"'), false, 'no raw phone');
  const saved = await h.models.Order.findById(r.body._id);
  assert.ok(saved.tracking.metaSentAt);
});

test('webhook-created order (customer never returned) is sent to Meta with the ids from checkout', async () => {
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  const fbc = 'fb.1.1761800000001.IwARwebhook';
  const pay = await app.api('POST', '/api/payment/create-order', { cartItems: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address, meta: { fbc } }, buyer.token);
  const admin = await h.makeAdmin();
  const secret = (await app.api('GET', '/api/payment/admin/webhook', undefined, admin.token)).body.secret;
  const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_capi', order_id: pay.body.orderId, amount: pay.body.amount, status: 'captured' } } } });
  const w = await app.raw('POST', '/api/payment/webhook', raw, { 'X-Razorpay-Signature': crypto.createHmac('sha256', secret).update(raw).digest('hex') });
  assert.equal(w.body.created, true);
  await new Promise((res) => setTimeout(res, 50));
  const ev = calls.find((c) => c.body.data[0].event_id === `order_${w.body.orderId}`);
  assert.ok(ev, 'sent');
  assert.equal(ev.body.data[0].user_data.fbc, fbc);
  assert.equal(ev.body.data[0].custom_data.value, 350);
});

test('admin settings response never leaks the Meta token or webhook secret', async () => {
  const admin = await h.makeAdmin();
  const s = await h.models.Settings.getSettings();
  const r = await app.api('GET', '/api/settings', undefined, admin.token);
  const body = JSON.stringify(r.body);
  assert.equal(body.includes('EAAB'), false);
  if (s.payments?.webhookSecret) assert.equal(body.includes(s.payments.webhookSecret), false);
});

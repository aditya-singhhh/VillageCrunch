process.env.WHATSAPP_IN_TEST = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const wa = require('../services/whatsapp');

let app;
const calls = [];
let fail = false;
test.before(async () => {
  app = await h.start();
  wa.__setSender(async (url, opts = {}) => {
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    calls.push({ url, body, auth: opts.headers?.Authorization });
    if (fail) return { ok: false, status: 400, json: async () => ({ error: { message: 'Template not approved' } }) };
    if (url.includes('/message_templates')) return { ok: true, status: 200, json: async () => ({ status: 'PENDING' }) };
    return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.1' }] }) };
  });
});
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });
const wait = () => new Promise((r) => setTimeout(r, 60));
const sends = (name) => calls.filter((c) => c.url.endsWith('/messages') && c.body.template.name === name);

test('nothing is sent until set up; token is write-only and admin-only', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 399, stock: 5 });
  const r = await app.api('POST', '/api/orders', { items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address, paymentInfo: { method: 'cod' } }, buyer.token);
  assert.equal(r.status, 201);
  await wait();
  assert.equal(calls.length, 0);

  assert.equal((await app.api('PUT', '/api/settings/whatsapp', { token: 'x'.repeat(60) }, buyer.token)).status, 403);
  assert.equal((await app.api('PUT', '/api/settings/whatsapp', { phoneNumberId: 'abc' }, admin.token)).status, 400);
  const saved = await app.api('PUT', '/api/settings/whatsapp', { token: 'EAAW' + 'y'.repeat(80), phoneNumberId: '123456789012345', wabaId: '987654321098765', supportPhone: '8271836123' }, admin.token);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.configured, true);
  for (const res of [saved, await app.api('GET', '/api/settings/whatsapp', undefined, admin.token), await app.api('GET', '/api/settings', undefined, admin.token)]) {
    assert.equal(JSON.stringify(res.body).includes('EAAW'), false, 'token never returned');
  }

  const t = await app.api('POST', '/api/settings/whatsapp/templates', {}, admin.token);
  assert.deepEqual(t.body, { placed: 'PENDING', shipped: 'PENDING', delivered: 'PENDING' });
  const created = calls.filter((c) => c.url.endsWith('/987654321098765/message_templates'));
  assert.equal(created.length, 3);
  assert.equal(created[0].body.category, 'UTILITY');
});

test('placed, shipped (only with tracking) and delivered go once each, to the delivery phone', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 399, stock: 5 });
  const r = await app.api('POST', '/api/orders', { items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address, paymentInfo: { method: 'cod' } }, buyer.token);
  await wait();
  const placed = sends('vc_order_placed').pop();
  assert.ok(placed, 'placed update sent');
  assert.equal(placed.body.to, '919876543210');
  assert.match(placed.url, /\/123456789012345\/messages$/);
  assert.match(placed.auth, /^Bearer EAAW/);
  const vals = placed.body.template.components[0].parameters.map((x) => x.text);
  assert.deepEqual(vals, ['Asha', r.body.orderNumber, String(Math.round(r.body.totalPrice)), '+91 82718 36123']);

  // shipped without a tracking number: wait
  await app.api('PUT', `/api/orders/${r.body._id}/status`, { status: 'shipped' }, admin.token);
  await wait();
  assert.equal(sends('vc_order_shipped').length, 0);

  // with a Speed Post number: sent once
  await app.api('PUT', `/api/orders/${r.body._id}/status`, { status: 'shipped', trackingNumber: 'EE123456789IN' }, admin.token);
  await wait();
  await app.api('PUT', `/api/orders/${r.body._id}/status`, { status: 'shipped', trackingNumber: 'EE123456789IN' }, admin.token);
  await wait();
  const shipped = sends('vc_order_shipped');
  assert.equal(shipped.length, 1);
  const sv = shipped[0].body.template.components[0].parameters.map((x) => x.text);
  assert.equal(sv[2], 'India Post (Speed Post)');
  assert.equal(sv[3], 'EE123456789IN on indiapost.gov.in');

  await app.api('PUT', `/api/orders/${r.body._id}/status`, { status: 'delivered' }, admin.token);
  await wait();
  assert.equal(sends('vc_order_delivered').length, 1);
});

test('a failed send does not break the order and can be retried later', async () => {
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 399, stock: 5 });
  fail = true;
  const r = await app.api('POST', '/api/orders', { items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address, paymentInfo: { method: 'cod' } }, buyer.token);
  assert.equal(r.status, 201);
  await wait();
  fail = false;
  const order = await h.models.Order.findById(r.body._id);
  assert.equal(order.notified?.placed, undefined, 'not marked as sent');
  assert.equal(await wa.notify(order, 'placed'), 'sent');
  assert.equal(await wa.notify(await h.models.Order.findById(r.body._id), 'placed'), 'skipped:already');
});

test('Shiprocket tracking link is used when booked there', () => {
  assert.deepEqual(wa.trackingFor({ shiprocket: { awb: 'A1', courier: 'Delhivery' } }), { courier: 'Delhivery', link: 'https://shiprocket.co/tracking/A1' });
  assert.equal(wa.trackingFor({}), null);
  assert.equal(wa.toE164('98765 43210'), '919876543210');
});

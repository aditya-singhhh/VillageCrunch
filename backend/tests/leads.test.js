const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const Lead = require('../models/Lead');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('leads: phone typed at checkout is saved once, updated, admin-only list, converted on order', async () => {
  const phone = '9123456780';
  assert.equal((await app.api('POST', '/api/leads', { phone: '12345' })).status, 400);
  assert.equal((await app.api('POST', '/api/leads', { phone, items: [{ productId: 'x', name: 'Thekua 400 g', quantity: 1, price: 399 }], total: 399, source: 'facebook' })).status, 204);
  assert.equal((await app.api('POST', '/api/leads', { phone: `+91 ${phone}`, name: 'Riya' })).status, 204);
  const rows = await Lead.find({ phone });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Riya');
  assert.equal(rows[0].total, 399);

  const { token: userToken } = await h.makeUser();
  assert.equal((await app.api('GET', '/api/leads', undefined, userToken)).status, 403);
  const { token } = await h.makeAdmin();
  const list = await app.api('GET', '/api/leads', undefined, token);
  assert.equal(list.status, 200);
  assert.ok(list.body.some((l) => l.phone === phone && l.status === 'open'));

  // A COD order with that phone closes the lead
  const p = await h.makeProduct({ price: 399 });
  const { token: buyer } = await h.makeUser();
  const order = await app.api('POST', '/api/orders', { items: [{ productId: String(p._id), quantity: 1 }], shippingAddress: { ...h.address, phone }, paymentInfo: { method: 'cod' } }, buyer);
  assert.equal(order.status, 201, JSON.stringify(order.body));
  await new Promise((r) => setTimeout(r, 50));
  const after = await Lead.findOne({ phone });
  assert.equal(after.status, 'converted');
});

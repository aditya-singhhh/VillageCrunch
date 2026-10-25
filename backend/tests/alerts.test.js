const test = require('node:test');
const assert = require('node:assert/strict');
process.env.ALERTS_IN_TEST = '1';
const h = require('./helpers/app');
const alerts = require('../services/alerts');

let app;
const calls = [];
test.before(async () => {
  app = await h.start();
  alerts.__setSender(async (url, opts) => { calls.push({ url, opts }); return { ok: true }; });
});
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('alerts: new order pushes to a private topic with no phone/address; admin can read topic and send a test', async () => {
  const p = await h.makeProduct({ price: 399, name: 'Thekua 400 g' });
  const { token } = await h.makeUser();
  const res = await app.api('POST', '/api/orders', { items: [{ productId: String(p._id), quantity: 1 }], shippingAddress: h.address, paymentInfo: { method: 'cod' } }, token);
  assert.equal(res.status, 201);
  await new Promise((r) => setTimeout(r, 100));
  const call = calls.find((c) => /ntfy\.sh\/vc-orders-/.test(c.url));
  assert.ok(call, 'pushed');
  const body = call.opts.body.toString();
  assert.match(call.opts.headers.Title, /New order Rs .* - COD/);
  assert.match(body, /Thekua 400 g x1/);
  assert.ok(!body.includes(h.address.phone) && !body.includes(h.address.street), 'no personal data');

  const { token: adminToken } = await h.makeAdmin();
  const { token: userToken } = await h.makeUser();
  assert.equal((await app.api('GET', '/api/settings/alerts', undefined, userToken)).status, 403);
  const info = await app.api('GET', '/api/settings/alerts', undefined, adminToken);
  assert.equal(info.status, 200);
  assert.ok(call.url.endsWith(info.body.topic));
  const t = await app.api('POST', '/api/settings/alerts/test', {}, adminToken);
  assert.equal(t.body.ok, true);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const Feedback = require('../models/Feedback');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('feedback: login required, order attached from the account, photos, admin list', async () => {
  assert.equal((await app.api('POST', '/api/feedback', { rating: 5 })).status, 401);

  const p = await h.makeProduct({ price: 399 });
  const { user, token } = await h.makeUser({ name: 'Riya' });
  const placed = await app.api('POST', '/api/orders', { items: [{ productId: String(p._id), quantity: 1 }], shippingAddress: h.address, paymentInfo: { method: 'cod' } }, token);
  assert.equal(placed.status, 201, JSON.stringify(placed.body));

  assert.equal((await app.api('POST', '/api/feedback', { rating: 0 }, token)).status, 400);
  const ok = await app.api('POST', '/api/feedback', { rating: 5, condition: 'perfect', reorder: 'yes', comment: '  Bahut   badhiya  ' }, token);
  assert.equal(ok.status, 201);
  const row = (await Feedback.find({ user: String(user._id) }))[0];
  assert.equal(row.order, placed.body.orderNumber);
  assert.equal(row.comment, 'Bahut badhiya');
  assert.equal(row.name, 'Riya');

  // multipart with a photo; non-images rejected
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const fd = new FormData();
  fd.append('rating', '2'); fd.append('condition', 'many_broken');
  fd.append('images', new Blob([png], { type: 'image/png' }), 'a.png');
  const up = await fetch(`${app.base}/api/feedback`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  assert.equal(up.status, 201);
  const withPhoto = (await Feedback.find({ user: String(user._id) })).find((x) => x.rating === 2);
  assert.equal(withPhoto.images.length, 1);
  assert.match(withPhoto.images[0], /^\/uploads\/feedback-images\/fb-.*\.png$/);
  const bad = new FormData(); bad.append('rating', '4'); bad.append('images', new Blob(['<html>'], { type: 'text/html' }), 'x.html');
  assert.equal((await fetch(`${app.base}/api/feedback`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: bad })).status, 400);

  assert.equal((await app.api('GET', '/api/feedback', undefined, token)).status, 403);
  const { token: adminToken } = await h.makeAdmin();
  const list = await app.api('GET', '/api/feedback', undefined, adminToken);
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 2);
  const upd = await app.api('PUT', `/api/feedback/${row._id}`, { status: 'handled' }, adminToken);
  assert.equal(upd.body.status, 'handled');
});

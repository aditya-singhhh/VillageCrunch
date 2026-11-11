const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const dl = require('../services/delhivery');

let app;
const calls = [];
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
test.before(async () => {
  app = await h.start();
  dl.__setSender(async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body, auth: opts.headers?.Authorization });
    if (opts.headers?.Authorization !== 'Token goodtoken1234567890abcdef') return json(401, { detail: 'Invalid token' });
    if (url.includes('/c/api/pin-codes/json/')) return json(200, { delivery_codes: [{ postal_code: { pin: 800001, cod: 'Y', pre_paid: 'Y', city: 'Patna', state_code: 'BR' } }] });
    if (url.includes('/api/kinko/v1/invoice/charges/')) return json(200, [{ total_amount: 67.26 }]);
    if (url.endsWith('/api/cmu/create.json')) return json(200, { success: true, packages: [{ waybill: '1234567890123', status: 'Success', remarks: [] }] });
    if (url.endsWith('/fm/request/new/')) return json(200, { pickup_id: 99 });
    if (url.includes('/api/p/packing_slip')) return json(200, { packages: [{ pdf_download_link: 'https://dl.example/label.pdf' }] });
    if (url.endsWith('/api/p/edit')) return json(200, { status: true });
    return json(404, { error: 'unexpected ' + url });
  });
});
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('connect: admin only, bad token rejected, token never returned', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  assert.equal((await app.api('PUT', '/api/settings/delhivery', { token: 'goodtoken1234567890abcdef' }, buyer.token)).status, 403);
  const bad = await app.api('PUT', '/api/settings/delhivery', { token: 'wrongtoken1234567890abcd' }, admin.token);
  assert.equal(bad.status, 400);
  assert.match(bad.body.message, /token/i);
  const ok = await app.api('PUT', '/api/settings/delhivery', { token: 'goodtoken1234567890abcdef', pickupPincode: '811211' }, admin.token);
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.configured, true);
  for (const r of [ok, await app.api('GET', '/api/settings/delhivery', undefined, admin.token), await app.api('GET', '/api/settings', undefined, admin.token)]) {
    assert.equal(JSON.stringify(r.body).includes('goodtoken'), false, 'token never returned');
  }
});

test('quote, book (AWB + pickup + label, marked shipped), cancel and re-book with a new order id', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 499, stock: 5 });
  const placed = await app.api('POST', '/api/orders', { items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address, paymentInfo: { method: 'cod' } }, buyer.token);
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  const id = placed.body._id;

  assert.equal((await app.api('GET', `/api/orders/${id}/delhivery/quote`, undefined, buyer.token)).status, 403);
  const q = await app.api('GET', `/api/orders/${id}/delhivery/quote`, undefined, admin.token);
  assert.equal(q.status, 200, JSON.stringify(q.body));
  assert.equal(q.body.ok, true);
  assert.equal(q.body.rate, 67);
  assert.match(calls.find((c) => c.url.includes('charges')).url, /pt=COD/);

  const b = await app.api('POST', `/api/orders/${id}/delhivery/book`, {}, admin.token);
  assert.equal(b.status, 200, JSON.stringify(b.body));
  assert.equal(b.body.status, 'shipped');
  assert.equal(b.body.trackingNumber, '1234567890123');
  assert.equal(b.body.delhivery.pickupRequested, true);
  assert.match(b.body.delhivery.labelUrl, /label\.pdf$/);
  assert.equal(b.body.trackingUrl, 'https://www.delhivery.com/track-v2/package/1234567890123');
  const sent = JSON.parse(new URLSearchParams(calls.filter((c) => c.url.endsWith('/api/cmu/create.json')).pop().body).get('data'));
  const s = sent.shipments[0];
  assert.equal(s.payment_mode, 'COD');
  assert.equal(s.cod_amount, String(Math.round(placed.body.totalPrice)));
  assert.equal(s.order, placed.body.orderNumber);
  assert.equal(s.phone, '9876543210');
  assert.equal(sent.pickup_location.name, 'VILLAGECRUNCH B2C');

  const again = await app.api('POST', `/api/orders/${id}/delhivery/book`, {}, admin.token);
  assert.equal(again.body.trackingNumber, '1234567890123');
  assert.equal(calls.filter((c) => c.url.endsWith('/api/cmu/create.json')).length, 1, 'already booked: no second shipment');

  const c = await app.api('POST', `/api/orders/${id}/delhivery/cancel`, {}, admin.token);
  assert.equal(c.status, 200, JSON.stringify(c.body));
  assert.equal(c.body.status, 'processing');
  assert.equal(c.body.trackingNumber, '');
  const b2 = await app.api('POST', `/api/orders/${id}/delhivery/book`, {}, admin.token);
  assert.equal(b2.body.status, 'shipped');
  const sent2 = JSON.parse(new URLSearchParams(calls.filter((x) => x.url.endsWith('/api/cmu/create.json')).pop().body).get('data'));
  assert.equal(sent2.shipments[0].order, `${placed.body.orderNumber}-D2`);
});

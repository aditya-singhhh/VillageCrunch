const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const sr = require('../services/shiprocket');

let app;
const calls = [];
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
let wallet = true;
test.before(async () => {
  app = await h.start();
  sr.__setSender(async (url, opts = {}) => {
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    calls.push({ url, method: opts.method || 'GET', body, auth: opts.headers?.Authorization });
    if (url.endsWith('/auth/login')) {
      return body.password === 'right-pass' ? json(200, { token: 'tok123' }) : json(400, { message: 'Invalid email and password combination' });
    }
    if (url.includes('/courier/serviceability/')) {
      return json(200, { data: { recommended_courier_company_id: 2, available_courier_companies: [
        { courier_company_id: 1, courier_name: 'Slow Surface', rate: 62.4, estimated_delivery_days: '6', rating: 3.9, is_surface: true },
        { courier_company_id: 2, courier_name: 'Fast Air', rate: 95, estimated_delivery_days: '3', rating: 4.5 },
      ] } });
    }
    if (url.endsWith('/orders/create/adhoc')) return json(200, { order_id: 9001, shipment_id: 7001, status: 'NEW' });
    if (url.endsWith('/courier/assign/awb')) {
      return wallet
        ? json(200, { awb_assign_status: 1, response: { data: { awb_code: 'AWB555', courier_name: 'Fast Air', courier_company_id: 2 } } })
        : json(400, { message: 'Insufficient balance in wallet' });
    }
    if (url.endsWith('/courier/generate/pickup')) return json(200, { pickup_status: 1 });
    if (url.endsWith('/courier/generate/label')) return json(200, { label_created: 1, label_url: 'https://kr-shipmultichannel.s3.amazonaws.com/label.pdf' });
    return json(404, { message: 'unexpected ' + url });
  });
});
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('connect: admin only, wrong password rejected, password never returned', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  assert.equal((await app.api('PUT', '/api/settings/shiprocket', { email: 'api@vc.in', password: 'right-pass' }, buyer.token)).status, 403);
  const bad = await app.api('PUT', '/api/settings/shiprocket', { email: 'api@vc.in', password: 'nope' }, admin.token);
  assert.equal(bad.status, 400);
  assert.match(bad.body.message, /Invalid email/);
  assert.equal((await app.api('GET', '/api/settings/shiprocket', undefined, admin.token)).body.configured, false);

  const ok = await app.api('PUT', '/api/settings/shiprocket', { email: 'API@vc.in', password: 'right-pass', pickupLocation: 'Home', pickupPincode: '811212' }, admin.token);
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.configured, true);
  assert.equal(ok.body.email, 'api@vc.in');
  const all = await app.api('GET', '/api/settings', undefined, admin.token);
  const info = await app.api('GET', '/api/settings/shiprocket', undefined, admin.token);
  for (const r of [ok, info, all]) {
    const s = JSON.stringify(r.body);
    assert.equal(s.includes('right-pass'), false, 'password never returned');
    assert.equal(s.includes('tok123'), false, 'token never returned');
  }
});

test('couriers listed cheapest first; booking marks shipped, saves AWB, and is not repeated', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 399, stock: 5 });
  const placed = await app.api('POST', '/api/orders', { items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address, paymentInfo: { method: 'cod' } }, buyer.token);
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  const id = placed.body._id;

  assert.equal((await app.api('GET', `/api/orders/${id}/shiprocket/couriers`, undefined, buyer.token)).status, 403);
  const c = await app.api('GET', `/api/orders/${id}/shiprocket/couriers`, undefined, admin.token);
  assert.equal(c.status, 200, JSON.stringify(c.body));
  assert.deepEqual(c.body.couriers.map((x) => x.name), ['Slow Surface', 'Fast Air']);
  assert.equal(c.body.couriers[1].recommended, true);
  const sv = calls.filter((x) => x.url.includes('serviceability')).pop();
  assert.match(sv.url, /pickup_postcode=811212&delivery_postcode=800001&weight=0\.5&cod=1/);
  assert.equal(sv.auth, 'Bearer tok123');

  // no money in the wallet: clear error, order stays unshipped, Shiprocket order remembered
  wallet = false;
  const fail = await app.api('POST', `/api/orders/${id}/shiprocket/book`, { courierId: 2 }, admin.token);
  assert.equal(fail.status, 400);
  assert.match(fail.body.message, /Insufficient balance/);
  wallet = true;

  const b = await app.api('POST', `/api/orders/${id}/shiprocket/book`, { courierId: 2 }, admin.token);
  assert.equal(b.status, 200, JSON.stringify(b.body));
  assert.equal(b.body.status, 'shipped');
  assert.equal(b.body.trackingNumber, 'AWB555');
  assert.equal(b.body.shiprocket.courier, 'Fast Air');
  assert.equal(b.body.shiprocket.pickupRequested, true);
  assert.match(b.body.shiprocket.labelUrl, /label\.pdf$/);
  assert.equal(b.body.trackingUrl, 'https://shiprocket.co/tracking/AWB555');
  assert.equal(calls.filter((x) => x.url.endsWith('/orders/create/adhoc')).length, 1, 'retry reused the Shiprocket order');

  const created = calls.find((x) => x.url.endsWith('/orders/create/adhoc')).body;
  assert.equal(created.payment_method, 'COD');
  assert.equal(created.pickup_location, 'Home');
  assert.equal(created.billing_pincode, '800001');
  assert.equal(created.billing_phone, '9876543210');
  assert.equal(created.order_id, placed.body.orderNumber);
  assert.equal(created.sub_total, placed.body.totalPrice);
  assert.equal(created.total_discount, 0, 'value = what the customer pays (COD amount)');
  const again2 = await app.api('GET', `/api/orders/${id}/shiprocket/couriers`, undefined, admin.token);
  assert.equal(again2.status, 200);
  assert.match(calls.filter((x) => x.url.includes('serviceability')).pop().url, /order_id=9001/);

  const again = await app.api('POST', `/api/orders/${id}/shiprocket/book`, { courierId: 1 }, admin.token);
  assert.equal(again.body.trackingNumber, 'AWB555');
  assert.equal(calls.filter((x) => x.url.endsWith('/courier/assign/awb')).length, 2, 'already booked: no second AWB');
});

test('parcel weight comes from pack sizes plus packing', () => {
  assert.equal(sr.parseKg('400g'), 0.4);
  assert.equal(sr.parseKg('0.8 kg'), 0.8);
  assert.deepEqual(sr.parcelFor({ items: [{ weight: '800g', quantity: 1 }] }), { weight: 0.9, length: 24.1, breadth: 16.5, height: 11.4 });
  assert.deepEqual(sr.parcelFor({ items: [{ weight: '400g', quantity: 1 }] }), { weight: 0.5, length: 24.1, breadth: 16.5, height: 6 });
  const small = sr.parcelFor({ items: [{ weight: '400g', quantity: 1 }] });
  assert.ok((small.length * small.breadth * small.height) / 5000 <= 0.5, 'small box stays in the 0.5 kg slab');
});

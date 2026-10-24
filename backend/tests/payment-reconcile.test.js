const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('reconcile: a payment the window never reported is found via Razorpay and becomes exactly one order', async () => {
  const buyer = await h.makeUser();
  const other = await h.makeUser();
  const p = await h.makeProduct({ price: 399, stock: 5 });
  const items = [{ product: String(p._id), quantity: 1 }];

  const pay = await app.api('POST', '/api/payment/create-order', { cartItems: items, shippingAddress: h.address, giftMessage: 'Happy Diwali' }, buyer.token);
  assert.equal(pay.status, 200, JSON.stringify(pay.body));

  // not paid yet -> nothing to recover
  let r = await app.api('POST', '/api/payment/reconcile', {}, buyer.token);
  assert.deepEqual(r.body.payments, []);

  // customer pays (e.g. scans the QR on a phone) but the handler never fires
  h.razorpayPaid[pay.body.orderId] = { id: 'pay_qr_1', amount: pay.body.amount };
  // another user cannot see or claim it
  assert.deepEqual((await app.api('POST', '/api/payment/reconcile', { razorpayOrderId: pay.body.orderId }, other.token)).body.payments, []);

  r = await app.api('POST', '/api/payment/reconcile', {}, buyer.token);
  assert.equal(r.body.payments.length, 1);
  const found = r.body.payments[0];
  assert.equal(found.razorpayPaymentId, 'pay_qr_1');
  assert.equal(found.shippingAddress.pincode, h.address.pincode);
  assert.equal(found.giftMessage, 'Happy Diwali');

  const order = await app.api('POST', '/api/orders', {
    items: found.items.map((i) => ({ product: i.product, quantity: i.quantity })),
    shippingAddress: found.shippingAddress,
    paymentInfo: { method: 'Online', razorpayOrderId: found.razorpayOrderId },
  }, buyer.token);
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(order.body.isPaid, true);
  assert.equal(order.body.paymentInfo.razorpayPaymentId, 'pay_qr_1');

  // after conversion it is no longer offered, and cannot be claimed twice
  assert.deepEqual((await app.api('POST', '/api/payment/reconcile', {}, buyer.token)).body.payments, []);
  const again = await app.api('POST', '/api/orders', { items, shippingAddress: h.address, paymentInfo: { method: 'Online', razorpayOrderId: found.razorpayOrderId } }, buyer.token);
  assert.equal(again.status, 402);
});

test('reconcile: a captured payment for a different amount is ignored', async () => {
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 500, stock: 5 });
  const pay = await app.api('POST', '/api/payment/create-order', { cartItems: [{ product: String(p._id), quantity: 1 }] }, buyer.token);
  h.razorpayPaid[pay.body.orderId] = { id: 'pay_short', amount: 100 };
  assert.deepEqual((await app.api('POST', '/api/payment/reconcile', {}, buyer.token)).body.payments, []);
});

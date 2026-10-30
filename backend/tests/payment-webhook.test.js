const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const h = require('./helpers/app');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

const stockOf = async (p) => (await h.models.Product.findById(String(p._id))).stock;

async function webhookSecret() {
  const admin = await h.makeAdmin();
  const r = await app.api('GET', '/api/payment/admin/webhook', undefined, admin.token);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.match(r.body.url, /\/api\/payment\/webhook$/);
  assert.ok(r.body.secret && r.body.secret.length >= 32);
  return { secret: r.body.secret, admin };
}

// Exactly what Razorpay sends: raw JSON + HMAC-SHA256 of the raw body
const sendWebhook = (event, secret, sig) => {
  const raw = JSON.stringify(event);
  return app.raw('POST', '/api/payment/webhook', raw, {
    'X-Razorpay-Signature': sig || crypto.createHmac('sha256', secret).update(raw).digest('hex'),
  });
};

const captured = (orderId, amountPaise, paymentId = `pay_${h.uniq()}`) => ({
  event: 'payment.captured',
  payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: amountPaise, status: 'captured', method: 'upi' } } },
});

async function startPayment(buyer, product, extra = {}) {
  const pay = await app.api('POST', '/api/payment/create-order', {
    cartItems: [{ product: String(product._id), quantity: 1 }],
    shippingAddress: h.address,
    ...extra,
  }, buyer.token);
  assert.equal(pay.status, 200, JSON.stringify(pay.body));
  return pay.body;
}

test('webhook: customer pays but never comes back -> order is created from the saved address', async () => {
  const { secret } = await webhookSecret();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  const pay = await startPayment(buyer, p, { giftMessage: 'Happy Chhath' });

  const live = await h.models.LiveOrder.findOne({ razorpayOrderId: pay.orderId });
  assert.equal(live.shippingAddress.pincode, h.address.pincode, 'address saved when payment starts');

  const r = await sendWebhook(captured(pay.orderId, pay.amount, 'pay_wh1'), secret);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.created, true);

  const order = await h.models.Order.findById(r.body.orderId);
  assert.equal(order.isPaid, true);
  assert.equal(order.totalPrice, 350);
  assert.equal(order.paymentInfo.razorpayPaymentId, 'pay_wh1');
  assert.equal(order.shippingAddress.city, 'Patna');
  assert.equal(order.giftMessage, 'Happy Chhath');
  assert.equal(String(order.user), String(buyer.user._id));
  assert.equal(await stockOf(p), 4);

  // shows in the customer's own account
  const mine = await app.api('GET', '/api/orders/myorders', undefined, buyer.token);
  assert.ok(mine.body.some((o) => String(o._id) === r.body.orderId), 'order visible in My Orders');

  // Razorpay retries the same webhook -> still one order
  const again = await sendWebhook(captured(pay.orderId, pay.amount, 'pay_wh1'), secret);
  assert.equal(again.body.created, false);
  assert.equal(again.body.orderId, r.body.orderId);

  // the checkout page finishing late gets the same order back, not an error
  const late = await app.api('POST', '/api/orders', {
    items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address,
    paymentInfo: { method: 'Online', razorpayOrderId: pay.orderId },
  }, buyer.token);
  assert.equal(late.status, 200);
  assert.equal(String(late.body._id), r.body.orderId);
  assert.equal(await stockOf(p), 4);
});

test('webhook: forged signature, wrong amount, failed payment and unknown orders create nothing', async () => {
  const { secret } = await webhookSecret();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  const pay = await startPayment(buyer, p);
  const ordersBefore = (await h.models.Order.find({})).length;

  assert.equal((await sendWebhook(captured(pay.orderId, pay.amount), secret, 'f'.repeat(64))).status, 400);
  assert.equal((await sendWebhook(captured(pay.orderId, pay.amount), 'not-the-secret')).status, 400);
  assert.equal((await sendWebhook(captured(pay.orderId, 100), secret)).body.ignored, 'not a matching captured payment');
  const failed = captured(pay.orderId, pay.amount);
  failed.payload.payment.entity.status = 'failed';
  assert.equal((await sendWebhook(failed, secret)).body.ok, true);
  assert.equal((await sendWebhook(captured('order_unknown', 100), secret)).body.ignored, 'unknown order');
  assert.equal((await sendWebhook({ event: 'refund.created', payload: {} }, secret)).body.ignored, true);

  assert.equal((await h.models.Order.find({})).length, ordersBefore);
  const live = await h.models.LiveOrder.findOne({ razorpayOrderId: pay.orderId });
  assert.notEqual(live.status, 'paid');
});

test('webhook after the normal checkout already made the order: no duplicate', async () => {
  const { secret } = await webhookSecret();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  const pay = await startPayment(buyer, p);
  await app.api('POST', '/api/payment/verify', { razorpayOrderId: pay.orderId, razorpayPaymentId: 'pay_n1', razorpaySignature: h.razorpaySignature(pay.orderId, 'pay_n1') }, buyer.token);
  const normal = await app.api('POST', '/api/orders', {
    items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address,
    paymentInfo: { method: 'Online', razorpayOrderId: pay.orderId },
  }, buyer.token);
  assert.equal(normal.status, 201);

  const r = await sendWebhook(captured(pay.orderId, pay.amount, 'pay_n1'), secret);
  assert.equal(r.status, 200);
  assert.equal(r.body.created, false);
  assert.equal(r.body.orderId, String(normal.body._id));
  assert.equal(await stockOf(p), 4);
});

test('admin recovery: Razorpay says paid, no address saved -> listed, then admin creates the order', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  // old-style payment start: no address sent
  const pay = await app.api('POST', '/api/payment/create-order', { cartItems: [{ product: String(p._id), quantity: 1 }] }, buyer.token);
  h.razorpayPayments[pay.body.orderId] = [{ id: 'pay_stuck', order_id: pay.body.orderId, amount: pay.body.amount, status: 'captured' }];

  assert.equal((await app.api('POST', '/api/payment/admin/reconcile', {}, buyer.token)).status, 403);
  const rec = await app.api('POST', '/api/payment/admin/reconcile', {}, admin.token);
  assert.equal(rec.status, 200, JSON.stringify(rec.body));
  const stuck = rec.body.needsAddress.find((s) => s.razorpayPaymentId === 'pay_stuck');
  assert.ok(stuck, 'paid session without address is listed');
  assert.equal(stuck.amount, 350);
  assert.ok(rec.body.paidWithoutOrder.some((s) => s.id === stuck.id));

  const noAddr = await app.api('POST', `/api/payment/admin/stuck/${stuck.id}/create-order`, { shippingAddress: { name: 'X' } }, admin.token);
  assert.equal(noAddr.status, 400);

  const made = await app.api('POST', `/api/payment/admin/stuck/${stuck.id}/create-order`, { shippingAddress: h.address }, admin.token);
  assert.equal(made.status, 201, JSON.stringify(made.body));
  assert.equal(made.body.order.isPaid, true);
  assert.equal(made.body.order.paymentInfo.razorpayPaymentId, 'pay_stuck');
  assert.equal(await stockOf(p), 4);

  const twice = await app.api('POST', `/api/payment/admin/stuck/${stuck.id}/create-order`, { shippingAddress: h.address }, admin.token);
  assert.equal(twice.status, 200);
  assert.equal(String(twice.body.order._id), String(made.body.order._id));
  assert.equal((await app.api('GET', '/api/payment/admin/stuck', undefined, admin.token)).body.paidWithoutOrder.some((s) => s.id === stuck.id), false);
});

test('admin recovery: paid with saved address -> order created automatically; unpaid ones untouched', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  const paid = await startPayment(buyer, p);
  const unpaid = await startPayment(buyer, p);
  h.razorpayPayments[paid.orderId] = [
    { id: 'pay_x_failed', order_id: paid.orderId, amount: paid.amount, status: 'failed' },
    { id: 'pay_x', order_id: paid.orderId, amount: paid.amount, status: 'captured' },
  ];
  const rec = await app.api('POST', '/api/payment/admin/reconcile', {}, admin.token);
  assert.equal(rec.status, 200);
  const paidLive = await h.models.LiveOrder.findOne({ razorpayOrderId: paid.orderId });
  const got = rec.body.recovered.find((r) => r.liveOrderId === String(paidLive._id));
  assert.ok(got, JSON.stringify(rec.body));
  const order = await h.models.Order.findById(got.orderId);
  assert.equal(order.paymentInfo.razorpayPaymentId, 'pay_x');
  assert.equal((await h.models.LiveOrder.findOne({ razorpayOrderId: unpaid.orderId })).status, 'created');
});

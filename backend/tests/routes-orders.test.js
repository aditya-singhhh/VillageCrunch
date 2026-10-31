const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const { priceCart, PricingError } = require('../services/pricing');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

const stockOf = async (p) => (await h.models.Product.findById(String(p._id))).stock;
const cod = (items, over = {}) => ({ items, shippingAddress: h.address, paymentInfo: { method: 'cod' }, ...over });

/* ---------------------------------------------------------------- pricing */

test('priceCart: shipping, GST included in prices (shown, not added), COD charge, promocode; client prices ignored', async () => {
  const p = await h.makeProduct({ price: 300 });
  const small = await priceCart({ items: [{ product: String(p._id), quantity: 1, price: 1 }] });
  assert.deepEqual([small.subtotal, small.shipping, small.tax, small.total], [300, 50, 16.67, 350]);

  const { user } = await h.makeUser();
  await h.models.Promocode.create({ code: `T10${h.uniq()}`, name: 'Ten', type: 'percentage', value: 10, createdBy: user._id });
  const promo = await h.models.Promocode.findOne({ type: 'percentage' });
  const big = await priceCart({ items: [{ productId: String(p._id), quantity: 2 }], paymentMethod: 'cod', promocodeCode: promo.code.toLowerCase(), userId: user._id });
  assert.deepEqual([big.shipping, big.codCharge, big.discount, big.total], [0, 25, 60, 600 + 25 - 60]);
});

test('priceCart rejects bad quantities, ids, masala, low stock, unknown promo', async () => {
  const p = await h.makeProduct({ stock: 1 });
  const masala = await h.makeProduct({ category: 'Masala' });
  const bad = (items, extra) => assert.rejects(priceCart({ items, ...extra }), (e) => e instanceof PricingError);
  await bad([{ product: String(p._id), quantity: -5 }]);
  await bad([{ product: String(p._id), quantity: 1.5 }]);
  await bad([{ product: String(p._id), quantity: 9999 }]);
  await bad([{ product: 'nope', quantity: 1 }]);
  await bad([{ product: String(masala._id), quantity: 1 }]);
  await bad([{ product: String(p._id), quantity: 2 }]);
  await bad([{ product: String(p._id), quantity: 1 }], { promocodeCode: 'FAKE' });
  await bad([]);
});

/* ------------------------------------------------------------- COD orders */

test('COD order: totals are server-computed (client values ignored), stock reserved, order visible to owner only', async () => {
  const buyer = await h.makeUser();
  const other = await h.makeUser();
  const admin = await h.makeAdmin();
  const p = await h.makeProduct({ price: 300, stock: 5 });

  const res = await app.api('POST', '/api/orders', cod([{ product: String(p._id), quantity: 1, price: 1 }], {
    itemsPrice: 1, shippingPrice: 0, taxPrice: 0, totalPrice: 1, promocodeDiscount: 9999,
  }), buyer.token);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const o = res.body;
  assert.equal(o.totalPrice, 300 + 50 + 25);
  assert.equal(o.shippingPrice, 50);
  assert.equal(o.promocodeDiscount, 0);
  assert.equal(o.isPaid, false);
  assert.equal(o.status, 'confirmed');
  assert.equal(o.items[0].price, 300);
  assert.equal(await stockOf(p), 4);
  assert.match(o.orderNumber, /^ORD\d+$/);

  assert.equal((await h.models.User.findById(String(buyer.user._id))).orders.length, 1);

  const mine = await app.api('GET', '/api/orders/myorders', undefined, buyer.token);
  assert.equal(mine.body.length, 1);
  assert.equal(mine.body[0].items[0].product.name, p.name, 'items populated');
  assert.equal((await app.api('GET', `/api/orders/${o._id}`, undefined, buyer.token)).status, 200);
  assert.equal((await app.api('GET', `/api/orders/${o._id}`, undefined, other.token)).status, 403);
  const asAdmin = await app.api('GET', `/api/orders/${o._id}`, undefined, admin.token);
  assert.equal(asAdmin.status, 200);
  assert.equal(asAdmin.body.user.name, buyer.user.name);
  assert.equal(asAdmin.body.user.password, undefined);
  assert.equal((await app.api('GET', '/api/orders', undefined, buyer.token)).status, 403);
  assert.ok((await app.api('GET', '/api/orders', undefined, admin.token)).body.length >= 1);
});

test('order validation: address, quantities, stock, masala, unauthenticated', async () => {
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ stock: 2 });
  const masala = await h.makeProduct({ category: 'Masala' });
  const item = (q) => [{ product: String(p._id), quantity: q }];

  assert.equal((await app.api('POST', '/api/orders', cod(item(1)))).status, 401);
  assert.equal((await app.api('POST', '/api/orders', { ...cod(item(1)), shippingAddress: { name: 'A', phone: '1' } }, buyer.token)).status, 400);
  assert.equal((await app.api('POST', '/api/orders', { ...cod(item(1)), shippingAddress: { ...h.address, pincode: '12' } }, buyer.token)).status, 400);
  assert.equal((await app.api('POST', '/api/orders', cod(item(-3)), buyer.token)).status, 400);
  assert.equal((await app.api('POST', '/api/orders', cod(item(0.5)), buyer.token)).status, 400);
  assert.equal((await app.api('POST', '/api/orders', cod([]), buyer.token)).status, 400);
  assert.equal((await app.api('POST', '/api/orders', cod([{ product: String(masala._id), quantity: 1 }]), buyer.token)).status, 400);
  assert.equal((await app.api('POST', '/api/orders', { ...cod(item(1)), paymentInfo: { method: 'bitcoin' } }, buyer.token)).status, 400);
  assert.equal((await app.api('POST', '/api/orders', cod(item(3)), buyer.token)).status, 400);
  assert.equal(await stockOf(p), 2, 'failed orders must not touch stock');
});

test('the last unit can only be bought once', async () => {
  const a = await h.makeUser();
  const b = await h.makeUser();
  const p = await h.makeProduct({ stock: 1 });
  const items = [{ product: String(p._id), quantity: 1 }];
  const [r1, r2] = await Promise.all([
    app.api('POST', '/api/orders', cod(items), a.token),
    app.api('POST', '/api/orders', cod(items), b.token),
  ]);
  assert.deepEqual([r1.status, r2.status].sort((x, y) => x - y), [201, 400]);
  assert.equal(await stockOf(p), 0);
});

test('promocode: applied server-side, usage recorded, per-user limit enforced', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 400 });
  const code = `WELCOME${h.uniq()}`.toUpperCase();
  const created = await app.api('POST', '/api/promocodes', { code, name: 'Welcome', type: 'percentage', value: 10, userUsageLimit: 1 }, admin.token);
  assert.equal(created.status, 201);
  assert.equal((await app.api('POST', '/api/promocodes', { code, name: 'dup', type: 'fixed', value: 5 }, admin.token)).status, 400);

  const v = await app.api('POST', '/api/promocodes/validate', { code: code.toLowerCase(), orderValue: 800, userId: String(buyer.user._id) });
  assert.equal(v.status, 200);
  assert.equal(v.body.discount, 80);

  const items = [{ product: String(p._id), quantity: 2 }];
  const order = await app.api('POST', '/api/orders', cod(items, { promocode: code }), buyer.token);
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(order.body.promocodeDiscount, 80);
  assert.equal(order.body.totalPrice, 800 + 0 + 25 - 80);
  assert.equal(order.body.promocode.code, code);

  const promo = await h.models.Promocode.findOne({ code });
  assert.equal(promo.usageCount, 1);
  assert.equal(promo.usedBy.length, 1);
  assert.equal(String(promo.usedBy[0].user), String(buyer.user._id));

  const second = await app.api('POST', '/api/orders', cod(items, { promocode: code }), buyer.token);
  assert.equal(second.status, 400);
  assert.match(second.body.message, /already used/);
  const bogus = await app.api('POST', '/api/orders', cod(items, { promocode: 'NOPE' }), buyer.token);
  assert.equal(bogus.status, 400);
});

/* ----------------------------------------------------------- online orders */

test('online order without a verified payment is refused', async () => {
  const buyer = await h.makeUser();
  const p = await h.makeProduct();
  const res = await app.api('POST', '/api/orders', {
    items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address,
    paymentInfo: { method: 'Online', razorpayOrderId: 'order_fake', razorpayPaymentId: 'pay_fake', razorpaySignature: 'x' },
  }, buyer.token);
  assert.equal(res.status, 402);
  assert.equal(res.body.code, 'PAYMENT_NOT_VERIFIED');
  assert.equal(await stockOf(p), 10);
});

test('online flow: server-priced Razorpay order -> signature verified -> exactly one order per payment', async () => {
  const buyer = await h.makeUser();
  const thief = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  const items = [{ product: String(p._id), quantity: 1 }];

  assert.equal((await app.api('POST', '/api/payment/create-order', { cartItems: items })).status, 401);
  h.razorpayCalls.length = 0;
  const pay = await app.api('POST', '/api/payment/create-order', { amount: 1, cartItems: items }, buyer.token);
  assert.equal(pay.status, 200, JSON.stringify(pay.body));
  assert.equal(h.razorpayCalls[0].amount, (300 + 50) * 100, 'amount comes from the cart, not from the client');
  assert.equal(pay.body.total, 350);

  const live = await h.models.LiveOrder.findOne({ razorpayOrderId: pay.body.orderId });
  assert.equal(live.status, 'created');
  assert.equal(live.amount, 350);

  // wrong signature
  const badSig = await app.api('POST', '/api/payment/verify', { razorpayOrderId: pay.body.orderId, razorpayPaymentId: 'pay_1', razorpaySignature: 'f'.repeat(64) }, buyer.token);
  assert.equal(badSig.status, 400);
  assert.equal((await h.models.LiveOrder.findOne({ razorpayOrderId: pay.body.orderId })).status, 'payment_failed');
  const orderBeforePay = await app.api('POST', '/api/orders', { items, shippingAddress: h.address, paymentInfo: { method: 'Online', razorpayOrderId: pay.body.orderId } }, buyer.token);
  assert.equal(orderBeforePay.status, 402);

  // another account cannot verify/claim this payment
  const sig = h.razorpaySignature(pay.body.orderId, 'pay_1');
  assert.equal((await app.api('POST', '/api/payment/verify', { razorpayOrderId: pay.body.orderId, razorpayPaymentId: 'pay_1', razorpaySignature: sig }, thief.token)).status, 404);

  // the genuine payment
  const ok = await app.api('POST', '/api/payment/verify', { razorpayOrderId: pay.body.orderId, razorpayPaymentId: 'pay_1', razorpaySignature: sig }, buyer.token);
  assert.equal(ok.status, 200);
  assert.equal((await app.api('POST', '/api/orders', { items, shippingAddress: h.address, paymentInfo: { method: 'Online', razorpayOrderId: pay.body.orderId } }, thief.token)).status, 402);

  const order = await app.api('POST', '/api/orders', {
    items, shippingAddress: h.address, totalPrice: 1,
    paymentInfo: { method: 'Online', razorpayOrderId: pay.body.orderId, razorpayPaymentId: 'attacker', razorpaySignature: 'attacker' },
  }, buyer.token);
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(order.body.isPaid, true);
  assert.equal(order.body.totalPrice, 350);
  assert.equal(order.body.paymentInfo.razorpayPaymentId, 'pay_1', 'payment ids come from the verified record, not the client');
  assert.equal(await stockOf(p), 4);

  const finalLive = await h.models.LiveOrder.findOne({ razorpayOrderId: pay.body.orderId });
  assert.equal(finalLive.status, 'converted_to_order');
  assert.equal(String(finalLive.finalOrderId), String(order.body._id));

  // replaying the same payment cannot create a second order (it returns the existing one)
  const replay = await app.api('POST', '/api/orders', { items, shippingAddress: h.address, paymentInfo: { method: 'Online', razorpayOrderId: pay.body.orderId } }, buyer.token);
  assert.equal(replay.status, 200);
  assert.equal(String(replay.body._id), String(order.body._id));
  assert.equal(await stockOf(p), 4);
  assert.equal((await h.models.Order.find({})).filter((o) => o.paymentInfo?.razorpayOrderId === pay.body.orderId).length, 1);
});

test('online flow: a cart changed after payment is rejected without losing the payment', async () => {
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  const pay = await app.api('POST', '/api/payment/create-order', { cartItems: [{ product: String(p._id), quantity: 1 }] }, buyer.token);
  await app.api('POST', '/api/payment/verify', { razorpayOrderId: pay.body.orderId, razorpayPaymentId: 'pay_2', razorpaySignature: h.razorpaySignature(pay.body.orderId, 'pay_2') }, buyer.token);

  const tampered = await app.api('POST', '/api/orders', {
    items: [{ product: String(p._id), quantity: 3 }], shippingAddress: h.address,
    paymentInfo: { method: 'Online', razorpayOrderId: pay.body.orderId },
  }, buyer.token);
  assert.equal(tampered.status, 409);
  assert.equal(tampered.body.code, 'CART_MISMATCH');
  assert.equal(await stockOf(p), 5);
  // payment is still claimable with the right cart
  const right = await app.api('POST', '/api/orders', {
    items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address,
    paymentInfo: { method: 'Online', razorpayOrderId: pay.body.orderId },
  }, buyer.token);
  assert.equal(right.status, 201);
});

test('payment: empty cart / masala rejected; promocode discount flows into the charged amount', async () => {
  const buyer = await h.makeUser();
  const admin = await h.makeAdmin();
  const p = await h.makeProduct({ price: 600 });
  const masala = await h.makeProduct({ category: 'Masala' });
  assert.equal((await app.api('POST', '/api/payment/create-order', { cartItems: [] }, buyer.token)).status, 400);
  assert.equal((await app.api('POST', '/api/payment/create-order', { cartItems: [{ product: String(masala._id), quantity: 1 }] }, buyer.token)).status, 400);

  const code = `PAY${h.uniq()}`.toUpperCase();
  await app.api('POST', '/api/promocodes', { code, name: 'Pay', type: 'fixed', value: 100 }, admin.token);
  h.razorpayCalls.length = 0;
  const pay = await app.api('POST', '/api/payment/create-order', { cartItems: [{ product: String(p._id), quantity: 1 }], promocode: { code } }, buyer.token);
  assert.equal(pay.status, 200, JSON.stringify(pay.body));
  assert.equal(h.razorpayCalls[0].amount, Math.round((600 + 0 - 100) * 100));

  await app.api('POST', '/api/payment/verify', { razorpayOrderId: pay.body.orderId, razorpayPaymentId: 'pay_3', razorpaySignature: h.razorpaySignature(pay.body.orderId, 'pay_3') }, buyer.token);
  const order = await app.api('POST', '/api/orders', { items: [{ product: String(p._id), quantity: 1 }], shippingAddress: h.address, paymentInfo: { method: 'Online', razorpayOrderId: pay.body.orderId } }, buyer.token);
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(order.body.totalPrice, 500);
  assert.equal(order.body.promocodeDiscount, 100);
  assert.equal((await h.models.Promocode.findOne({ code })).usageCount, 1);
});

/* ------------------------------------------------------------ order admin */

test('admin: status validation, cancel restores stock exactly once, mark-paid is admin + COD only', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct({ stock: 3 });
  const res = await app.api('POST', '/api/orders', cod([{ product: String(p._id), quantity: 2 }]), buyer.token);
  const id = res.body._id;
  assert.equal(await stockOf(p), 1);

  assert.equal((await app.api('PUT', `/api/orders/${id}/status`, { status: 'shipped' }, buyer.token)).status, 403);
  assert.equal((await app.api('PUT', `/api/orders/${id}/status`, { status: 'teleported' }, admin.token)).status, 400);
  const shipped = await app.api('PUT', `/api/orders/${id}/status`, { status: 'shipped', trackingNumber: 'TRK1' }, admin.token);
  assert.equal(shipped.body.trackingNumber, 'TRK1');
  const delivered = await app.api('PUT', `/api/orders/${id}/status`, { status: 'delivered' }, admin.token);
  assert.equal(delivered.body.isDelivered, true);

  assert.equal((await app.api('PUT', `/api/orders/${id}/pay`, {}, buyer.token)).status, 403);
  const paid = await app.api('PUT', `/api/orders/${id}/pay`, {}, admin.token);
  assert.equal(paid.status, 200);
  assert.equal(paid.body.isPaid, true);

  await app.api('PUT', `/api/orders/${id}/status`, { status: 'cancelled' }, admin.token);
  assert.equal(await stockOf(p), 3);
  await app.api('PUT', `/api/orders/${id}/status`, { status: 'cancelled' }, admin.token);
  assert.equal(await stockOf(p), 3, 'cancelling twice must not add stock twice');
});

test('live orders admin API: list is populated, stats are aggregated in JS', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  const p = await h.makeProduct();
  await app.api('POST', '/api/payment/create-order', { cartItems: [{ product: String(p._id), quantity: 1 }] }, buyer.token);
  assert.equal((await app.api('GET', '/api/live-orders', undefined, buyer.token)).status, 403);
  const list = await app.api('GET', '/api/live-orders?limit=5', undefined, admin.token);
  assert.equal(list.status, 200);
  assert.ok(list.body.orders.length >= 1);
  assert.equal(list.body.orders[0].user.name !== undefined, true);
  assert.equal(list.body.orders[0].cartItems[0].productId.name !== undefined, true);
  const stats = await app.api('GET', '/api/live-orders/stats', undefined, admin.token);
  assert.equal(stats.status, 200);
  assert.ok(stats.body.totalOrders >= 1);
  assert.ok(stats.body.byStatus.created.count >= 1);
});

test('admin can hide a test order: gone from admin list, totals and the customer account; stock returned once; reversible', async () => {
  const buyer = await h.makeUser();
  const admin = await h.makeAdmin();
  const p = await h.makeProduct({ price: 300, stock: 5 });
  const o = await app.api('POST', '/api/orders', cod([{ product: String(p._id), quantity: 1 }]), buyer.token);
  assert.equal(o.status, 201);
  assert.equal(await stockOf(p), 4);
  assert.equal((await app.api('PUT', `/api/orders/${o.body._id}/test`, { isTest: true }, buyer.token)).status, 403);
  const r = await app.api('PUT', `/api/orders/${o.body._id}/test`, { isTest: true }, admin.token);
  assert.equal(r.status, 200);
  assert.equal(await stockOf(p), 5, 'stock returned');
  await app.api('PUT', `/api/orders/${o.body._id}/test`, { isTest: true }, admin.token);
  assert.equal(await stockOf(p), 5, 'not returned twice');
  const list = await app.api('GET', '/api/orders', undefined, admin.token);
  assert.equal(list.body.some((x) => String(x._id) === String(o.body._id)), false);
  const withTest = await app.api('GET', '/api/orders?includeTest=1', undefined, admin.token);
  assert.equal(withTest.body.some((x) => String(x._id) === String(o.body._id)), true, 'kept, not deleted');
  const mine = await app.api('GET', '/api/orders/myorders', undefined, buyer.token);
  assert.equal(mine.body.some((x) => String(x._id) === String(o.body._id)), false);
  await app.api('PUT', `/api/orders/${o.body._id}/test`, { isTest: false }, admin.token);
  assert.equal((await app.api('GET', '/api/orders', undefined, admin.token)).body.some((x) => String(x._id) === String(o.body._id)), true);
});

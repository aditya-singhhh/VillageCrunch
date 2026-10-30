/**
 * Turns a PAID Razorpay payment (a LiveOrder) into a real Order, independent of the
 * customer's browser. Used by:
 *   - the Razorpay webhook (customer paid but never came back to the site)
 *   - the admin "find stuck payments" tool (asks Razorpay directly)
 *   - the admin "create order" form (when the address was not saved)
 *
 * Every path goes through finalizeLiveOrder(), which atomically claims the payment, so one
 * payment can only ever create ONE order no matter which path gets there first.
 */
const crypto = require('crypto');
const LiveOrder = require('../models/LiveOrder');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Promocode = require('../models/Promocode');
const Settings = require('../models/Settings');
const { round2 } = require('./pricing');

const VERIFIED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

function cleanAddress(a = {}) {
  return {
    name: clean(a.name, 100),
    phone: clean(a.phone, 20),
    street: clean(a.street, 300),
    city: clean(a.city, 100),
    state: clean(a.state, 100),
    pincode: clean(a.pincode, 6),
  };
}

const addressComplete = (a) =>
  !!(a && a.name && a.phone && a.street && a.city && /^[1-9][0-9]{5}$/.test(a.pincode || ''));

const generateOrderNumber = () =>
  `ORD${Date.now().toString().slice(-8)}${crypto.randomInt(0, 1000).toString().padStart(3, '0')}`;

/* ------------------------------------------------------------ webhook secret */

let cachedSecret = null;
async function getWebhookSecret() {
  if (process.env.RAZORPAY_WEBHOOK_SECRET) return process.env.RAZORPAY_WEBHOOK_SECRET;
  if (cachedSecret) return cachedSecret;
  const s = await Settings.getSettings();
  let secret = s.payments?.webhookSecret;
  if (!secret) {
    secret = crypto.randomBytes(24).toString('hex');
    s.payments = { ...((s.toObject && s.toObject().payments) || {}), webhookSecret: secret };
    await s.save();
  }
  cachedSecret = secret;
  return secret;
}

function verifyWebhookSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ------------------------------------------------------------- mark as paid */

/**
 * Record a payment that Razorpay itself reports as captured (webhook or API lookup).
 * Checks it belongs to this live order and is for the exact amount we asked for.
 * Returns true when the live order is (now) paid.
 */
async function markPaidFromRazorpay(liveOrder, payment, via) {
  if (!liveOrder || !payment) return false;
  if (payment.order_id && payment.order_id !== liveOrder.razorpayOrderId) return false;
  if (!['captured', 'authorized'].includes(payment.status)) return false;
  if (Number(payment.amount) !== Math.round(Number(liveOrder.amount) * 100)) {
    console.error(`⚠️ Razorpay amount mismatch for ${liveOrder.razorpayOrderId}: ${payment.amount} vs ${liveOrder.amount}`);
    return false;
  }
  if (liveOrder.status === 'converted_to_order') return true;
  await LiveOrder.updateOne(
    { _id: liveOrder._id, status: { $ne: 'converted_to_order' } },
    {
      $set: {
        razorpayPaymentId: payment.id,
        paymentVerified: true,
        status: 'paid',
        paidVia: liveOrder.paidVia || via,
        expiryTime: new Date(Date.now() + VERIFIED_RETENTION_MS),
      },
    }
  );
  return true;
}

/* ------------------------------------------------------------ create order */

/**
 * Create the Order for a paid live order. Idempotent: if the payment was already turned
 * into an order (by the checkout page, the webhook or an admin) that order is returned.
 * Returns { order, created } or throws with .code = NOT_PAID | NO_ADDRESS.
 */
async function finalizeLiveOrder(liveOrderId, { shippingAddress, via = 'webhook' } = {}) {
  let live = await LiveOrder.findById(String(liveOrderId));
  if (!live) throw Object.assign(new Error('Payment session not found'), { code: 'NOT_FOUND' });

  if (live.finalOrderId) {
    const existing = await Order.findById(String(live.finalOrderId));
    if (existing) return { order: existing, created: false };
  }
  if (!live.paymentVerified || !['paid', 'converted_to_order'].includes(live.status)) {
    throw Object.assign(new Error('This payment is not confirmed as paid'), { code: 'NOT_PAID' });
  }

  const address = cleanAddress(shippingAddress || live.shippingAddress || {});
  if (!addressComplete(address)) {
    throw Object.assign(new Error('Delivery address is missing'), { code: 'NO_ADDRESS' });
  }

  // Atomically claim the payment: only one caller can move it from 'paid'
  const claimed = await LiveOrder.findOneAndUpdate(
    { _id: live._id, paymentVerified: true, status: 'paid' },
    { $set: { status: 'converted_to_order', shippingAddress: address } },
    { new: true }
  );
  if (!claimed) {
    // Someone else (checkout page / another webhook delivery) got there first
    live = await LiveOrder.findById(String(live._id));
    const existing = live?.finalOrderId ? await Order.findById(String(live.finalOrderId)) : null;
    if (existing) return { order: existing, created: false };
    throw Object.assign(new Error('This payment is already being processed'), { code: 'BUSY' });
  }
  live = claimed;

  const promoCode = live.notes?.get ? live.notes.get('promocode') : live.notes?.promocode;
  const pb = live.priceBreakdown || {};
  const promo = promoCode && pb.promocodeDiscount > 0
    ? await Promocode.findOne({ code: String(promoCode).toUpperCase() })
    : null;

  let order;
  try {
    order = await Order.create({
      user: live.user,
      orderNumber: generateOrderNumber(),
      items: (live.cartItems || []).map((c) => ({
        product: c.productId,
        name: c.name,
        quantity: c.quantity,
        price: c.price,
        image: c.image,
        weight: c.weight,
      })),
      shippingAddress: address,
      giftMessage: live.giftMessage || undefined,
      itemsPrice: round2(pb.itemsPrice ?? live.amount),
      shippingPrice: round2(pb.shippingPrice ?? 0),
      taxPrice: round2(pb.taxPrice ?? 0),
      totalPrice: round2(live.amount),
      promocode: promo ? { code: promo.code, discount: pb.promocodeDiscount, description: promo.description } : undefined,
      promocodeDiscount: round2(pb.promocodeDiscount || 0),
      status: 'confirmed',
      paymentInfo: {
        method: 'Online',
        razorpayOrderId: live.razorpayOrderId,
        razorpayPaymentId: live.razorpayPaymentId,
        razorpaySignature: live.razorpaySignature,
      },
      isPaid: true,
      paidAt: new Date(),
    });
  } catch (e) {
    await LiveOrder.updateOne({ _id: live._id }, { $set: { status: 'paid' } });
    throw e;
  }

  await LiveOrder.updateOne({ _id: live._id }, { $set: { finalOrderId: order._id, paidVia: live.paidVia || via } });

  // The customer has paid: take the stock even if it goes negative (owner is alerted to restock)
  for (const c of live.cartItems || []) {
    await Product.updateOne({ _id: c.productId }, { $inc: { stock: -c.quantity } }).catch(() => {});
  }
  await User.findByIdAndUpdate(live.user, { $push: { orders: order._id } }).catch(() => {});
  if (promo) {
    await Promocode.updateOne(
      { _id: promo._id },
      {
        $push: { usedBy: { user: live.user, orderValue: pb.itemsPrice, discountAmount: pb.promocodeDiscount } },
        $inc: { usageCount: 1 },
      }
    ).catch(() => {});
  }
  try { require('../routes/leads').markConverted(address.phone || live.userInfo?.phone, order._id); } catch (_) { /* optional */ }
  require('./alerts').newOrderAlert(order).catch(() => {});
  notifyCustomer(order, live).catch(() => {});

  return { order, created: true };
}

async function notifyCustomer(order, live) {
  try {
    const { sendOrderConfirmationEmail, sendAdminOrderNotification } = require('../config/email');
    const { sendCustomerOrderSMS } = require('../config/sms');
    const populated = await Order.findById(String(order._id));
    const u = live.userInfo || {};
    if (u.email && !/@guest\./.test(u.email)) await sendOrderConfirmationEmail(u.email, populated).catch(() => {});
    if (u.phone) await sendCustomerOrderSMS(u.phone, populated).catch(() => {});
    await sendAdminOrderNotification(populated, { name: u.name, email: u.email, phone: u.phone }).catch(() => {});
  } catch (e) {
    console.error('Paid-order notifications failed:', e.message);
  }
}

/* --------------------------------------------------------- stuck payments */

/**
 * Ask Razorpay about recent payment sessions that never became orders. Captured ones are
 * marked paid and turned into orders when the address is known. Returns the paid sessions
 * that still need an address, plus a summary.
 */
async function reconcileRecent({ days = 14 } = {}) {
  const razorpay = require('../config/razorpay');
  if (!razorpay?.orders?.fetchPayments) throw Object.assign(new Error('Payment service not configured'), { code: 'NO_RAZORPAY' });
  const since = Date.now() - days * 24 * 3600 * 1000;
  const all = await LiveOrder.find({});
  const recent = all.filter((l) => new Date(l.createdAt || 0).getTime() > since && !l.finalOrderId);
  const result = { checked: 0, recovered: [], needsAddress: [], unpaid: 0 };
  for (const l of recent) {
    if (l.status !== 'paid' || !l.paymentVerified) {
      result.checked += 1;
      let payments = [];
      try {
        const r = await razorpay.orders.fetchPayments(l.razorpayOrderId);
        payments = r?.items || [];
      } catch (e) {
        console.error('fetchPayments failed for', l.razorpayOrderId, e.message);
        continue;
      }
      const paid = payments.find((p) => p.status === 'captured') || payments.find((p) => p.status === 'authorized');
      if (!paid || !(await markPaidFromRazorpay(l, paid, 'reconcile'))) { result.unpaid += 1; continue; }
    }
    try {
      const { order } = await finalizeLiveOrder(l._id, { via: 'reconcile' });
      result.recovered.push({ liveOrderId: String(l._id), orderId: String(order._id), orderNumber: order.orderNumber, amount: order.totalPrice });
    } catch (e) {
      if (e.code === 'NO_ADDRESS') {
        result.needsAddress.push(describe(await LiveOrder.findById(String(l._id))));
      }
    }
  }
  return result;
}

/** Paid sessions with no order yet (admin list). */
async function paidWithoutOrder() {
  const all = await LiveOrder.find({});
  return all
    .filter((l) => l.paymentVerified && l.status === 'paid' && !l.finalOrderId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(describe);
}

function describe(l) {
  return {
    id: String(l._id),
    amount: l.amount,
    createdAt: l.createdAt,
    razorpayPaymentId: l.razorpayPaymentId,
    customer: { name: l.userInfo?.name, phone: l.userInfo?.phone, email: l.userInfo?.email },
    items: (l.cartItems || []).map((c) => ({ name: c.name, quantity: c.quantity })),
    shippingAddress: l.shippingAddress || null,
  };
}

module.exports = {
  cleanAddress,
  addressComplete,
  getWebhookSecret,
  verifyWebhookSignature,
  markPaidFromRazorpay,
  finalizeLiveOrder,
  reconcileRecent,
  paidWithoutOrder,
  __resetSecret: () => { cachedSecret = null; },
};

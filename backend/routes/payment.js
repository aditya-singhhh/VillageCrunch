const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const { protect, admin } = require('../middleware/auth');
const paidOrders = require('../services/paidOrders');
const { paymentRateLimit, securityMonitor } = require('../middleware/security');
const LiveOrder = require('../models/LiveOrder');
const { priceCart, cartSignature, PricingError } = require('../services/pricing');

// Verified payments must outlive the 15 minute TTL used for abandoned checkouts,
// otherwise a customer who paid could lose the record that proves it.
const VERIFIED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
// Abandoned/unpaid checkouts: Razorpay checkout can stay open for a while.
const PENDING_RETENTION_MS = 2 * 60 * 60 * 1000;

const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

// @route   POST /api/payment/create-order
// @desc    Create a Razorpay order. The amount is ALWAYS computed server-side
//          from the cart; any amount sent by the client is ignored.
// @access  Private
router.post('/create-order', protect, paymentRateLimit, securityMonitor, async (req, res) => {
  if (!onlinePaymentsEnabled()) {
    return res.status(503).json({ message: 'Online payment is not available right now. Please choose cash on delivery.', code: 'PAYMENTS_OFF' });
  }
  try {
    if (!razorpay) {
      return res.status(503).json({
        message: 'Payment service not configured. Please contact administrator.',
      });
    }

    const { cartItems, promocode } = req.body;
    // Saved now so the order can still be created if the customer never returns after paying
    const shippingAddress = paidOrders.cleanAddress(req.body.shippingAddress || {});
    const giftMessage = String(req.body.giftMessage || '').trim().slice(0, 300);
    const promocodeCode = typeof promocode === 'string' ? promocode : promocode?.code;

    const pricing = await priceCart({
      items: cartItems,
      paymentMethod: 'online',
      promocodeCode,
      userId: req.user._id,
    });

    if (pricing.total <= 0) {
      return res.status(400).json({ message: 'Order total must be greater than zero' });
    }

    const amountPaise = Math.round(pricing.total * 100);

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${req.user._id.toString().slice(-6)}`,
      payment_capture: 1,
      notes: {
        user_id: req.user._id.toString(),
        user_name: req.user.name,
      },
    });

    // Fail closed: if we cannot record what this payment is for, do not let the
    // customer pay for it.
    try {
      await LiveOrder.create({
        razorpayOrderId: order.id,
        user: req.user._id,
        userInfo: {
          userId: req.user._id.toString(),
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || '',
        },
        amount: pricing.total,
        currency: 'INR',
        cartItems: pricing.lines.map((l) => ({
          productId: l.product,
          name: l.name,
          price: l.price,
          quantity: l.quantity,
          weight: l.weight,
          image: l.image || '',
          category: l.category,
        })),
        priceBreakdown: {
          itemsPrice: pricing.subtotal,
          shippingPrice: pricing.shipping,
          taxPrice: pricing.tax,
          totalPrice: pricing.total,
          promocodeDiscount: pricing.discount,
        },
        shippingAddress,
        giftMessage: giftMessage || undefined,
        status: 'created',
        expiryTime: new Date(Date.now() + PENDING_RETENTION_MS),
        notes: new Map([
          ['user_id', req.user._id.toString()],
          ['order_source', 'web'],
          ['promocode', promocodeCode ? String(promocodeCode).toUpperCase() : ''],
          ['cart_signature', cartSignature(pricing.lines)],
        ]),
      });
    } catch (dbError) {
      console.error('❌ Could not record live order, aborting payment:', dbError.message);
      return res.status(500).json({ message: 'Could not start payment. Please try again.' });
    }

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      // Authoritative breakdown so the UI can show exactly what will be charged
      total: pricing.total,
    });
  } catch (error) {
    if (error instanceof PricingError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    console.error('Razorpay order creation error:', error.message);
    res.status(500).json({ message: 'Error creating payment order' });
  }
});

// @route   POST /api/payment/verify
// @desc    Verify Razorpay signature and mark the live order as paid
// @access  Private
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (![razorpayOrderId, razorpayPaymentId, razorpaySignature].every((v) => typeof v === 'string' && v)) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ success: false, message: 'Payment service not configured' });
    }

    // The live order must exist and belong to the caller
    const liveOrder = await LiveOrder.findOne({ razorpayOrderId, user: req.user._id });
    if (!liveOrder) {
      return res.status(404).json({ success: false, message: 'Payment session not found' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!safeEqual(expectedSignature, razorpaySignature)) {
      liveOrder.status = 'payment_failed';
      await liveOrder.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Do not let a later call downgrade/alter an order that is already used
    if (liveOrder.status !== 'converted_to_order') {
      liveOrder.razorpayPaymentId = razorpayPaymentId;
      liveOrder.razorpaySignature = razorpaySignature;
      liveOrder.paymentVerified = true;
      liveOrder.status = 'paid';
      liveOrder.paidVia = liveOrder.paidVia || 'checkout';
      liveOrder.expiryTime = new Date(Date.now() + VERIFIED_RETENTION_MS);
      await liveOrder.save();
    }

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    console.error('Payment verification error:', error.message);
    res.status(500).json({ message: 'Error verifying payment' });
  }
});

// @route   POST /api/payment/webhook
// @desc    Razorpay tells us directly that a payment succeeded. Creates the order even when
//          the customer never came back to the site (in-app browsers, closed tabs).
// @access  Public, but every call must carry a valid Razorpay signature
router.post('/webhook', async (req, res) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.rawBody || JSON.stringify(req.body || {}));
    const secret = await paidOrders.getWebhookSecret();
    if (!paidOrders.verifyWebhookSignature(raw, req.get('x-razorpay-signature'), secret)) {
      return res.status(400).json({ ok: false });
    }
    let event;
    try { event = JSON.parse(raw.toString('utf8')); } catch (_) { return res.status(400).json({ ok: false }); }

    const payment = event?.payload?.payment?.entity;
    const orderId = payment?.order_id || event?.payload?.order?.entity?.id;
    if (!['payment.captured', 'order.paid'].includes(event?.event) || !payment || !orderId) {
      return res.json({ ok: true, ignored: true });
    }
    const liveOrder = await LiveOrder.findOne({ razorpayOrderId: orderId });
    if (!liveOrder) return res.json({ ok: true, ignored: 'unknown order' });

    if (!(await paidOrders.markPaidFromRazorpay(liveOrder, payment, 'webhook'))) {
      return res.json({ ok: true, ignored: 'not a matching captured payment' });
    }
    // Give the checkout page a moment to finish normally (it has the freshest details)
    if (process.env.NODE_ENV !== 'test') await new Promise((r) => setTimeout(r, 8000));
    try {
      const { order, created } = await paidOrders.finalizeLiveOrder(liveOrder._id, { via: 'webhook' });
      return res.json({ ok: true, orderId: String(order._id), created });
    } catch (e) {
      if (e.code === 'NO_ADDRESS') {
        require('../services/alerts').push(
          `Paid Rs ${Math.round(liveOrder.amount)} - address needed`,
          `A customer paid ₹${Math.round(liveOrder.amount)} but the delivery address was not saved. Open Admin > Abandoned checkouts > Paid, no order.`,
          { tags: 'warning' }
        ).catch(() => {});
        return res.json({ ok: true, needsAddress: true });
      }
      throw e;
    }
  } catch (error) {
    console.error('Razorpay webhook error:', error.message);
    // 500 makes Razorpay retry later
    res.status(500).json({ ok: false });
  }
});

/* ---------------- admin: webhook set-up + stuck payment recovery ---------------- */

// @route GET /api/payment/admin/webhook  (admin) - what to paste into the Razorpay dashboard
router.get('/admin/webhook', protect, admin, async (req, res) => {
  const secret = await paidOrders.getWebhookSecret();
  const base = process.env.API_PUBLIC_URL || `${process.env.SITE_URL || 'https://villagecrunch.in'}/api`;
  res.json({ url: `${base}/payment/webhook`, secret, events: ['payment.captured', 'order.paid'], fromEnv: !!process.env.RAZORPAY_WEBHOOK_SECRET });
});

// @route GET /api/payment/admin/stuck  (admin) - paid payments that have no order yet
router.get('/admin/stuck', protect, admin, async (req, res) => {
  res.json({ paidWithoutOrder: await paidOrders.paidWithoutOrder() });
});

// @route POST /api/payment/admin/reconcile  (admin) - ask Razorpay about recent unfinished payments
router.post('/admin/reconcile', protect, admin, async (req, res) => {
  try {
    const result = await paidOrders.reconcileRecent({ days: 14 });
    res.json({ ...result, paidWithoutOrder: await paidOrders.paidWithoutOrder() });
  } catch (e) {
    res.status(e.code === 'NO_RAZORPAY' ? 503 : 500).json({ message: e.message });
  }
});

// @route POST /api/payment/admin/stuck/:id/create-order  (admin) - create the order with an address
router.post('/admin/stuck/:id/create-order', protect, admin, async (req, res) => {
  try {
    const { order, created } = await paidOrders.finalizeLiveOrder(req.params.id, { shippingAddress: req.body.shippingAddress, via: 'admin' });
    res.status(created ? 201 : 200).json({ order, created });
  } catch (e) {
    const status = { NOT_FOUND: 404, NOT_PAID: 409, NO_ADDRESS: 400, BUSY: 409 }[e.code] || 500;
    res.status(status).json({ message: e.message, code: e.code });
  }
});

// @route   GET /api/payment/key
// @desc    Get Razorpay public key id
// @access  Public
const onlinePaymentsEnabled = () => {
  const id = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  return process.env.ONLINE_PAYMENTS === 'on' && (/^rzp_live_/.test(id) || (process.env.ALLOW_TEST_PAYMENTS === 'true' && /^rzp_test_/.test(id))) && !/placeholder/i.test(id + secret) && secret.length > 8;
};

router.get('/key', (req, res) => {
  const enabled = onlinePaymentsEnabled();
  res.json({ key: enabled ? process.env.RAZORPAY_KEY_ID : null, enabled });
});

module.exports = router;

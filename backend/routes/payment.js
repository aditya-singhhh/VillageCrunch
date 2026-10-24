const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const { protect } = require('../middleware/auth');
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

    const { cartItems, promocode, shippingAddress, giftMessage } = req.body;
    const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
    const ship = shippingAddress || {};
    const shippingJson = JSON.stringify({
      name: clip(ship.name, 100), phone: clip(ship.phone, 20), street: clip(ship.street, 300),
      city: clip(ship.city, 100), state: clip(ship.state, 100), pincode: clip(ship.pincode, 6),
    });
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
        status: 'created',
        expiryTime: new Date(Date.now() + PENDING_RETENTION_MS),
        notes: new Map([
          ['user_id', req.user._id.toString()],
          ['order_source', 'web'],
          ['promocode', promocodeCode ? String(promocodeCode).toUpperCase() : ''],
          ['cart_signature', cartSignature(pricing.lines)],
          ['shipping', shippingJson],
          ['gift_message', clip(giftMessage, 300)],
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
      liveOrder.expiryTime = new Date(Date.now() + VERIFIED_RETENTION_MS);
      await liveOrder.save();
    }

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    console.error('Payment verification error:', error.message);
    res.status(500).json({ message: 'Error verifying payment' });
  }
});

// @route   POST /api/payment/reconcile
// @desc    Ask Razorpay directly whether the caller's recent checkouts were paid. Used when the
//          payment window never reported success (UPI app switch, QR paid on another device,
//          page closed). Paid ones are marked verified so POST /api/orders can turn them into
//          orders. Body: { razorpayOrderId? } - without it, checks the last 24 hours.
// @access  Private
router.post('/reconcile', protect, async (req, res) => {
  try {
    if (!razorpay || typeof razorpay.orders?.fetchPayments !== 'function') {
      return res.json({ payments: [] });
    }
    const wanted = typeof req.body?.razorpayOrderId === 'string' ? req.body.razorpayOrderId : null;
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const mine = (await LiveOrder.find({ user: req.user._id }))
      .filter((l) => (wanted ? l.razorpayOrderId === wanted : new Date(l.createdAt || 0).getTime() > since))
      .filter((l) => l.status !== 'converted_to_order' && l.status !== 'cancelled')
      .slice(-5);

    const out = [];
    for (const live of mine) {
      if (!(live.paymentVerified && live.status === 'paid')) {
        let captured = null;
        try {
          const r = await razorpay.orders.fetchPayments(live.razorpayOrderId);
          captured = (r?.items || []).find((p) => p.status === 'captured' && Number(p.amount) === Math.round(live.amount * 100));
        } catch (e) {
          console.error('Razorpay fetchPayments failed:', e.message);
        }
        if (!captured) continue;
        live.razorpayPaymentId = captured.id;
        live.razorpaySignature = 'server-verified';
        live.paymentVerified = true;
        live.status = 'paid';
        live.expiryTime = new Date(Date.now() + VERIFIED_RETENTION_MS);
        await live.save();
      }
      let shipping = null;
      try { shipping = JSON.parse(live.notes?.get('shipping') || 'null'); } catch (_) { shipping = null; }
      out.push({
        razorpayOrderId: live.razorpayOrderId,
        razorpayPaymentId: live.razorpayPaymentId,
        amount: live.amount,
        items: live.cartItems.map((c) => ({ product: String(c.productId), name: c.name, quantity: c.quantity, price: c.price, image: c.image, weight: c.weight })),
        shippingAddress: shipping && shipping.street && shipping.pincode ? shipping : null,
        giftMessage: live.notes?.get('gift_message') || '',
      });
    }
    res.json({ payments: out });
  } catch (error) {
    console.error('Payment reconcile error:', error.message);
    res.status(500).json({ message: 'Could not check payment status' });
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

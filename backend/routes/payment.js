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

    const { cartItems, promocode } = req.body;
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

// @route   GET /api/payment/key
// @desc    Get Razorpay public key id
// @access  Public
const onlinePaymentsEnabled = () => {
  const id = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  return /^rzp_(live|test)_/.test(id) && !/placeholder/i.test(id + secret) && secret.length > 8;
};

router.get('/key', (req, res) => {
  const enabled = onlinePaymentsEnabled();
  res.json({ key: enabled ? process.env.RAZORPAY_KEY_ID : null, enabled });
});

module.exports = router;

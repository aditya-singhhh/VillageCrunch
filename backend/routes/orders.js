const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const LiveOrder = require('../models/LiveOrder');
const Promocode = require('../models/Promocode');
const { protect, admin } = require('../middleware/auth');
const { sendOrderConfirmationEmail, sendAdminOrderNotification } = require('../config/email');
const { sendAdminOrderSMS, sendCustomerOrderSMS } = require('../config/sms');
const { orderRateLimit, securityMonitor } = require('../middleware/security');
const { priceCart, cartSignature, PricingError, round2 } = require('../services/pricing');

const ORDER_STATUSES = Order.schema.path('status').enumValues;

// Generate unique, hard-to-guess order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = crypto.randomInt(0, 1000).toString().padStart(3, '0');
  return `ORD${timestamp}${random}`;
};

const cleanString = (v, max = 200) => String(v ?? '').trim().slice(0, max);

// Release stock we reserved for an order that did not complete
const restoreStock = async (lines) => {
  for (const l of lines) {
    await Product.updateOne({ _id: l.product, }, { $inc: { stock: l.quantity } });
  }
};

// @route   POST /api/orders
// @desc    Create an order. Prices, shipping, tax and discounts are computed on the
//          server; online payments must be backed by a verified Razorpay payment.
// @access  Private
router.post('/', protect, orderRateLimit, securityMonitor, async (req, res) => {
  const reserved = [];
  let claimedLiveOrder = null;

  const releaseLiveOrder = async () => {
    if (claimedLiveOrder) {
      await LiveOrder.updateOne({ _id: claimedLiveOrder._id }, { $set: { status: 'paid' } });
    }
  };

  try {
    const { items, shippingAddress, paymentInfo, promocode } = req.body;

    // --- Basic input validation -------------------------------------------------
    const addr = shippingAddress || {};
    const address = {
      name: cleanString(addr.name, 100),
      phone: cleanString(addr.phone, 20),
      street: cleanString(addr.street, 300),
      city: cleanString(addr.city, 100),
      state: cleanString(addr.state, 100),
      pincode: cleanString(addr.pincode, 6),
    };
    if (!address.name || !address.phone) {
      return res.status(400).json({ message: 'Shipping address name and phone are required' });
    }
    if (!address.street || !address.city || !/^[1-9][0-9]{5}$/.test(address.pincode)) {
      return res.status(400).json({ message: 'A complete shipping address with a valid 6-digit PIN code is required' });
    }

    const rawMethod = String(paymentInfo?.method || '').toLowerCase();
    if (rawMethod !== 'cod' && rawMethod !== 'online') {
      return res.status(400).json({ message: 'Payment method is required' });
    }
    const method = rawMethod === 'cod' ? 'cod' : 'Online';

    // --- Authoritative pricing ----------------------------------------------------
    let liveOrder = null;
    let promocodeCode = typeof promocode === 'string' ? promocode : promocode?.code;

    if (method === 'Online') {
      const razorpayOrderId = cleanString(paymentInfo.razorpayOrderId, 100);
      if (!razorpayOrderId) {
        return res.status(400).json({ message: 'Payment details are required for online orders' });
      }
      // Atomically claim the verified payment so it can only ever create ONE order
      liveOrder = await LiveOrder.findOneAndUpdate(
        { razorpayOrderId, user: req.user._id, paymentVerified: true, status: 'paid' },
        { $set: { status: 'converted_to_order' } },
        { new: true }
      );
      if (!liveOrder) {
        return res.status(402).json({
          message: 'We could not find a verified payment for this order. If you were charged, please contact support.',
          code: 'PAYMENT_NOT_VERIFIED',
        });
      }
      claimedLiveOrder = liveOrder;
      promocodeCode = liveOrder.notes?.get('promocode') || undefined;
    }

    const pricing = await priceCart({
      items,
      paymentMethod: method === 'cod' ? 'cod' : 'online',
      // For online orders the discount was already priced into the payment; usage is recorded below
      promocodeCode: method === 'cod' ? promocodeCode : undefined,
      userId: req.user._id,
    });

    let amounts = {
      itemsPrice: pricing.subtotal,
      shippingPrice: pricing.shipping,
      taxPrice: pricing.tax,
      totalPrice: pricing.total,
      promocodeDiscount: pricing.discount,
    };
    let lines = pricing.lines;

    if (method === 'Online') {
      const liveSig = liveOrder.notes?.get('cart_signature');
      if (!liveSig || liveSig !== cartSignature(pricing.lines)) {
        await releaseLiveOrder();
        claimedLiveOrder = null;
        return res.status(409).json({
          message: 'Your cart changed after payment. Please contact support with your payment ID.',
          code: 'CART_MISMATCH',
        });
      }
      // The customer was charged exactly liveOrder.amount; store what they paid for.
      amounts = {
        itemsPrice: liveOrder.priceBreakdown.itemsPrice,
        shippingPrice: liveOrder.priceBreakdown.shippingPrice,
        taxPrice: liveOrder.priceBreakdown.taxPrice,
        totalPrice: liveOrder.amount,
        promocodeDiscount: liveOrder.priceBreakdown.promocodeDiscount || 0,
      };
      const paidPrice = new Map(liveOrder.cartItems.map((c) => [c.productId.toString(), c.price]));
      lines = pricing.lines.map((l) => ({ ...l, price: paidPrice.get(l.product.toString()) ?? l.price }));
    }

    // --- Reserve stock atomically ---------------------------------------------------
    for (const l of lines) {
      const r = await Product.updateOne(
        { _id: l.product, stock: { $gte: l.quantity } },
        { $inc: { stock: -l.quantity } }
      );
      if (r.modifiedCount !== 1) {
        await restoreStock(reserved);
        await releaseLiveOrder();
        claimedLiveOrder = null;
        return res.status(409).json({
          message: `Sorry, ${l.name} just went out of stock.${method === 'Online' ? ' Please contact support for a refund.' : ''}`,
          code: 'INSUFFICIENT_STOCK',
        });
      }
      reserved.push(l);
    }

    // --- Create the order -------------------------------------------------------------
    const orderData = {
      user: req.user._id,
      orderNumber: generateOrderNumber(),
      items: lines.map((l) => ({
        product: l.product,
        name: l.name,
        quantity: l.quantity,
        price: l.price,
        image: l.image,
        weight: l.weight,
      })),
      shippingAddress: address,
      giftMessage: cleanString(req.body.giftMessage, 300) || undefined,
      itemsPrice: round2(amounts.itemsPrice),
      shippingPrice: round2(amounts.shippingPrice),
      taxPrice: round2(amounts.taxPrice),
      totalPrice: round2(amounts.totalPrice),
      promocode: pricing.promo
        ? { code: pricing.promo.code, discount: amounts.promocodeDiscount, description: pricing.promo.description }
        : undefined,
      promocodeDiscount: round2(amounts.promocodeDiscount),
      status: 'confirmed',
    };

    if (method === 'cod') {
      orderData.paymentInfo = { method: 'cod' };
      orderData.isPaid = false;
      orderData.codVerified = false;
    } else {
      orderData.paymentInfo = {
        method: 'Online',
        razorpayOrderId: liveOrder.razorpayOrderId,
        razorpayPaymentId: liveOrder.razorpayPaymentId,
        razorpaySignature: liveOrder.razorpaySignature,
      };
      orderData.isPaid = true;
      orderData.paidAt = new Date();
    }

    let order;
    try {
      order = await Order.create(orderData);
    } catch (createError) {
      await restoreStock(reserved);
      await releaseLiveOrder();
      claimedLiveOrder = null;
      throw createError;
    }

    if (liveOrder) {
      await LiveOrder.updateOne({ _id: liveOrder._id }, { $set: { finalOrderId: order._id } });
    }
    await User.findByIdAndUpdate(req.user._id, { $push: { orders: order._id } });

    // Record promocode usage (this used to be tracked nowhere)
    // (online orders are priced from the paid LiveOrder, so look the code up here)
    const usedPromo =
      pricing.promo ||
      (promocodeCode && amounts.promocodeDiscount > 0
        ? await Promocode.findOne({ code: String(promocodeCode).toUpperCase() })
        : null);
    if (usedPromo && amounts.promocodeDiscount > 0) {
      try {
        await Promocode.updateOne(
          { _id: usedPromo._id },
          {
            $push: { usedBy: { user: req.user._id, orderValue: amounts.itemsPrice, discountAmount: amounts.promocodeDiscount } },
            $inc: { usageCount: 1 },
          }
        );
      } catch (promoError) {
        console.error('Promocode usage tracking failed:', promoError.message);
      }
    }

    // 📧📱 Send notifications (don't let notification failures affect order creation)
    try {
      // Send confirmation to customer
      const populatedOrder = await Order.findById(order._id).populate('items.product', 'name image');
      
      // Email to customer
      await sendOrderConfirmationEmail(req.user.email, populatedOrder);
      console.log('✅ Customer confirmation email sent to:', req.user.email);

      // SMS to customer (if they have phone number)
      if (req.user.phone) {
        await sendCustomerOrderSMS(req.user.phone, populatedOrder);
        console.log('✅ Customer confirmation SMS sent to:', req.user.phone);
      }

      // Email notification to admin
      await sendAdminOrderNotification(populatedOrder, {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      });
      console.log('✅ Admin email notification sent for order:', order.orderNumber);

      // SMS notification to admin
      await sendAdminOrderSMS(populatedOrder, {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      });
      console.log('✅ Admin SMS notification sent for order:', order.orderNumber);

    } catch (notificationError) {
      console.error('❌ Notification sending failed:', notificationError.message);
      // Continue with order creation even if notifications fail
    }

    res.status(201).json(order);
  } catch (error) {
    if (reserved.length) await restoreStock(reserved).catch(() => {});
    if (claimedLiveOrder) await releaseLiveOrder().catch(() => {});
    if (error instanceof PricingError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    console.error('Order creation error:', error.message);
    res.status(500).json({ message: 'Could not create order. Please try again.' });
  }
});

// @route   GET /api/orders/myorders
// @desc    Get logged in user's orders
// @access  Private
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name image')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name image price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is admin or order owner
    const isAdmin = req.user.role === 'admin';
    const isOrderOwner = order.user._id.toString() === req.user._id.toString();
    
    if (!isAdmin && !isOrderOwner) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// @route   PUT /api/orders/:id/pay
// @desc    Mark a Cash-on-Delivery order as paid (Admin). Online orders are only
//          ever marked paid by the verified-payment flow in POST /api/orders.
// @access  Private/Admin
router.put('/:id/pay', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentInfo?.method !== 'cod') {
      return res.status(400).json({ message: 'Only Cash on Delivery orders can be marked paid manually' });
    }
    order.isPaid = true;
    order.paidAt = Date.now();
    res.json(await order.save());
  } catch (error) {
    console.error('Mark paid error:', error.message);
    res.status(500).json({ message: 'Could not update order' });
  }
});

// @route   GET /api/orders
// @desc    Get all orders (Admin)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email phone')
      .populate('items.product', 'name image price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin)
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!ORDER_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ message: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }

    // Return stock when an order is cancelled for the first time
    if (req.body.status === 'cancelled' && order.status !== 'cancelled') {
      await restoreStock(order.items.map((i) => ({ product: i.product, quantity: i.quantity })));
    }

    order.status = req.body.status;

    if (req.body.status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    if (req.body.trackingNumber) {
      order.trackingNumber = req.body.trackingNumber;
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

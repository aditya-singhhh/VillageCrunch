const mongoose = require('mongoose');
const { defineModel } = require('../db');

const liveOrderSchema = new mongoose.Schema({
  razorpayOrderId: {
    type: String,
    required: true, // unique by construction (issued by Razorpay)
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userInfo: {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  cartItems: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    weight: String,
    image: String,
    category: String,
  }],
  priceBreakdown: {
    itemsPrice: Number,
    shippingPrice: Number,
    taxPrice: Number,
    totalPrice: Number,
    promocodeDiscount: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['created', 'payment_pending', 'payment_failed', 'paid', 'cancelled', 'converted_to_order'],
    default: 'created',
  },
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentVerified: { type: Boolean, default: false },
  finalOrderId: { // Reference to the final Order when payment is completed
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  // Saved when payment starts, so a paid order can be created even if the customer never
  // comes back to the site after paying (Facebook/Instagram in-app browsers, closed tabs).
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  giftMessage: String,
  tracking: { fbp: String, fbc: String, ip: String, ua: String },
  paidVia: String, // 'checkout' | 'webhook' | 'reconcile' | 'admin'
  notes: {
    type: Map,
    of: String,
  },
  expiryTime: {
    type: Date,
    default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from creation
    // Firestore: enable a TTL policy on liveOrders.expiryTime (see docs/FIREBASE_DEPLOYMENT.md)
  },
}, { 
  timestamps: true,
});

// Index for efficient queries
liveOrderSchema.index({ user: 1, status: 1 });
liveOrderSchema.index({ createdAt: -1 });

// Method to convert LiveOrder to full Order
liveOrderSchema.methods.convertToFullOrder = function(shippingAddress = null) {
  const Order = require('./Order');
  
  return new Order({
    user: this.user,
    orderNumber: `ORD-${Date.now()}-${this.user.toString().slice(-4)}`,
    items: this.cartItems.map(item => ({
      product: item.productId,
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      price: item.price,
      weight: item.weight,
    })),
    shippingAddress: shippingAddress,
    paymentInfo: {
      razorpayOrderId: this.razorpayOrderId,
      razorpayPaymentId: this.razorpayPaymentId,
      razorpaySignature: this.razorpaySignature,
      method: 'Online',
    },
    itemsPrice: this.priceBreakdown.itemsPrice,
    shippingPrice: this.priceBreakdown.shippingPrice,
    taxPrice: this.priceBreakdown.taxPrice,
    totalPrice: this.priceBreakdown.totalPrice,
    promocodeDiscount: this.priceBreakdown.promocodeDiscount,
    status: 'pending',
    isPaid: true,
    paidAt: new Date(),
  });
};

module.exports = defineModel('LiveOrder', liveOrderSchema, { collection: 'liveOrders' });
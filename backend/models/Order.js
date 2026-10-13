const mongoose = require('mongoose');
const { defineModel } = require('../db');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      name: String,
      image: String,
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },
      weight: String,
    },
  ],
  // Optional message printed on the gift card in the box
  giftMessage: { type: String, trim: true, maxlength: 300 },
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  paymentInfo: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    method: {
      type: String,
      enum: ['Online', 'cod'],
      required: true,
    },
  },
  itemsPrice: { type: Number, required: true },
  shippingPrice: { type: Number, required: true, default: 0 },
  taxPrice: { type: Number, required: true, default: 0 },
  totalPrice: { type: Number, required: true },
  promocode: {
    code: String,
    discount: { type: Number, default: 0 },
    description: String,
  },
  promocodeDiscount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ],
    default: 'pending',
  },
  codVerified: { type: Boolean, default: false },
  isPaid: { type: Boolean, default: false },
  paidAt: Date,
  isDelivered: { type: Boolean, default: false },
  deliveredAt: Date,
  trackingNumber: String,
}, { timestamps: true });

module.exports = defineModel('Order', orderSchema, { collection: 'orders' });

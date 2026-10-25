const mongoose = require('mongoose');
const { defineModel } = require('../db');

/** A shopper who typed their phone at checkout. Marked converted when an order is placed. */
const leadSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: String,
  items: [{ productId: String, name: String, quantity: Number, price: Number }],
  total: Number,
  source: String, // e.g. fb / ig (utm_source)
  status: { type: String, default: 'open' }, // open | contacted | converted
  converted: { type: Boolean, default: false },
  orderId: String,
  lastSeenAt: Date,
}, { timestamps: true });

module.exports = defineModel('Lead', leadSchema, { collection: 'leads' });

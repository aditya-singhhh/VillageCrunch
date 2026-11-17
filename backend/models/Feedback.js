const mongoose = require('mongoose');
const { defineModel } = require('../db');

/** Post-delivery feedback from /feedback (logged-in customers; 3 taps + optional note/photos). */
const feedbackSchema = new mongoose.Schema({
  user: String,                       // user id
  orderId: String,
  order: String,                      // order number
  rating: { type: Number, min: 1, max: 5, required: true },
  condition: String,                  // perfect | some_broken | many_broken
  reorder: String,                    // yes | maybe | no
  comment: String,
  images: [String],                   // /uploads/feedback-images/...
  name: String,
  phone: String,
  status: { type: String, default: 'new' }, // new | handled
}, { timestamps: true });

module.exports = defineModel('Feedback', feedbackSchema, { collection: 'feedback' });

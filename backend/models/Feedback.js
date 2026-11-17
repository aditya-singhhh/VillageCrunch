const mongoose = require('mongoose');
const { defineModel } = require('../db');

/** Short post-delivery feedback from /feedback (3 taps + optional comment). */
const feedbackSchema = new mongoose.Schema({
  order: String,                      // order number from the link (?o=), if any
  rating: { type: Number, min: 1, max: 5, required: true },
  condition: String,                  // perfect | some_broken | many_broken
  reorder: String,                    // yes | maybe | no
  comment: String,
  name: String,
  status: { type: String, default: 'new' }, // new | handled
}, { timestamps: true });

module.exports = defineModel('Feedback', feedbackSchema, { collection: 'feedback' });

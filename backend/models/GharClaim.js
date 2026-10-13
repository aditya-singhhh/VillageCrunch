const mongoose = require('mongoose');
const { defineModel } = require('../db');

/**
 * "Ghar" Chhath campaign.
 *  type 'box'     - a free box of thekua sent from Bihar to someone who can't go home
 *  type 'chitthi' - a letter / memory (and optional Instagram video link) for the wall on /ghar
 *
 * Boxes: one per account, phone number and address (enforced by the unique keys below).
 */
const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true, maxlength: 200 },
  city: { type: String, trim: true, maxlength: 80 },
  state: { type: String, trim: true, maxlength: 60 },
  pincode: { type: String, trim: true, maxlength: 6 },
}, { _id: false });

const gharClaimSchema = new mongoose.Schema({
  type: { type: String, enum: ['box', 'chitthi'], required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, trim: true, maxlength: 10 },
  city: { type: String, trim: true, maxlength: 80 }, // where the person lives now

  // why they can't go home + their story
  reason: { type: String, enum: ['ticket', 'flight', 'leave', 'exams', 'abroad', 'other'], default: 'other' },
  story: { type: String, trim: true, maxlength: 280 },
  shareStory: { type: Boolean, default: false }, // ok to show on the page (after review)

  // box: where to send it (outside Bihar/Jharkhand)
  address: addressSchema,

  // chitthi: the letter and an optional video link (Instagram / YouTube)
  message: { type: String, trim: true, maxlength: 1200 },
  videoLink: { type: String, trim: true, maxlength: 300 },

  nominatedBy: { type: String, trim: true, maxlength: 12 },
  refCode: { type: String, required: true, unique: true },

  status: { type: String, enum: ['pending', 'approved', 'shipped', 'delivered', 'rejected'], default: 'pending' }, // chitthi: approved = shown
  adminNote: { type: String, trim: true, maxlength: 300 },

  // uniqueness keys (one per account / phone / address for each type)
  userKey: { type: String, required: true, unique: true },
  phoneKey: { type: String, required: true, unique: true },
  addressKey: { type: String, unique: true },
}, { timestamps: true });

gharClaimSchema.index({ type: 1, createdAt: -1 });
gharClaimSchema.index({ status: 1 });

module.exports = defineModel('GharClaim', gharClaimSchema, { collection: 'gharClaims' });

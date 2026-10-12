const mongoose = require('mongoose');
const { defineModel } = require('../db');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
  },
  image: {
    type: String,
    required: true,
  },
  images: [String],
  weight: {
    type: String,
  },
  // Pack options: products sharing a packGroup are shown as size/bundle choices on the product page.
  packGroup: { type: String },
  packLabel: { type: String },   // e.g. "400 g" or "Pack of 3"
  packNote: { type: String },    // e.g. "Save ₹49"
  packOrder: { type: Number, default: 0 },
  isBundle: { type: Boolean, default: false },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true, // set false to hide a product without deleting it
  },
  featured: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5,
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: String,
    rating: Number,
    comment: String,
    images: [String], // Array of review image URLs
    helpful: {
      type: Number,
      default: 0
    },
    helpfulUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    verified: {
      type: Boolean,
      default: true // Always true for purchased products
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  benefits: [String],
  ingredients: [String],
}, {
  timestamps: true,
});

module.exports = defineModel('Product', productSchema, { collection: 'products' });
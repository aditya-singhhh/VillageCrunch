const mongoose = require('mongoose');
const { defineModel } = require('../db');

const customerSupportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userPhone: String,
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  messages: [{
    sender: {
      type: String,
      enum: ['customer', 'agent', 'system'],
      required: true
    },
    senderName: String,
    message: String,
    image: String, // URL or base64
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  agentName: String,
  category: {
    type: String,
    enum: ['product-issue', 'delivery', 'refund', 'replacement', 'quality', 'other'],
    default: 'other'
  },
  resolution: String,
  callbackRequested: {
    type: Boolean,
    default: false
  },
  callbackCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: Date
});

// Update timestamp on save
const touchUpdatedAt = (doc) => {
  doc.updatedAt = new Date();
};

module.exports = defineModel('CustomerSupport', customerSupportSchema, { collection: 'customerSupports', beforeSave: [touchUpdatedAt] });

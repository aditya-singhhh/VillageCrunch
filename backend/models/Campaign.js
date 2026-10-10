const mongoose = require('mongoose');
const { defineModel } = require('../db');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['seasonal', 'flash_sale', 'bulk_discount', 'new_user', 'loyalty', 'festival'],
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed'],
    default: 'draft',
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  targetAudience: {
    type: String,
    enum: ['all', 'new_users', 'existing_users', 'premium_users'],
    default: 'all',
  },
  budget: {
    type: Number, // Maximum discount amount for this campaign
  },
  spentAmount: {
    type: Number,
    default: 0,
  },
  promocodes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promocode',
  }],
  metrics: {
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Index for performance
campaignSchema.index({ status: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if campaign is currently active
campaignSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now &&
         (!this.budget || this.spentAmount < this.budget);
});

// Method to update campaign metrics
campaignSchema.methods.updateMetrics = function(orderValue, discountAmount) {
  this.metrics.totalOrders += 1;
  this.metrics.totalRevenue += orderValue;
  this.metrics.totalDiscount += discountAmount;
  this.spentAmount += discountAmount;
  
  // Calculate conversion rate (this is a simplified version)
  // In a real app, you'd track campaign views vs orders
  this.metrics.conversionRate = (this.metrics.totalOrders / (this.metrics.totalOrders + 100)) * 100;
  
  return this.save();
};

module.exports = defineModel('Campaign', campaignSchema, { collection: 'campaigns' });
const mongoose = require('mongoose');
const { defineModel } = require('../db');

const settingsSchema = new mongoose.Schema({
  // Single document with a fixed id
  _id: { type: String, default: 'main' },

  // Pricing Settings - SIMPLIFIED TO MATCH FRONTEND
  pricing: {
    currency: {
      type: String,
      default: 'INR',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
    taxRate: {
      type: Number,
      default: 18,
    },
    shippingCharges: {
      standard: {
        rate: {
          type: Number,
          default: 50,
        },
        freeShippingThreshold: {
          type: Number,
          default: 500,
        },
        freeShippingEnabled: {
          type: Boolean,
          default: true,
        },
      },
      express: {
        rate: {
          type: Number,
          default: 100,
        },
        freeShippingThreshold: {
          type: Number,
          default: 1000,
        },
      },
      overnight: {
        rate: {
          type: Number,
          default: 200,
        },
        freeShippingThreshold: {
          type: Number,
          default: 2000,
        },
      },
    },
    codCharges: {
      type: Number,
      default: 25,
    },
  },

  // Business Settings - SIMPLIFIED TO MATCH FRONTEND
  business: {
    companyName: {
      type: String,
      default: 'Premium Dry Fruits Store',
    },
    email: {
      type: String,
      default: 'info@premiumdryfruits.com',
    },
    phone: {
      type: String,
      default: '+91 9876543210',
    },
    address: {
      type: String,
      default: '123 Business District, Delhi, India',
    },
    gstNumber: {
      type: String,
      default: '07AAACH7409R1Z5',
    },
  },

  // Notifications - SIMPLIFIED TO MATCH FRONTEND
  notifications: {
    orderConfirmation: {
      type: Boolean,
      default: true,
    },
    stockAlerts: {
      type: Boolean,
      default: true,
    },
    newUserWelcome: {
      type: Boolean,
      default: true,
    },
    promotionalEmails: {
      type: Boolean,
      default: true,
    },
  },

}, {
  timestamps: true,
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({});
  if (!settings) {
    try {
      settings = new this({});
      await settings.save();
    } catch (err) {
      // Another instance created it first (fixed id => ALREADY_EXISTS): read theirs
      settings = await this.findOne({});
      if (!settings) throw err;
    }
  }
  return settings;
};

settingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.getSettings();
  Object.assign(settings, updates);
  return await settings.save();
};

module.exports = defineModel('Settings', settingsSchema, { collection: 'settings' });
const mongoose = require('mongoose');
const { defineModel } = require('../db');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One cart per user
  },
  items: [cartItemSchema],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Update lastUpdated on save
const touchLastUpdated = (doc) => {
  doc.lastUpdated = new Date();
};

// Methods
cartSchema.methods.addItem = function(productId, quantity = 1, price) {
  const existingItem = this.items.find(item => 
    item.product.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.price = price; // Update price in case it changed
  } else {
    this.items.push({
      product: productId,
      quantity,
      price,
    });
  }

  return this.save();
};

cartSchema.methods.updateItem = function(productId, quantity) {
  const item = this.items.find(item => 
    item.product.toString() === productId.toString()
  );

  if (item) {
    if (quantity <= 0) {
      this.items = this.items.filter(item => 
        item.product.toString() !== productId.toString()
      );
    } else {
      item.quantity = quantity;
    }
  }

  return this.save();
};

cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => 
    item.product.toString() !== productId.toString()
  );

  return this.save();
};

cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

cartSchema.methods.getTotal = function() {
  return this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
};

module.exports = defineModel('Cart', cartSchema, { collection: 'carts', beforeSave: [touchLastUpdated] });
const mongoose = require('mongoose');
const { defineModel } = require('../db');

const promocodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
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
    enum: ['percentage', 'fixed', 'freeShipping'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  applicableOn: {
    type: String,
    enum: ['all', 'category', 'product'],
    default: 'all',
  },
  categories: [{
    type: String,
  }],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  minOrderValue: {
    type: Number,
    default: 0,
  },
  maxDiscount: {
    type: Number, // For percentage discounts
  },
  usageLimit: {
    type: Number,
    default: null, // null means unlimited
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  userUsageLimit: {
    type: Number,
    default: 1, // How many times one user can use this code
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
    orderValue: Number,
    discountAmount: Number,
  }],
}, {
  timestamps: true,
});

// Index for faster queries (code index is already created by unique: true)
promocodeSchema.index({ isActive: 1 });
promocodeSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if promocode is currently valid
promocodeSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  const isActiveCheck = this.isActive;
  
  // For start date, check if it's the same day or earlier (more lenient)
  let startDateCheck = true;
  if (this.startDate) {
    const startDay = new Date(this.startDate);
    startDay.setHours(0, 0, 0, 0);
    const nowDay = new Date(now);
    nowDay.setHours(0, 0, 0, 0);
    startDateCheck = startDay <= nowDay;
  }
  
  // For end date, check if it's the same day or later (more lenient)
  let endDateCheck = true;
  if (this.endDate) {
    const endDay = new Date(this.endDate);
    endDay.setHours(23, 59, 59, 999);
    endDateCheck = endDay >= now;
  }
  
  const usageLimitCheck = !this.usageLimit || this.usageCount < this.usageLimit;
  
  console.log('🕐 Validity check for', this.code, {
    now: now.toISOString(),
    isActive: isActiveCheck,
    startDate: this.startDate ? this.startDate.toISOString() : 'null',
    endDate: this.endDate ? this.endDate.toISOString() : 'null',
    startDateCheck,
    endDateCheck,
    usageCount: this.usageCount,
    usageLimit: this.usageLimit,
    usageLimitCheck,
    finalResult: isActiveCheck && startDateCheck && endDateCheck && usageLimitCheck
  });
  
  return isActiveCheck && startDateCheck && endDateCheck && usageLimitCheck;
});

// Method to check if user can use this promocode
promocodeSchema.methods.canUserUse = function(userId) {
  if (!this.isCurrentlyValid) return false;
  
  // If no userId provided, allow validation (for guest users)
  if (!userId) return true;
  
  // If no userUsageLimit set, allow unlimited usage per user
  if (!this.userUsageLimit || this.userUsageLimit === 0) return true;
  
  // Count how many times this user has used this promocode
  const userUsage = this.usedBy ? this.usedBy.filter(usage => 
    usage.user && usage.user.toString() === userId.toString()
  ).length : 0;
  
  return userUsage < this.userUsageLimit;
};

// Method to apply promocode and calculate discount
promocodeSchema.methods.calculateDiscount = function(orderValue, products = [], categories = []) {
  if (!this.isCurrentlyValid) {
    return { valid: false, message: 'Promocode is not valid or expired' };
  }

  if (orderValue < this.minOrderValue) {
    const amountNeeded = this.minOrderValue - orderValue;
    return { 
      valid: false, 
      message: `Minimum order value should be ₹${this.minOrderValue}. Add ₹${amountNeeded.toFixed(2)} more to use this promocode.`,
      minOrderValue: this.minOrderValue,
      currentOrderValue: orderValue,
      amountNeeded: amountNeeded
    };
  }

  // Check applicability
  let applicable = false;
  let applicableAmount = orderValue;

  console.log('🧮 Calculating discount for:', {
    code: this.code,
    type: this.type,
    value: this.value,
    applicableOn: this.applicableOn,
    orderValue,
    categories,
    products: products.map(p => p._id || p)
  });

  if (this.applicableOn === 'all') {
    applicable = true;
  } else if (this.applicableOn === 'category') {
    const matchingCategories = categories.filter(cat => 
      this.categories.includes(cat)
    );
    applicable = matchingCategories.length > 0;
    console.log('📂 Category check:', { 
      promocodeCategories: this.categories, 
      orderCategories: categories, 
      matchingCategories,
      applicable 
    });
  } else if (this.applicableOn === 'product') {
    // Extract product IDs from the products array (handle both ObjectId strings and product objects)
    const cartProductIds = products.map(prod => {
      if (typeof prod === 'string') return prod;
      if (prod.productId) return prod.productId;
      if (prod._id) return prod._id;
      return prod.toString();
    });
    
    // Convert promocode products (ObjectIds) to strings for comparison
    const promocodeProductIds = this.products.map(p => p.toString());
    
    const matchingProducts = cartProductIds.filter(productId => 
      promocodeProductIds.includes(productId.toString())
    );
    applicable = matchingProducts.length > 0;
    console.log('📦 Product check:', { 
      promocodeProductIds, 
      cartProductIds, 
      matchingProducts,
      applicable 
    });
  }

  if (!applicable) {
    let message = 'Promocode is not applicable to your cart items';
    
    if (this.applicableOn === 'product') {
      message = 'This promocode is only valid for specific products not in your cart';
    } else if (this.applicableOn === 'category') {
      const applicableCategories = this.categories.join(', ');
      message = `This promocode is only valid for products in categories: ${applicableCategories}`;
    }
    
    return { 
      valid: false, 
      message: message 
    };
  }

  console.log('💰 Discount calculation:', {
    applicableAmount,
    type: this.type,
    value: this.value,
    maxDiscount: this.maxDiscount
  });

  let discount = 0;

  switch (this.type) {
    case 'percentage':
      discount = (applicableAmount * this.value) / 100;
      console.log('📊 Percentage calculation:', {
        formula: `(${applicableAmount} * ${this.value}) / 100`,
        result: discount
      });
      if (this.maxDiscount && discount > this.maxDiscount) {
        discount = this.maxDiscount;
        console.log('🚫 Applied max discount cap:', this.maxDiscount);
      }
      break;
    case 'fixed':
      discount = Math.min(this.value, applicableAmount);
      break;
    case 'freeShipping':
      discount = 0; // Shipping discount handled separately
      break;
  }

  return {
    valid: true,
    discount: Math.round(discount),
    type: this.type,
    message: `Promocode applied successfully! You saved ₹${Math.round(discount)}`,
  };
};

module.exports = defineModel('Promocode', promocodeSchema, { collection: 'promocodes' });
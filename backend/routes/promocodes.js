const express = require('express');
const router = express.Router();
const Promocode = require('../models/Promocode');
const Campaign = require('../models/Campaign');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

// @route   GET /api/promocodes
// @desc    Get all promocodes (Admin)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const { status, campaign, type } = req.query;
    let query = {};

    if (status) query.isActive = status === 'active';
    if (campaign) query.campaign = campaign;
    if (type) query.type = type;

    const promocodes = await Promocode.find(query)
      .populate('campaign', 'name type')
      .populate('products', 'name price')
      .sort({ createdAt: -1 });

    res.json(promocodes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/promocodes/:id
// @desc    Get single promocode
// @access  Private/Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const promocode = await Promocode.findById(req.params.id)
      .populate('campaign', 'name type status')
      .populate('products', 'name price image')
      .populate('usedBy.user', 'name email');

    if (!promocode) {
      return res.status(404).json({ message: 'Promocode not found' });
    }

    res.json(promocode);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/promocodes
// @desc    Create a new promocode
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    console.log('📝 Creating promocode with data:', req.body);
    console.log('👤 User:', req.user?.email, 'Role:', req.user?.role);
    
    const promocodeData = {
      ...req.body,
      createdBy: req.user._id,
    };

    console.log('💾 Final promocode data:', promocodeData);
    const promocode = await Promocode.create(promocodeData);

    // If this promocode is part of a campaign, add it to the campaign
    if (promocode.campaign) {
      await Campaign.findByIdAndUpdate(
        promocode.campaign,
        { $push: { promocodes: promocode._id } }
      );
    }

    res.status(201).json(promocode);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Promocode already exists' });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
});

// @route   PUT /api/promocodes/:id
// @desc    Update a promocode
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const promocode = await Promocode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('campaign', 'name type');

    if (!promocode) {
      return res.status(404).json({ message: 'Promocode not found' });
    }

    res.json(promocode);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/promocodes/:id
// @desc    Delete a promocode
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const promocode = await Promocode.findByIdAndDelete(req.params.id);

    if (!promocode) {
      return res.status(404).json({ message: 'Promocode not found' });
    }

    // Remove from campaign if associated
    if (promocode.campaign) {
      await Campaign.findByIdAndUpdate(
        promocode.campaign,
        { $pull: { promocodes: promocode._id } }
      );
    }

    res.json({ message: 'Promocode deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/promocodes/validate
// @desc    Validate a promocode for user (Public - for cart)
// @access  Public
router.post('/validate', async (req, res) => {
  try {
    const { code, orderValue, products = [], categories = [], userId } = req.body;
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ valid: false, message: 'Please enter a promocode' });
    }
    
    console.log('🔍 Validating promocode:', code, 'for user:', userId);

    const promocode = await Promocode.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    }); // Don't populate products here, we need the raw ObjectIds
    
    console.log('📋 Promocode found:', promocode ? 'YES' : 'NO');
    if (promocode) {
      console.log('📊 Promocode details:', {
        code: promocode.code,
        userUsageLimit: promocode.userUsageLimit,
        usedByCount: promocode.usedBy ? promocode.usedBy.length : 0,
        isCurrentlyValid: promocode.isCurrentlyValid
      });
    }

    if (!promocode) {
      return res.status(404).json({ 
        valid: false, 
        message: `Promocode '${code.toUpperCase()}' is not valid or does not exist. Please check the code and try again.`
      });
    }

    // Check if user can use this promocode (only if userId is provided)
    const canUse = promocode.canUserUse(userId);
    console.log('👤 Can user use promocode?', canUse, 'UserID:', userId);
    
    if (userId && !canUse) {
      return res.status(400).json({
        valid: false,
        message: `You have already used this promocode. Each user can use this promocode only ${promocode.userUsageLimit} time(s).`,
        userUsageLimit: promocode.userUsageLimit,
        userUsageCount: promocode.usedBy ? promocode.usedBy.filter(u => u.user && u.user.toString() === userId).length : 0
      });
    }

    const result = promocode.calculateDiscount(orderValue, products, categories);
    
    res.json({
      ...result,
      promocode: {
        _id: promocode._id,
        code: promocode.code,
        name: promocode.name,
        description: promocode.description,
        type: promocode.type,
        value: promocode.value,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/promocodes/apply/:id
// @desc    Apply promocode to an order (called during order creation)
// @access  Private
router.post('/apply/:id', protect, async (req, res) => {
  try {
    const { orderValue, discountAmount } = req.body;
    const promocode = await Promocode.findById(req.params.id);

    if (!promocode) {
      return res.status(404).json({ message: 'Promocode not found' });
    }

    // Add usage record
    promocode.usedBy.push({
      user: req.user._id,
      orderValue,
      discountAmount,
    });
    promocode.usageCount += 1;

    await promocode.save();

    // Update campaign metrics if associated
    if (promocode.campaign) {
      const campaign = await Campaign.findById(promocode.campaign);
      if (campaign) {
        await campaign.updateMetrics(orderValue, discountAmount);
      }
    }

    res.json({ message: 'Promocode applied successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/promocodes/stats/overview
// @desc    Get promocode statistics
// @access  Private/Admin
router.get('/stats/overview', protect, admin, async (req, res) => {
  try {
    const totalPromocodes = await Promocode.countDocuments();
    const activePromocodes = await Promocode.countDocuments({ isActive: true });
    const expiredPromocodes = await Promocode.countDocuments({ 
      endDate: { $lt: new Date() } 
    });

    // Firestore has no aggregation pipeline: sum in JavaScript (small collection)
    const allPromos = await Promocode.find({}).select('usageCount usedBy');
    const usageStats = [{
      totalUsage: allPromos.reduce((sum, p) => sum + (p.usageCount || 0), 0),
      totalDiscountGiven: allPromos.reduce(
        (sum, p) => sum + (p.usedBy || []).reduce((s2, u) => s2 + (u.discountAmount || 0), 0), 0),
    }];

    const topPromocodes = await Promocode.find({ usageCount: { $gt: 0 } })
      .sort({ usageCount: -1 })
      .limit(5)
      .select('code name usageCount type');

    res.json({
      overview: {
        total: totalPromocodes,
        active: activePromocodes,
        expired: expiredPromocodes,
        totalUsage: usageStats[0]?.totalUsage || 0,
        totalDiscountGiven: usageStats[0]?.totalDiscountGiven || 0,
      },
      topPromocodes
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
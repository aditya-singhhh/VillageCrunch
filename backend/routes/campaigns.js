const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Promocode = require('../models/Promocode');
const { protect, admin } = require('../middleware/auth');

// @route   GET /api/campaigns
// @desc    Get all campaigns
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = {};

    if (status) query.status = status;
    if (type) query.type = type;

    const campaigns = await Campaign.find(query)
      .populate('promocodes', 'code name type usageCount')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/campaigns/:id
// @desc    Get single campaign
// @access  Private/Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('promocodes')
      .populate('createdBy', 'name email');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/campaigns
// @desc    Create a new campaign
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const campaignData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const campaign = await Campaign.create(campaignData);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/campaigns/:id
// @desc    Update a campaign
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('promocodes', 'code name type');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/campaigns/:id
// @desc    Delete a campaign
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Remove campaign reference from associated promocodes
    await Promocode.updateMany(
      { campaign: campaign._id },
      { $unset: { campaign: 1 } }
    );

    await Campaign.findByIdAndDelete(req.params.id);

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/campaigns/:id/status
// @desc    Update campaign status
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // If activating campaign, activate associated promocodes
    if (status === 'active') {
      await Promocode.updateMany(
        { campaign: campaign._id },
        { isActive: true }
      );
    }

    // If pausing/completing campaign, deactivate associated promocodes
    if (status === 'paused' || status === 'completed') {
      await Promocode.updateMany(
        { campaign: campaign._id },
        { isActive: false }
      );
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/campaigns/:id/analytics
// @desc    Get campaign analytics
// @access  Private/Admin
router.get('/:id/analytics', protect, admin, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('promocodes');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Calculate detailed analytics
    const promocodeStats = await Promise.all(
      campaign.promocodes.map(async (promocode) => {
        const code = await Promocode.findById(promocode._id);
        return {
          code: code.code,
          name: code.name,
          usageCount: code.usageCount,
          totalDiscount: code.usedBy.reduce((sum, usage) => sum + (usage.discountAmount || 0), 0),
          averageOrderValue: code.usedBy.length > 0 
            ? code.usedBy.reduce((sum, usage) => sum + (usage.orderValue || 0), 0) / code.usedBy.length 
            : 0,
        };
      })
    );

    // Daily usage over campaign period (computed in JavaScript; Firestore has no $group)
    const campaignPromos = await Promocode.find({ campaign: campaign._id }).select('usedBy');
    const byDay = new Map();
    for (const promo of campaignPromos) {
      for (const usage of promo.usedBy || []) {
        const day = new Date(usage.usedAt || Date.now()).toISOString().slice(0, 10);
        const row = byDay.get(day) || { _id: day, orders: 0, revenue: 0, discount: 0 };
        row.orders += 1;
        row.revenue += usage.orderValue || 0;
        row.discount += usage.discountAmount || 0;
        byDay.set(day, row);
      }
    }
    const dailyUsage = [...byDay.values()].sort((x, y) => (x._id < y._id ? -1 : 1));

    res.json({
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        metrics: campaign.metrics,
        budget: campaign.budget,
        spentAmount: campaign.spentAmount,
        remainingBudget: campaign.budget ? campaign.budget - campaign.spentAmount : null,
      },
      promocodeStats,
      dailyUsage,
      performance: {
        roi: campaign.metrics.totalRevenue > 0 
          ? ((campaign.metrics.totalRevenue - campaign.metrics.totalDiscount) / campaign.metrics.totalDiscount * 100).toFixed(2)
          : 0,
        averageOrderValue: campaign.metrics.totalOrders > 0 
          ? (campaign.metrics.totalRevenue / campaign.metrics.totalOrders).toFixed(2)
          : 0,
        discountRate: campaign.metrics.totalRevenue > 0 
          ? (campaign.metrics.totalDiscount / campaign.metrics.totalRevenue * 100).toFixed(2)
          : 0,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/campaigns/stats/overview
// @desc    Get campaigns overview statistics
// @access  Private/Admin
router.get('/stats/overview', protect, admin, async (req, res) => {
  try {
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: 'active' });
    const completedCampaigns = await Campaign.countDocuments({ status: 'completed' });

    const allCampaigns = await Campaign.find({}).select('metrics');
    const sumMetric = (key) => allCampaigns.reduce((sum, c) => sum + ((c.metrics && c.metrics[key]) || 0), 0);
    const campaignMetrics = [{
      totalRevenue: sumMetric('totalRevenue'),
      totalOrders: sumMetric('totalOrders'),
      totalDiscount: sumMetric('totalDiscount'),
      averageConversionRate: allCampaigns.length ? sumMetric('conversionRate') / allCampaigns.length : 0,
    }];

    const topCampaigns = await Campaign.find({ 'metrics.totalOrders': { $gt: 0 } })
      .sort({ 'metrics.totalRevenue': -1 })
      .limit(5)
      .select('name type metrics status');

    res.json({
      overview: {
        total: totalCampaigns,
        active: activeCampaigns,
        completed: completedCampaigns,
        totalRevenue: campaignMetrics[0]?.totalRevenue || 0,
        totalOrders: campaignMetrics[0]?.totalOrders || 0,
        totalDiscount: campaignMetrics[0]?.totalDiscount || 0,
        averageConversionRate: campaignMetrics[0]?.averageConversionRate || 0,
      },
      topCampaigns
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
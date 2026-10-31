const express = require('express');
const { priceCart, PricingError } = require('../services/pricing');
const router = express.Router();
const Settings = require('../models/Settings');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

const MASALA_BLOCKED_MESSAGE = 'Masala items are coming soon and cannot be purchased yet';

// @route   GET /api/settings
// @desc    Get all settings
// @access  Public (for basic settings like currency, tax) / Private (for sensitive settings)
// @route GET /api/settings/alerts  (admin) - the ntfy topic to subscribe to on the phone
router.get('/alerts', protect, admin, async (req, res) => {
  const topic = await require('../services/alerts').getTopic();
  res.json({ topic, url: `https://ntfy.sh/${topic}` });
});

// @route POST /api/settings/alerts/test  (admin) - send a test alert
router.post('/alerts/test', protect, admin, async (req, res) => {
  const ok = await require('../services/alerts').push('Test alert - VillageCrunch', 'Order alerts are working. You will get one of these for every new order.', { tags: 'white_check_mark' });
  res.json({ ok });
});

// @route GET /api/settings/meta-capi (admin) - is server-side Purchase tracking set up?
router.get('/meta-capi', protect, admin, async (req, res) => {
  const { token, pixelId } = await require('../services/metaCapi').getConfig();
  res.json({ configured: !!token, pixelId, fromEnv: !!process.env.META_CAPI_TOKEN });
});

// @route PUT /api/settings/meta-capi (admin) - save the Conversions API token (never returned)
router.put('/meta-capi', protect, admin, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const pixelId = String(req.body?.pixelId || '').trim();
  if (token && !/^[A-Za-z0-9_-]{40,600}$/.test(token)) return res.status(400).json({ message: 'That does not look like a Meta access token' });
  if (pixelId && !/^\d{10,20}$/.test(pixelId)) return res.status(400).json({ message: 'Pixel ID should be digits only' });
  const s = await Settings.getSettings();
  const cur = (s.toObject().metaCapi) || {};
  s.metaCapi = { ...cur, ...(token ? { token } : {}), ...(pixelId ? { pixelId } : {}) };
  await s.save();
  const result = token ? await require('../services/metaCapi').backfill({ days: 7 }) : null;
  res.json({ configured: !!(s.metaCapi.token), backfill: result });
});

// @route POST /api/settings/meta-capi/backfill (admin) - send recent orders Meta has not seen
router.post('/meta-capi/backfill', protect, admin, async (req, res) => {
  res.json(await require('../services/metaCapi').backfill({ days: 7 }));
});

router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Return only public settings if not admin
    if (!req.user || !req.user.isAdmin) {
      return res.json({
        pricing: {
          currency: settings.pricing.currency,
          currencySymbol: settings.pricing.currencySymbol,
          taxRate: settings.pricing.taxRate,
          pricesIncludeTax: settings.pricing.pricesIncludeTax !== false,
          shippingCharges: settings.pricing.shippingCharges,
          codCharges: settings.pricing.codCharges,
        },
        business: {
          companyName: settings.business.companyName,
          phone: settings.business.phone,
          email: settings.business.email,
        }
      });
    }

    // Return all settings for admin (secrets removed)
    const all = settings.toObject ? settings.toObject() : { ...settings };
    if (all.metaCapi) all.metaCapi = { pixelId: all.metaCapi.pixelId, configured: !!all.metaCapi.token };
    if (all.payments) all.payments = { webhookConfigured: !!all.payments.webhookSecret };
    res.json(all);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/settings
// @desc    Update settings
// @access  Private/Admin
router.put('/', protect, admin, async (req, res) => {
  try {
    console.log('Settings update request body:', JSON.stringify(req.body, null, 2));
    
    // Save data directly as sent from frontend - SIMPLIFIED
    const settings = await Settings.updateSettings(req.body);
    console.log('Settings updated successfully');
    res.json(settings);
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/settings/pricing
// @desc    Get pricing settings (public)
// @access  Public
router.get('/pricing', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings.pricing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/settings/pricing
// @desc    Update pricing settings
// @access  Private/Admin
router.put('/pricing', protect, admin, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    settings.pricing = { ...settings.toObject().pricing, ...req.body };
    await settings.save();
    res.json(settings.pricing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/settings/business
// @desc    Get business settings
// @access  Private/Admin
router.get('/business', protect, admin, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings.business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/settings/business
// @desc    Update business settings
// @access  Private/Admin
router.put('/business', protect, admin, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    settings.business = { ...settings.toObject().business, ...req.body };
    await settings.save();
    res.json(settings.business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/settings/calculate-order-total
// @desc    Calculate order total. Prices come from the database and the promocode
//          is validated server-side - the same engine that charges the customer.
// @access  Public
router.post('/calculate-order-total', async (req, res) => {
  try {
    const { items, shippingMethod = 'standard', promocode, paymentMethod } = req.body;
    const promocodeCode = typeof promocode === 'string' ? promocode : promocode?.code;

    const pricing = await priceCart({
      items,
      shippingMethod,
      paymentMethod,
      promocodeCode,
      checkStock: false, // stock is enforced when the order is placed
    });

    res.json({
      items: pricing.lines.map((l) => ({
        productId: l.product,
        name: l.name,
        price: l.price,
        quantity: l.quantity,
        total: l.lineTotal,
      })),
      subtotal: pricing.subtotal,
      shipping: {
        method: shippingMethod,
        cost: pricing.shipping,
        freeShippingThreshold: pricing.shippingConfig.freeShippingThreshold,
        qualifiesForFreeShipping: pricing.shipping === 0,
      },
      tax: {
        rate: pricing.taxRate,
        amount: pricing.tax,
        inclusive: pricing.taxInclusive,
      },
      codCharge: pricing.codCharge,
      discount: {
        applied: pricing.discount > 0 || !!pricing.promo,
        amount: pricing.discount,
        details: pricing.promo
          ? { code: pricing.promo.code, type: pricing.promo.type, amount: pricing.discount }
          : null,
      },
      total: pricing.total,
      currency: pricing.currency,
    });
  } catch (error) {
    if (error instanceof PricingError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    console.error('Calculate order total error:', error.message);
    res.status(500).json({ message: 'Could not calculate order total' });
  }
});

// @route   GET /api/settings/shipping-options
// @desc    Get shipping options with current pricing
// @access  Public
router.get('/shipping-options', async (req, res) => {
  try {
    const { orderValue } = req.query;
    const settings = await Settings.getSettings();
    
    const orderVal = parseFloat(orderValue) || 0;
    const standardFreeShippingEligible = orderVal >= settings.pricing.shippingCharges.standard.freeShippingThreshold;
    const expressFreeShippingEligible = orderVal >= settings.pricing.shippingCharges.express.freeShippingThreshold;

    const shippingOptions = [
      {
        id: 'standard',
        name: 'Standard Delivery',
        description: '5-7 business days',
        cost: standardFreeShippingEligible ? 0 : settings.pricing.shippingCharges.standard.rate,
        estimatedDays: '5-7',
        free: standardFreeShippingEligible
      },
      {
        id: 'express',
        name: 'Express Delivery', 
        description: '2-3 business days',
        cost: expressFreeShippingEligible ? 0 : settings.pricing.shippingCharges.express.rate,
        estimatedDays: '2-3',
        free: expressFreeShippingEligible
      }
    ];

    res.json({
      options: shippingOptions,
      freeShippingThreshold: settings.pricing.shippingCharges.standard.freeShippingThreshold,
      qualifiesForFreeShipping: standardFreeShippingEligible,
      currency: settings.pricing.currency
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
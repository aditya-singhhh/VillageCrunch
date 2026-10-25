/**
 * Checkout leads ("abandoned checkouts").
 *  POST /api/leads            public: phone (+ name, cart) saved as soon as it's typed at checkout
 *  GET  /api/leads            admin: recent leads, newest first
 *  PUT  /api/leads/:id        admin: { status: 'contacted' | 'open' }
 */
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { protect, admin } = require('../middleware/auth');

const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const PHONE = /^[6-9]\d{9}$/;

router.post('/', async (req, res) => {
  try {
    const phone = clean(req.body?.phone, 15).replace(/\D/g, '').slice(-10);
    if (!PHONE.test(phone)) return res.status(400).json({ message: 'Invalid phone' });
    const items = (Array.isArray(req.body?.items) ? req.body.items : []).slice(0, 20).map((i) => ({
      productId: clean(i?.productId, 40),
      name: clean(i?.name, 120),
      quantity: Math.max(0, Math.min(99, Number(i?.quantity) || 0)),
      price: Math.max(0, Number(i?.price) || 0),
    }));
    const total = Math.max(0, Number(req.body?.total) || 0);
    const data = {
      phone,
      name: clean(req.body?.name, 80) || undefined,
      items: items.length ? items : undefined,
      total: total || undefined,
      source: clean(req.body?.source, 30) || undefined,
      lastSeenAt: new Date(),
    };
    const existing = await Lead.findOne({ phone, converted: false });
    if (existing) {
      Object.assign(existing, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
      await existing.save();
    } else {
      await Lead.create(data);
    }
    res.status(204).end();
  } catch (e) {
    console.error('lead save failed', e);
    res.status(204).end(); // never block checkout
  }
});

router.get('/', protect, admin, async (req, res) => {
  const leads = await Lead.find({});
  leads.sort((a, b) => new Date(b.lastSeenAt || b.createdAt) - new Date(a.lastSeenAt || a.createdAt));
  res.json(leads.slice(0, 300));
});

router.put('/:id', protect, admin, async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Not found' });
  if (['open', 'contacted'].includes(req.body?.status)) lead.status = req.body.status;
  await lead.save();
  res.json(lead);
});

/** Called when an order is placed: closes the open lead for that phone. */
router.markConverted = async (phone, orderId) => {
  try {
    const ten = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!ten) return;
    const lead = await Lead.findOne({ phone: ten, converted: false });
    if (lead) { lead.converted = true; lead.status = 'converted'; lead.orderId = String(orderId || ''); await lead.save(); }
  } catch (_) { /* ignore */ }
};

module.exports = router;

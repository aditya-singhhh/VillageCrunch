/**
 * Post-delivery feedback.
 *  POST /api/feedback        public: { rating 1-5, condition, reorder, comment?, name?, order? }
 *  GET  /api/feedback        admin: newest first
 *  PUT  /api/feedback/:id    admin: { status: 'new' | 'handled' }
 */
const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { protect, admin } = require('../middleware/auth');

const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const CONDITIONS = ['perfect', 'some_broken', 'many_broken'];
const REORDER = ['yes', 'maybe', 'no'];

router.post('/', async (req, res) => {
  const rating = Math.round(Number(req.body?.rating));
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: 'Please choose a rating' });
  const condition = CONDITIONS.includes(req.body?.condition) ? req.body.condition : undefined;
  const reorder = REORDER.includes(req.body?.reorder) ? req.body.reorder : undefined;
  try {
    await Feedback.create({
      rating,
      condition,
      reorder,
      comment: clean(req.body?.comment, 600) || undefined,
      name: clean(req.body?.name, 60) || undefined,
      order: clean(req.body?.order, 40).replace(/[^\w-]/g, '') || undefined,
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('feedback save failed', e);
    res.status(500).json({ message: 'Could not save, please try again' });
  }
});

router.get('/', protect, admin, async (req, res) => {
  const list = await Feedback.find({});
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list.slice(0, 300));
});

router.put('/:id', protect, admin, async (req, res) => {
  const f = await Feedback.findById(req.params.id);
  if (!f) return res.status(404).json({ message: 'Not found' });
  if (['new', 'handled'].includes(req.body?.status)) f.status = req.body.status;
  await f.save();
  res.json(f);
});

module.exports = router;

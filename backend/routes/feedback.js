/**
 * Post-delivery feedback. One link for everyone (villagecrunch.in/feedback); the customer
 * logs in (phone OTP works for checkout guests) and we attach their order ourselves.
 *  POST /api/feedback        user: multipart { rating 1-5, condition, reorder, comment?, orderId?, images[] (≤3, 5 MB) }
 *  GET  /api/feedback        admin: newest first
 *  PUT  /api/feedback/:id    admin: { status: 'new' | 'handled' }
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/auth');
const { dirs, imageFileFilter, safeExtension } = require('../config/uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.feedback),
    filename: (req, file, cb) => cb(null, `fb-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExtension(file)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: imageFileFilter,
});

const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const CONDITIONS = ['perfect', 'some_broken', 'many_broken'];
const REORDER = ['yes', 'maybe', 'no'];
const dropFiles = (files) => (files || []).forEach((f) => fs.unlink(f.path, () => {}));

router.post('/', protect, (req, res, next) => {
  upload.array('images', 3)(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 5 MB' : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Up to 3 photos' : err.message });
    next();
  });
}, async (req, res) => {
  const rating = Math.round(Number(req.body?.rating));
  if (!(rating >= 1 && rating <= 5)) { dropFiles(req.files); return res.status(400).json({ message: 'Please choose a rating' }); }
  try {
    const mine = (await Order.find({ user: req.user._id })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const wanted = clean(req.body?.orderId, 40);
    const order = (wanted && mine.find((o) => String(o._id) === wanted))
      || mine.find((o) => ['delivered', 'shipped'].includes(o.status)) || mine[0];
    await Feedback.create({
      user: String(req.user._id),
      orderId: order ? String(order._id) : undefined,
      order: order?.orderNumber,
      rating,
      condition: CONDITIONS.includes(req.body?.condition) ? req.body.condition : undefined,
      reorder: REORDER.includes(req.body?.reorder) ? req.body.reorder : undefined,
      comment: clean(req.body?.comment, 600) || undefined,
      images: (req.files || []).map((f) => `/uploads/feedback-images/${f.filename}`),
      name: clean(req.user.name, 60) || clean(order?.shippingAddress?.name, 60) || undefined,
      phone: String(req.user.phone || order?.shippingAddress?.phone || '').replace(/\D/g, '').slice(-10) || undefined,
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    dropFiles(req.files);
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

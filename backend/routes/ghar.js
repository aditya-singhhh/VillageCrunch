/**
 * Chhath "Ghar" campaign (villagecrunch.in/ghar)
 *
 *  POST /api/ghar/claim    free box of thekua for someone away from Bihar (sign-in needed)
 *  POST /api/ghar/chitthi  a letter / memory (+ optional Instagram video link) for the wall (no sign-in)
 *  GET  /api/ghar/status   counters, next sunset drop, approved stories and letters
 *  GET  /api/ghar/mine    the signed-in user's claims
 *  Admin: GET /api/ghar/claims(.csv), PUT /api/ghar/claims/:id
 *
 * Boxes open in daily "sunset drops" at 6 pm IST. Unclaimed boxes roll over to the next day.
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const GharClaim = require('../models/GharClaim');
const { protect, admin } = require('../middleware/auth');

const env = (k, d) => process.env[k] || d;
const CFG = () => ({
  boxTotal: Number(env('GHAR_BOX_TOTAL', 300)),
  start: env('GHAR_START', '2026-10-19'), // first sunset drop (IST date)
  boxEnd: env('GHAR_BOX_END', '2026-11-06'), // last drop
  chitthiEnd: env('GHAR_CHITTHI_END', '2026-11-16'),
  dropHour: Number(env('GHAR_DROP_HOUR', 18)),
});

const DAY = 24 * 3600 * 1000;
const IST = 5.5 * 3600 * 1000;
const now = () => (process.env.NODE_ENV === 'test' && process.env.GHAR_NOW ? new Date(process.env.GHAR_NOW) : new Date());
/** UTC instant of `hour`:00 IST on an IST calendar date 'YYYY-MM-DD'. */
const istAt = (date, hour) => new Date(Date.parse(`${date}T00:00:00Z`) + hour * 3600 * 1000 - IST);
const endOfIstDay = (date) => new Date(istAt(date, 24).getTime() - 1);

function schedule(at = now()) {
  const c = CFG();
  const first = istAt(c.start, c.dropHour);
  const totalDrops = Math.round((Date.parse(c.boxEnd) - Date.parse(c.start)) / DAY) + 1;
  const perDrop = Math.ceil(c.boxTotal / totalDrops);
  const opened = at < first ? 0 : Math.min(totalDrops, Math.floor((at - first) / DAY) + 1);
  const nextDropAt = opened < totalDrops ? new Date(first.getTime() + opened * DAY) : null;
  return {
    ...c,
    perDrop,
    totalDrops,
    opened,
    allowance: Math.min(c.boxTotal, perDrop * opened),
    nextDropAt,
    boxClosed: at > endOfIstDay(c.boxEnd),
    chitthiOpen: at <= endOfIstDay(c.chitthiEnd),
  };
}

const live = { status: { $ne: 'rejected' } };
const count = (type) => GharClaim.countDocuments({ type, ...live });

const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const PHONE = /^[6-9]\d{9}$/;
const PIN = /^[1-9]\d{5}$/;
const BIHAR_JH_PIN = /^8[0-5]/; // Bihar 80-85 (Jharkhand 81-83 sits inside this range)
const REASONS = ['ticket', 'flight', 'leave', 'exams', 'abroad', 'other'];
const addrOf = (a = {}) => ({
  street: clean(a.street, 200),
  city: clean(a.city, 80),
  state: clean(a.state, 60),
  pincode: clean(a.pincode, 6),
});
const addrKey = (a) => `${a.pincode}:${a.street.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
const firstName = (n = '') => n.split(' ')[0];

const fail = (res, status, code, message) => res.status(status).json({ code, message });

router.get('/status', async (req, res) => {
  try {
    const s = schedule();
    const [boxes, letters] = await Promise.all([count('box'), count('chitthi')]);
    const shownBoxes = await GharClaim.find({ type: 'box', shareStory: true, status: { $in: ['approved', 'shipped', 'delivered'] } })
      .sort({ createdAt: -1 })
      .limit(24);
    const shownLetters = await GharClaim.find({ type: 'chitthi', status: 'approved' }).sort({ createdAt: -1 }).limit(60);
    res.json({
      box: {
        total: s.boxTotal,
        claimed: boxes,
        leftTotal: Math.max(0, s.boxTotal - boxes),
        leftNow: s.boxClosed ? 0 : Math.max(0, s.allowance - boxes),
        perDrop: s.perDrop,
        started: s.opened > 0,
        closed: s.boxClosed || boxes >= s.boxTotal,
        nextDropAt: s.boxClosed ? null : s.nextDropAt,
        startsAt: istAt(s.start, s.dropHour),
        lastDay: s.boxEnd,
      },
      chitthi: { written: letters, open: s.chitthiOpen },
      stories: shownBoxes.filter((c) => c.story).map((c) => ({ name: firstName(c.name), city: c.city, reason: c.reason, story: c.story })),
      letters: shownLetters.map((c) => ({
        id: c.refCode, name: firstName(c.name), city: c.city, reason: c.reason, message: c.message, videoLink: c.videoLink,
      })),
    });
  } catch (e) {
    console.error('ghar status', e);
    res.status(500).json({ message: 'Could not load the campaign status' });
  }
});

router.get('/mine', protect, async (req, res) => {
  const mine = await GharClaim.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(mine.map((c) => ({ type: c.type, status: c.status, refCode: c.refCode, createdAt: c.createdAt })));
});

router.post('/claim', protect, async (req, res) => {
  try {
    const b = req.body || {};
    const s = schedule();
    const name = clean(b.name, 80);
    const phone = clean(b.phone, 10).replace(/\D/g, '');
    if (name.length < 2) return fail(res, 400, 'NAME', 'Please tell us your name');
    if (!PHONE.test(phone)) return fail(res, 400, 'PHONE', 'Please enter a valid 10-digit mobile number');
    if (s.opened === 0) return fail(res, 409, 'NOT_STARTED', 'Boxes open with the first sunset drop on 19 Oct at 6 pm');
    if (s.boxClosed) return fail(res, 409, 'CLOSED', 'All boxes for this Chhath have been sent. Thank you!');
    const a = addrOf(b.address);
    if (!a.street || !a.city || !PIN.test(a.pincode)) {
      return fail(res, 400, 'ADDRESS', 'Please enter the full address with a 6-digit PIN code');
    }
    if (BIHAR_JH_PIN.test(a.pincode)) {
      return fail(res, 400, 'HOME_PIN', 'These boxes are for people away from Bihar and Jharkhand. You can still write a chitthi to home below.');
    }
    const claimed = await count('box');
    if (claimed >= s.boxTotal) return fail(res, 409, 'CLOSED', 'All boxes for this Chhath have been sent. Thank you!');
    if (claimed >= s.allowance) return fail(res, 409, 'DROP_EMPTY', "Today's boxes are gone. The next ones open at 6 pm.");

    const claim = await GharClaim.create({
      type: 'box',
      user: req.user._id,
      name,
      phone,
      city: clean(b.city, 80) || a.city,
      reason: REASONS.includes(b.reason) ? b.reason : 'other',
      story: clean(b.story, 280),
      shareStory: b.shareStory === true,
      nominatedBy: clean(b.nominatedBy, 12).toUpperCase() || undefined,
      refCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
      address: a,
      userKey: `box:${req.user._id}`,
      phoneKey: `box:${phone}`,
      addressKey: `box:${addrKey(a)}`,
    });
    res.status(201).json({ type: 'box', refCode: claim.refCode, status: claim.status });
  } catch (e) {
    if (e && (e.code === 11000 || /duplicate/i.test(e.message || ''))) {
      return fail(res, 409, 'ALREADY', 'You have already claimed a box. One per person, so more people can feel at home.');
    }
    console.error('ghar claim', e);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

const VIDEO = /^https:\/\/(www\.)?(instagram\.com|youtube\.com|youtu\.be|m\.youtube\.com|facebook\.com|fb\.watch|drive\.google\.com)\/\S+$/i;
router.post('/chitthi', async (req, res) => {
  try {
    const b = req.body || {};
    if (!schedule().chitthiOpen) return fail(res, 409, 'CLOSED', 'The letter wall is closed for this Chhath. Thank you!');
    if (typeof b.website === 'string' && b.website) return res.status(201).json({ type: 'chitthi' }); // bots fill hidden fields
    const name = clean(b.name, 80);
    const message = typeof b.message === 'string' ? b.message.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1200) : '';
    const videoLink = clean(b.videoLink, 300);
    if (name.length < 2) return fail(res, 400, 'NAME', 'Apna naam likhiye');
    if (videoLink && !VIDEO.test(videoLink)) return fail(res, 400, 'LINK', 'Instagram, YouTube, Facebook ya Google Drive ka link daaliye');
    if (message.length < 10 && !videoLink) return fail(res, 400, 'MESSAGE', 'Chitthi thodi lambi likhiye, ya apne video ka link daaliye');
    const ref = crypto.randomBytes(6).toString('hex').toUpperCase();
    const claim = await GharClaim.create({
      type: 'chitthi',
      user: req.user?._id,
      name,
      city: clean(b.city, 80),
      reason: REASONS.includes(b.reason) ? b.reason : 'other',
      message,
      videoLink: videoLink || undefined,
      shareStory: true,
      refCode: ref,
      userKey: `chitthi:${ref}`,
      phoneKey: `chitthi:${ref}`,
    });
    res.status(201).json({ type: 'chitthi', refCode: claim.refCode, status: claim.status });
  } catch (e) {
    console.error('ghar chitthi', e);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ---- admin ----
router.get('/claims', protect, admin, async (req, res) => {
  const q = {};
  if (['box', 'chitthi'].includes(req.query.type)) q.type = req.query.type;
  if (['pending', 'approved', 'shipped', 'delivered', 'rejected'].includes(req.query.status)) q.status = req.query.status;
  const rows = await GharClaim.find(q).sort({ createdAt: -1 }).limit(1000);
  res.json(rows);
});

const csvCell = (v) => {
  const s = v === undefined || v === null ? '' : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // no spreadsheet formulas
  return `"${safe.replace(/"/g, '""')}"`;
};
router.get('/claims.csv', protect, admin, async (req, res) => {
  const rows = await GharClaim.find(['box', 'chitthi'].includes(req.query.type) ? { type: req.query.type } : {}).sort({ createdAt: 1 });
  const head = ['date', 'type', 'status', 'name', 'phone', 'city', 'reason', 'story', 'street', 'address_city', 'state', 'pincode', 'letter', 'video', 'ref'];
  const lines = rows.map((c) => {
    const a = c.address || {};
    return [c.createdAt?.toISOString?.() || c.createdAt, c.type, c.status, c.name, c.phone, c.city, c.reason, c.story,
      a.street, a.city, a.state, a.pincode, c.message, c.videoLink, c.refCode].map(csvCell).join(',');
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ghar-claims.csv"');
  res.send([head.join(','), ...lines].join('\n'));
});

router.put('/claims/:id', protect, admin, async (req, res) => {
  const claim = await GharClaim.findById(req.params.id);
  if (!claim) return res.status(404).json({ message: 'Not found' });
  if (['pending', 'approved', 'shipped', 'delivered', 'rejected'].includes(req.body?.status)) claim.status = req.body.status;
  if (typeof req.body?.adminNote === 'string') claim.adminNote = clean(req.body.adminNote, 300);
  if (typeof req.body?.shareStory === 'boolean') claim.shareStory = req.body.shareStory;
  await claim.save();
  res.json(claim);
});

module.exports = router;
module.exports.schedule = schedule;

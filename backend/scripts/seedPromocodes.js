/**
 * Create the starter promocodes, or bring an existing one's terms up to date. Safe to re-run.
 * Runs with the "seed-products" workflow action.
 *
 *   FIRST  free delivery on an order of ₹399 or more (site-wide free delivery starts at ₹500), once per customer, until 16 Nov 2026
 */
const db = require('../db');
const Promocode = require('../models/Promocode');
const User = require('../models/User');

const CODES = [
  {
    code: 'FIRST',
    name: 'First order: free delivery',
    description: 'Free delivery on your first order from ₹399. Once per customer.',
    type: 'freeShipping',
    value: 0,
    applicableOn: 'all',
    minOrderValue: 399,
    userUsageLimit: 1,
    isActive: true,
    startDate: new Date('2026-10-22T00:00:00+05:30'),
    endDate: new Date('2026-11-16T23:59:59+05:30'),
  },
];

(async () => {
  await db.connect();
  try {
    const owner = (await User.findOne({ role: 'admin' })) || (await User.findOne({}));
    if (!owner) throw new Error('No user exists yet to own the promocodes; register an account first.');
    for (const c of CODES) {
      const existing = await Promocode.findOne({ code: c.code });
      if (existing) {
        // keep usage counts; refresh the terms
        for (const k of ['name', 'description', 'minOrderValue', 'userUsageLimit', 'endDate']) existing[k] = c[k];
        await existing.save();
        console.log(`::notice::Promocode ${c.code} updated (min ₹${c.minOrderValue}).`);
        continue;
      }
      await Promocode.create({ ...c, createdBy: owner._id });
      console.log(`Promocode ${c.code} created.`);
    }
  } finally {
    await db.disconnect();
  }
})().catch((e) => { console.error(e); process.exit(1); });

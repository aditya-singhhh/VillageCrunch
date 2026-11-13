const express = require('express');
const router = express.Router();

// PIN code -> city (district) and state, from India Post's public PIN directory.
// Results are cached in memory; failures just return 404 so the form stays manual.
const cache = new Map();
const STATE_FIX = { 'Delhi': 'Delhi', 'Chattisgarh': 'Chhattisgarh' };

let lookup = async (pin) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: ctrl.signal });
    const data = await r.json();
    const offices = data?.[0]?.Status === 'Success' ? data[0].PostOffice || [] : [];
    if (!offices.length) return null;
    const o = offices[0];
    return {
      pincode: pin,
      city: o.District,
      state: STATE_FIX[o.State] || o.State,
      areas: [...new Set(offices.map((x) => x.Name))].slice(0, 12),
    };
  } finally {
    clearTimeout(t);
  }
};
router.__setLookup = (fn) => { lookup = fn; cache.clear(); }; // tests only

router.get('/:pin', async (req, res) => {
  const pin = String(req.params.pin || '');
  if (!/^[1-9]\d{5}$/.test(pin)) return res.status(400).json({ message: 'Enter a valid 6-digit PIN code' });
  try {
    if (!cache.has(pin)) cache.set(pin, await lookup(pin));
    const hit = cache.get(pin);
    if (!hit) { cache.delete(pin); return res.status(404).json({ message: 'PIN code not found' }); }
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(hit);
  } catch (e) {
    res.status(404).json({ message: 'PIN code lookup unavailable' });
  }
});

// Delivery estimate for a PIN: Delhivery serviceability + expected transit days (surface).
// days = [earliest, latest] from today, counting 1-2 days to make and hand over the order.
const etaCache = new Map();
const ETA_TTL = 12 * 3600 * 1000;
let etaFor = (pin) => require('../services/delhivery').eta(pin);
router.__setEta = (fn) => { etaFor = fn; etaCache.clear(); }; // tests only

router.get('/:pin/eta', async (req, res) => {
  const pin = String(req.params.pin || '');
  if (!/^[1-9]\d{5}$/.test(pin)) return res.status(400).json({ message: 'Enter a valid 6-digit PIN code' });
  const hit = etaCache.get(pin);
  if (hit && Date.now() - hit.at < ETA_TTL) return res.json(hit.body);
  try {
    const r = await etaFor(pin);
    const body = !r ? { source: 'estimate' }
      : !r.served ? { source: 'delhivery', served: false }
      : r.tat ? { source: 'delhivery', served: true, cod: r.cod, tat: r.tat, days: [r.tat + 1, r.tat + 3] }
      : { source: 'estimate', served: true, cod: r.cod };
    etaCache.set(pin, { at: Date.now(), body });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(body);
  } catch (e) {
    res.json({ source: 'estimate' });
  }
});

module.exports = router;

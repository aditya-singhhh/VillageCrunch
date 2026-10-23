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

module.exports = router;

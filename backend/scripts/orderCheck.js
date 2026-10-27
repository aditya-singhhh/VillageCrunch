/**
 * Prints recent orders and paid-but-unfinished payments WITHOUT personal data
 * (repo logs are public). Run with the "order-check" workflow action.
 */
const db = require('../db');
const Order = require('../models/Order');
const LiveOrder = require('../models/LiveOrder');
const Lead = require('../models/Lead');
const GharClaim = require('../models/GharClaim');
const crypto = require('crypto');

(async () => {
  await db.connect();
  try {
    const since = Date.now() - 3 * 24 * 3600 * 1000;
    const orders = (await Order.find({})).filter((o) => new Date(o.createdAt).getTime() > since)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const lines = orders.map((o) => `${new Date(o.createdAt).toISOString()} · #${String(o.orderNumber || o._id).slice(-6)} · ₹${o.totalPrice ?? o.total ?? '?'} · ${o.paymentInfo?.method || '?'} · paid=${!!o.isPaid} · ${o.status}`);
    console.log(`::notice title=Orders (last 3 days): ${orders.length}::${lines.join('%0A') || 'none'}`);
    const live = (await LiveOrder.find({})).filter((l) => new Date(l.createdAt || l.paidAt || 0).getTime() > since);
    const ll = live.map((l) => `${new Date(l.createdAt || 0).toISOString()} · ₹${l.amount / (l.amount > 10000 ? 100 : 1)} · ${l.status}`);
    console.log(`::notice title=Payment sessions (last 3 days): ${live.length}::${ll.join('%0A') || 'none'}`);
    // Checkout / pop-up leads: counts only in the clear; details only encrypted (logs are public)
    const leads = (await Lead.find({})).filter((l) => new Date(l.lastSeenAt || l.createdAt || 0).getTime() > Date.now() - 7 * 24 * 3600 * 1000);
    const lt = leads.map((l) => `${new Date(l.lastSeenAt || l.createdAt || 0).toISOString()} · ${l.source || 'web'} · ${l.status} · ₹${l.total || 0}`);
    console.log(`::notice title=Leads (last 7 days): ${leads.length}::${lt.join('%0A') || 'none'}`);
    // Chhath "Ghar" campaign: counts only (no names/phones/addresses)
    const claims = await GharClaim.find({});
    const by = (type) => claims.filter((c) => c.type === type);
    const summary = (arr) => ['pending', 'approved', 'shipped', 'delivered', 'rejected'].map((st) => `${st}: ${arr.filter((c) => c.status === st).length}`).join(', ');
    const boxes = by('box');
    const cities = {};
    boxes.forEach((c) => { const k = (c.city || c.address?.city || '?').trim().toLowerCase(); cities[k] = (cities[k] || 0) + 1; });
    const days = {};
    claims.forEach((c) => { const d = new Date(c.createdAt || 0).toISOString().slice(0, 10); days[d] = (days[d] || 0) + 1; });
    console.log(`::notice title=Ghar boxes: ${boxes.length}::${summary(boxes)}%0ACities: ${Object.entries(cities).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
    console.log(`::notice title=Ghar letters (chitthi): ${by('chitthi').length}::${summary(by('chitthi'))}%0ABy day (all): ${Object.entries(days).sort().map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}`);

    if (process.env.LEADS_PUBKEY && leads.length) {
      const pub = crypto.createPublicKey({ key: Buffer.from(process.env.LEADS_PUBKEY, 'base64'), format: 'der', type: 'spki' });
      const key = crypto.randomBytes(32); const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv('aes-256-gcm', key, iv);
      const data = JSON.stringify(leads.map((l) => ({ phone: l.phone, name: l.name, source: l.source, status: l.status, total: l.total, items: (l.items || []).map((i) => `${i.name} x${i.quantity}`), at: l.lastSeenAt || l.createdAt })));
      const enc = Buffer.concat([c.update(data, 'utf8'), c.final()]);
      const ek = crypto.publicEncrypt({ key: pub, oaepHash: 'sha256' }, key);
      console.log('LEADS_ENC:' + [ek, iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.'));
    }
  } finally {
    await db.disconnect();
  }
})().catch((e) => { console.error(e); process.exit(1); });

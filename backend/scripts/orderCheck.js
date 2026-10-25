/**
 * Prints recent orders and paid-but-unfinished payments WITHOUT personal data
 * (repo logs are public). Run with the "order-check" workflow action.
 */
const db = require('../db');
const Order = require('../models/Order');
const LiveOrder = require('../models/LiveOrder');

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
  } finally {
    await db.disconnect();
  }
})().catch((e) => { console.error(e); process.exit(1); });

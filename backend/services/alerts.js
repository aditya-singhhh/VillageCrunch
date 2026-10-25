/**
 * Instant phone alerts for new orders via ntfy (free app, no account needed).
 * The topic name is random, generated once and stored in Settings (never in the repo).
 * Messages carry no phone numbers or addresses.
 */
const crypto = require('crypto');
const Settings = require('../models/Settings');

let cachedTopic = null;
async function getTopic() {
  if (cachedTopic) return cachedTopic;
  const s = await Settings.getSettings();
  let topic = s.alerts?.ntfyTopic;
  if (!topic) {
    topic = `vc-orders-${crypto.randomBytes(9).toString('hex')}`;
    s.alerts = { ...(s.toObject().alerts || {}), ntfyTopic: topic };
    await s.save();
  }
  cachedTopic = topic;
  return topic;
}

let sender = async (url, opts) => fetch(url, opts);

async function push(title, body, { tags = 'shopping_cart', priority = 'high', click } = {}) {
  if (process.env.NODE_ENV === 'test' && !process.env.ALERTS_IN_TEST) return false;
  try {
    const topic = await getTopic();
    const headers = { Title: title.replace(/[^\x20-\x7E]/g, '') || 'VillageCrunch', Tags: tags, Priority: priority };
    if (click) headers.Click = click;
    const res = await sender(`https://ntfy.sh/${topic}`, { method: 'POST', headers, body: Buffer.from(body, 'utf8') });
    return res.ok;
  } catch (e) {
    console.error('order alert failed:', e.message);
    return false;
  }
}

const rupees = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

async function newOrderAlert(order) {
  const method = order.paymentInfo?.method === 'cod' ? 'COD' : 'Paid online';
  const items = (order.items || []).map((i) => `${i.name} x${i.quantity}`).join(', ');
  const city = order.shippingAddress?.city ? ` · ${order.shippingAddress.city}` : '';
  return push(
    `New order ${rupees(order.totalPrice)} - ${method}`,
    `₹${Math.round(order.totalPrice)} · ${method}${city}\n${items}\nOrder #${order.orderNumber}`,
    { tags: order.paymentInfo?.method === 'cod' ? 'package' : 'moneybag', click: `${process.env.SITE_URL || 'https://villagecrunch.in'}/admin` }
  );
}

module.exports = { getTopic, push, newOrderAlert, __setSender: (fn) => { sender = fn; cachedTopic = null; } };

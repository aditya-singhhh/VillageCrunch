/**
 * Meta Conversions API: tell Meta about every real sale from the server, so ad delivery
 * learns from purchases even when the buyer never comes back to the site (in-app browsers,
 * webhook / admin-created orders).
 *
 * - Customer details are SHA-256 hashed before sending (Meta's requirement).
 * - event_id = "order_<orderId>", the same id the browser pixel uses, so Meta counts a sale once.
 * - Each order is sent at most once (order.tracking.metaSentAt).
 * - Never throws: tracking must not affect orders.
 */
const crypto = require('crypto');
const Settings = require('../models/Settings');
const Order = require('../models/Order');

const DEFAULT_PIXEL = '2110816376318504';
const GRAPH = 'https://graph.facebook.com/v22.0';

let sender = async (url, opts) => fetch(url, opts);

const sha = (v) => (v ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex') : undefined);
const digits = (v) => String(v || '').replace(/\D/g, '');
const phoneE164 = (p) => { const d = digits(p); if (d.length === 10) return `91${d}`; if (d.length === 12 && d.startsWith('91')) return d; return d || undefined; };
const plain = (v) => String(v || '').toLowerCase().replace(/[^a-z]/g, '') || undefined;

async function getConfig() {
  const s = await Settings.getSettings();
  const c = (s.toObject ? s.toObject() : s).metaCapi || {};
  const token = process.env.META_CAPI_TOKEN || c.token;
  const pixelId = process.env.META_PIXEL_ID || c.pixelId || DEFAULT_PIXEL;
  return { token, pixelId };
}

const eventIdFor = (order) => `order_${order._id}`;

function buildEvent(order, user = {}) {
  const a = order.shippingAddress || {};
  const t = order.tracking || {};
  const [fn, ...rest] = String(a.name || user.name || '').trim().split(/\s+/);
  const ud = {
    ph: [sha(phoneE164(a.phone || user.phone))].filter(Boolean),
    em: user.email && !/@guest\./i.test(user.email) ? [sha(user.email)] : undefined,
    fn: fn ? [sha(plain(fn))] : undefined,
    ln: rest.length ? [sha(plain(rest[rest.length - 1]))] : undefined,
    ct: a.city ? [sha(plain(a.city))] : undefined,
    st: a.state ? [sha(plain(a.state))] : undefined,
    zp: a.pincode ? [sha(digits(a.pincode))] : undefined,
    country: [sha('in')],
    external_id: order.user ? [sha(String(order.user._id || order.user))] : undefined,
    fbp: t.fbp || undefined,
    fbc: t.fbc || undefined,
    client_ip_address: t.ip || undefined,
    client_user_agent: t.ua || undefined,
  };
  Object.keys(ud).forEach((k) => ud[k] === undefined && delete ud[k]);
  return {
    event_name: 'Purchase',
    event_time: Math.floor(new Date(order.createdAt || Date.now()).getTime() / 1000),
    event_id: eventIdFor(order),
    action_source: 'website',
    event_source_url: `${process.env.SITE_URL || 'https://villagecrunch.in'}/checkout`,
    user_data: ud,
    custom_data: {
      currency: 'INR',
      value: Number(order.totalPrice) || 0,
      order_id: String(order.orderNumber || order._id),
      content_type: 'product',
      content_ids: (order.items || []).map((i) => String(i.product?._id || i.product)),
      num_items: (order.items || []).reduce((n, i) => n + (Number(i.quantity) || 0), 0),
    },
  };
}

/** Send one order's Purchase to Meta. Returns { ok, skipped?, error? }. */
async function sendPurchase(order, user = {}) {
  try {
    if (!order) return { ok: false, skipped: 'no order' };
    if (process.env.NODE_ENV === 'test' && !process.env.META_IN_TEST) return { ok: false, skipped: 'test' };
    if (order.tracking?.metaSentAt) return { ok: true, skipped: 'already sent' };
    if (order.isTest) return { ok: false, skipped: 'test order' };
    const ageDays = (Date.now() - new Date(order.createdAt || Date.now()).getTime()) / 86400000;
    if (ageDays > 7) return { ok: false, skipped: 'older than 7 days' };
    const { token, pixelId } = await getConfig();
    if (!token) return { ok: false, skipped: 'not configured' };

    const body = { data: [buildEvent(order, user)] };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
    const res = await sender(`${GRAPH}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Meta CAPI error:', res.status, text.slice(0, 300));
      return { ok: false, error: `Meta returned ${res.status}` };
    }
    await Order.updateOne({ _id: order._id }, { $set: { 'tracking.metaSentAt': new Date() } });
    return { ok: true };
  } catch (e) {
    console.error('Meta CAPI failed:', e.message);
    return { ok: false, error: e.message };
  }
}

/** Send recent orders Meta has not heard about yet (e.g. after the token is first added). */
async function backfill({ days = 7 } = {}) {
  const since = Date.now() - days * 86400000;
  const all = await Order.find({});
  const todo = all.filter((o) => new Date(o.createdAt || 0).getTime() > since
    && !o.tracking?.metaSentAt
    && o.status !== 'cancelled'
    && (o.isPaid || o.paymentInfo?.method === 'cod'));
  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const o of todo) {
    const r = await sendPurchase(o);
    if (r.ok && !r.skipped) result.sent += 1; else if (r.error) result.failed += 1; else result.skipped += 1;
  }
  return result;
}

/** Browser context sent by checkout (Meta cookies) + request ip/ua. */
function trackingFrom(req) {
  const m = req.body?.meta || {};
  const clean = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
  return {
    fbp: /^fb\.\d\.\d+\.\d+$/.test(m.fbp || '') ? m.fbp : undefined,
    fbc: /^fb\.\d\.\d+\.[\w-]+$/.test(m.fbc || '') ? clean(m.fbc) : undefined,
    ip: clean(req.ip, 64),
    ua: clean(req.get?.('user-agent'), 400),
  };
}

module.exports = {
  sendPurchase, backfill, buildEvent, trackingFrom, getConfig, eventIdFor,
  __setSender: (fn) => { sender = fn; },
};

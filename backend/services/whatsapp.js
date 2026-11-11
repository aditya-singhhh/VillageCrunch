/**
 * Automatic WhatsApp order updates through Meta's WhatsApp Cloud API.
 *
 * Three moments, each sent at most once per order (order.notified.*):
 *   placed    - order received (online paid or cash on delivery)
 *   shipped   - courier booked / status set to shipped, with tracking link
 *   delivered - status set to delivered, asks for a photo or review
 *
 * Messages use pre-approved "utility" templates (see TEMPLATES). Set up from Admin:
 * phone number id + WhatsApp Business account id + permanent token (write-only).
 * Never throws: notifications must not affect orders.
 */
const Settings = require('../models/Settings');

const GRAPH = 'https://graph.facebook.com/v22.0';
let sender = async (url, opts) => fetch(url, opts);
const __setSender = (fn) => { sender = fn; };

const SITE = process.env.SITE_URL || 'https://villagecrunch.in';

/** Template texts (Hinglish, language "en"). {{n}} are filled per order. */
const TEMPLATES = {
  placed: {
    name: 'vc_order_placed',
    text: 'Namaste {{1}} 🙏\n\nAapka VillageCrunch order #{{2}} (₹{{3}}) humein mil gaya hai. Aapka thekua order ke baad taaza banega aur 1–2 din mein dispatch hoga. Dispatch hote hi tracking link isi chat par bhej denge.\n\nKoi sawaal ho toh WhatsApp karein: {{4}}\n\n– Team VillageCrunch',
    example: ['Asha', 'ORD12345678901', '399', '+91 90000 00000'],
  },
  shipped: {
    name: 'vc_order_shipped',
    text: 'Namaste {{1}} 🙏\n\nAapka order #{{2}} dispatch ho gaya hai 📦\nCourier: {{3}}\nTrack karein: {{4}}\n\nPahunchne mein lagbhag 3–7 din lagenge. Koi sawaal ho toh WhatsApp karein: {{5}}\n\n– Team VillageCrunch',
    example: ['Asha', 'ORD12345678901', 'Delhivery', 'https://shiprocket.co/tracking/12345', '+91 90000 00000'],
  },
  delivered: {
    name: 'vc_order_delivered',
    text: 'Namaste {{1}} 🙏\n\nAapka order #{{2}} deliver ho gaya hai. Ummeed hai thekua pasand aayega!\n\nEk photo ya do line ka review bhejiye, humein bahut khushi hogi: {{3}}\n\n– Team VillageCrunch',
    example: ['Asha', 'ORD12345678901', '+91 90000 00000'],
  },
};

async function getConfig() {
  const s = await Settings.getSettings();
  const o = s.toObject ? s.toObject() : s;
  const c = o.whatsapp || {};
  return {
    token: process.env.WHATSAPP_TOKEN || c.token,
    phoneNumberId: c.phoneNumberId,
    wabaId: c.wabaId,
    enabled: c.enabled !== false,
    supportPhone: c.supportPhone || o.business?.phone || '',
  };
}

const digits = (v) => String(v || '').replace(/\D/g, '');
const toE164 = (p) => { const d = digits(p); if (d.length === 10) return `91${d}`; if (d.length === 12 && d.startsWith('91')) return d; return null; };
// Template parameters may not contain new lines, tabs or 4+ spaces
const clean = (v, max = 200) => String(v ?? '').replace(/[\n\t]+/g, ' ').replace(/ {4,}/g, ' ').trim().slice(0, max) || '-';
const firstName = (n) => clean(String(n || '').trim().split(/\s+/)[0] || 'ji', 40);
const prettyPhone = (p) => { const d = digits(p).slice(-10); return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : clean(p); };

const INDIA_POST = /^[A-Z]{2}\d{9}IN$/i;
/** Courier name and tracking link (or number) for a shipped order, or null if none yet. */
function trackingFor(order) {
  if (order.delhivery?.awb) {
    return { courier: 'Delhivery', link: `https://www.delhivery.com/track-v2/package/${encodeURIComponent(order.delhivery.awb)}` };
  }
  if (order.shiprocket?.awb) {
    return { courier: order.shiprocket.courier || 'Courier', link: `https://shiprocket.co/tracking/${encodeURIComponent(order.shiprocket.awb)}` };
  }
  const n = String(order.trackingNumber || '').trim();
  if (!n) return null;
  if (INDIA_POST.test(n)) return { courier: 'India Post (Speed Post)', link: `${n.toUpperCase()} on indiapost.gov.in` };
  return { courier: 'Courier', link: `Tracking no. ${n}` };
}

function paramsFor(event, order, cfg) {
  const a = order.shippingAddress || {};
  const support = prettyPhone(cfg.supportPhone) || SITE;
  if (event === 'placed') return [firstName(a.name), order.orderNumber, String(Math.round(order.totalPrice || 0)), support];
  if (event === 'shipped') {
    const t = trackingFor(order);
    return [firstName(a.name), order.orderNumber, clean(t.courier, 60), clean(t.link, 300), support];
  }
  if (event === 'delivered') return [firstName(a.name), order.orderNumber, support];
  return null;
}

async function sendTemplate(cfg, to, tpl, params) {
  const res = await sender(`${GRAPH}/${cfg.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: tpl.name, language: { code: 'en' }, components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: clean(text, 300) })) }] },
    }),
  });
  let body = {};
  try { body = await res.json(); } catch (_) { /* empty */ }
  if (!res.ok) throw new Error(body?.error?.message || `WhatsApp error ${res.status}`);
  return body?.messages?.[0]?.id || 'sent';
}

/**
 * Send the update for `event` once. Returns 'sent' | 'skipped:<why>' | 'failed:<msg>'.
 * Saves order.notified[event] so the same update never goes twice.
 */
async function notify(order, event) {
  try {
    if (process.env.NODE_ENV === 'test' && !process.env.WHATSAPP_IN_TEST) return 'skipped:test';
    const tpl = TEMPLATES[event];
    if (!tpl || !order) return 'skipped:unknown';
    if (order.isTest) return 'skipped:test-order';
    if (order.notified?.[event]) return 'skipped:already';
    if (event === 'shipped' && !trackingFor(order)) return 'skipped:no-tracking';
    const cfg = await getConfig();
    if (!cfg.token || !cfg.phoneNumberId || !cfg.enabled) return 'skipped:not-set-up';
    const to = toE164(order.shippingAddress?.phone);
    if (!to) return 'skipped:no-phone';
    await sendTemplate(cfg, to, tpl, paramsFor(event, order, cfg));
    order.notified = { ...(order.notified?.toObject ? order.notified.toObject() : order.notified || {}), [event]: new Date() };
    await order.save();
    return 'sent';
  } catch (e) {
    console.error(`WhatsApp ${event} update failed:`, e.message);
    try { require('./alerts').push('WhatsApp update failed', `Order #${order?.orderNumber}: ${event} message not sent (${e.message}). Message the customer yourself.`, { tags: 'warning', priority: 'default' }).catch(() => {}); } catch (_) { /* optional */ }
    return `failed:${e.message}`;
  }
}

/** Which update a status change should trigger. */
const eventForStatus = (status) => ({ shipped: 'shipped', delivered: 'delivered' }[status] || null);

/** Create the three message templates in the WhatsApp Business account (admin, one time). */
async function createTemplates() {
  const cfg = await getConfig();
  if (!cfg.token || !cfg.wabaId) throw new Error('Save the WhatsApp Business account ID and token first');
  const results = {};
  for (const [event, t] of Object.entries(TEMPLATES)) {
    const res = await sender(`${GRAPH}/${cfg.wabaId}/message_templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({
        name: t.name, language: 'en', category: 'UTILITY',
        components: [{ type: 'BODY', text: t.text, example: { body_text: [t.example] } }],
      }),
    });
    let body = {};
    try { body = await res.json(); } catch (_) { /* empty */ }
    results[event] = res.ok ? (body.status || 'PENDING') : (/already exists/i.test(body?.error?.error_user_msg || body?.error?.message || '') ? 'EXISTS' : `ERROR: ${body?.error?.error_user_msg || body?.error?.message || res.status}`);
  }
  return results;
}

/** Template approval status, as Meta reports it. */
async function templateStatus() {
  const cfg = await getConfig();
  if (!cfg.token || !cfg.wabaId) return {};
  const res = await sender(`${GRAPH}/${cfg.wabaId}/message_templates?fields=name,status&limit=50`, { headers: { Authorization: `Bearer ${cfg.token}` } });
  let body = {};
  try { body = await res.json(); } catch (_) { /* empty */ }
  const byName = Object.fromEntries((body.data || []).map((t) => [t.name, t.status]));
  return Object.fromEntries(Object.entries(TEMPLATES).map(([event, t]) => [event, byName[t.name] || 'MISSING']));
}

/** Send one test message (the "placed" template with sample values) to a number. */
async function sendTest(phone) {
  const cfg = await getConfig();
  if (!cfg.token || !cfg.phoneNumberId) throw new Error('Save the phone number ID and token first');
  const to = toE164(phone);
  if (!to) throw new Error('Enter a 10-digit mobile number');
  return sendTemplate(cfg, to, TEMPLATES.placed, ['Test', 'ORD-TEST', '399', prettyPhone(cfg.supportPhone) || SITE]);
}

module.exports = { TEMPLATES, trackingFor, getConfig, notify, eventForStatus, createTemplates, templateStatus, sendTest, paramsFor, toE164, __setSender };

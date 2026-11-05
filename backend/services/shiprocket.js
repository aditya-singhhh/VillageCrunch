/**
 * Shiprocket courier booking for admin.
 *
 * Flow for one order: list couriers (serviceability) -> book (create order + assign AWB
 * + request pickup + label) -> order is marked shipped with the AWB as tracking number.
 *
 * Credentials are a Shiprocket "API user" (Settings -> API -> Add new API user), saved
 * from the admin page. The password and login token are never returned to the browser.
 */
const Settings = require('../models/Settings');

const BASE = 'https://apiv2.shiprocket.in/v1/external';
const TOKEN_TTL_MS = 8 * 24 * 60 * 60 * 1000; // Shiprocket tokens last 10 days

let sender = async (url, opts) => fetch(url, opts);
const __setSender = (fn) => { sender = fn; };

class ShiprocketError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

async function getConfig() {
  const s = await Settings.getSettings();
  const c = (s.toObject ? s.toObject() : s).shiprocket || {};
  return {
    email: process.env.SHIPROCKET_EMAIL || c.email,
    password: process.env.SHIPROCKET_PASSWORD || c.password,
    pickupLocation: c.pickupLocation || 'Home',
    pickupPincode: c.pickupPincode || '811212',
    token: c.token,
    tokenAt: c.tokenAt,
  };
}

const firstError = (body) => {
  if (!body) return '';
  if (typeof body.message === 'string' && body.message) return body.message;
  if (body.errors && typeof body.errors === 'object') {
    const v = Object.values(body.errors).flat()[0];
    if (v) return String(v);
  }
  return '';
};

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await sender(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* empty body */ }
  return { ok: res.ok, status: res.status, data };
}

async function login(email, password) {
  const r = await call('/auth/login', { method: 'POST', body: { email, password } });
  if (!r.ok || !r.data?.token) {
    throw new ShiprocketError(firstError(r.data) || 'Shiprocket login failed. Check the API user email and password.', 400);
  }
  return r.data.token;
}

/** Cached login token; logs in again when old or when `fresh` is set. */
async function getToken({ fresh = false } = {}) {
  const c = await getConfig();
  if (!c.email || !c.password) throw new ShiprocketError('Shiprocket is not connected yet. Add the API user in Admin first.', 409);
  if (!fresh && c.token && c.tokenAt && Date.now() - new Date(c.tokenAt).getTime() < TOKEN_TTL_MS) return c.token;
  const token = await login(c.email, c.password);
  const s = await Settings.getSettings();
  s.shiprocket = { ...(s.toObject().shiprocket || {}), token, tokenAt: new Date() };
  await s.save();
  return token;
}

/** Authenticated call; retries once with a new token if Shiprocket says it expired. */
async function authed(path, opts = {}) {
  let r = await call(path, { ...opts, token: await getToken() });
  if (r.status === 401) r = await call(path, { ...opts, token: await getToken({ fresh: true }) });
  if (!r.ok) throw new ShiprocketError(firstError(r.data) || `Shiprocket error (${r.status})`, r.status >= 500 ? 502 : 400);
  return r.data;
}

/* ---------- order -> parcel ---------- */

// "400g" / "0.8 kg" / "800 gm" -> kg
const parseKg = (w) => {
  const m = String(w || '').toLowerCase().match(/([\d.]+)\s*(kg|g|gm|gms|gram|grams)?/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  return m[2] === 'kg' ? n : n / 1000;
};

/**
 * Weight (kg, incl. ~100 g packing) and box size (cm) for an order.
 * Couriers bill in 500 g slabs and also by volume (L x B x H / 5000).
 * Current box: 9.5 x 6.5 x 4.5 inch = 24.1 x 16.5 x 11.4 cm (0.91 kg by volume, so the 1 kg slab).
 * A box of 2,500 cm3 or less (e.g. 9 x 6.5 x 2.5 inch) would keep a 400 g order in the 0.5 kg slab.
 * Weigh the packed parcel and edit the weight in admin if it is heavier.
 */
const BOX = { length: 24.1, breadth: 16.5, height: 11.4 };
function parcelFor(order) {
  const contents = (order.items || []).reduce((s, i) => s + parseKg(i.weight) * (Number(i.quantity) || 1), 0);
  const weight = Math.max(0.5, Math.round((contents + 0.1) * 100) / 100);
  return { weight, ...BOX };
}

const isCod = (order) => order.paymentInfo?.method === 'cod';

function istStamp(d) {
  const t = new Date(new Date(d || Date.now()).getTime() + 330 * 60000);
  return t.toISOString().slice(0, 16).replace('T', ' ');
}

function orderPayload(order, cfg, parcel, user = {}) {
  const a = order.shippingAddress || {};
  const [first, ...rest] = String(a.name || user.name || 'Customer').trim().split(/\s+/);
  const phone = String(a.phone || user.phone || '').replace(/\D/g, '').slice(-10);
  return {
    order_id: order.orderNumber,
    order_date: istStamp(order.createdAt),
    pickup_location: cfg.pickupLocation,
    billing_customer_name: first,
    billing_last_name: rest.join(' '),
    billing_address: String(a.street || '').slice(0, 190),
    billing_city: a.city,
    billing_pincode: a.pincode,
    billing_state: a.state,
    billing_country: 'India',
    // phone-only accounts have a placeholder address; never send that to the courier
    billing_email: (user.email && !/@phone\.villagecrunch\.in$/i.test(user.email)) ? user.email : (process.env.SHIPROCKET_FALLBACK_EMAIL || 'orders@villagecrunch.in'),
    billing_phone: phone,
    shipping_is_billing: true,
    order_items: (order.items || []).map((i) => ({
      name: [i.name, i.weight].filter(Boolean).join(' '),
      sku: `${String(i.product).slice(-8)}-${String(i.weight || '').replace(/\s+/g, '')}`,
      units: Number(i.quantity) || 1,
      selling_price: Number(i.price) || 0,
    })),
    payment_method: isCod(order) ? 'COD' : 'Prepaid',
    shipping_charges: Number(order.shippingPrice) || 0,
    total_discount: Number(order.promocodeDiscount) || 0,
    sub_total: Number(order.totalPrice) || 0,
    ...parcel,
  };
}

/* ---------- public API ---------- */

async function couriersFor(order, overrides = {}) {
  const cfg = await getConfig();
  const parcel = { ...parcelFor(order), ...overrides };
  const pin = order.shippingAddress?.pincode;
  if (!/^\d{6}$/.test(String(pin || ''))) throw new ShiprocketError('The order has no valid 6-digit pincode', 400);
  const q = `pickup_postcode=${cfg.pickupPincode}&delivery_postcode=${pin}&weight=${parcel.weight}&cod=${isCod(order) ? 1 : 0}`
    + (isCod(order) ? `&declared_value=${Math.round(order.totalPrice || 0)}` : '');
  const data = await authed(`/courier/serviceability/?${q}`);
  const list = data?.data?.available_courier_companies || [];
  const recommended = data?.data?.recommended_courier_company_id;
  return {
    parcel,
    recommended,
    couriers: list
      .map((c) => ({
        id: c.courier_company_id,
        name: c.courier_name,
        rate: Math.round(Number(c.rate ?? c.freight_charge) || 0),
        days: c.estimated_delivery_days ? Number(c.estimated_delivery_days) : null,
        etd: c.etd || '',
        rating: c.rating != null ? Number(c.rating) : null,
        surface: !!c.is_surface,
        recommended: c.courier_company_id === recommended,
      }))
      .sort((x, y) => x.rate - y.rate),
  };
}

/**
 * Book a courier for the order. Safe to retry: an order already created in Shiprocket
 * is reused, and an order that already has an AWB is returned unchanged.
 */
async function book(order, { courierId, parcel: overrides = {} } = {}, user = {}) {
  if (order.shiprocket?.awb) return order;
  if (order.status === 'cancelled') throw new ShiprocketError('This order is cancelled', 400);
  const cfg = await getConfig();
  const parcel = { ...parcelFor(order), ...overrides };
  order.shiprocket = order.shiprocket || {};

  if (!order.shiprocket.shipmentId) {
    const created = await authed('/orders/create/adhoc', { method: 'POST', body: orderPayload(order, cfg, parcel, user) });
    if (!created?.shipment_id) throw new ShiprocketError(firstError(created) || 'Shiprocket did not create the shipment', 502);
    order.shiprocket = { ...order.shiprocket, orderId: String(created.order_id), shipmentId: String(created.shipment_id) };
    await order.save(); // remember it, so a retry never creates a duplicate
  }

  const sid = order.shiprocket.shipmentId;
  const awb = await authed('/courier/assign/awb', { method: 'POST', body: { shipment_id: sid, ...(courierId ? { courier_id: courierId } : {}) } });
  const d = awb?.response?.data || {};
  if (!d.awb_code) throw new ShiprocketError(firstError(awb) || d.awb_assign_error || 'Courier could not be assigned. Check wallet balance and try another courier.', 400);

  order.shiprocket = {
    ...order.shiprocket,
    awb: String(d.awb_code),
    courier: d.courier_name || '',
    courierId: Number(d.courier_company_id || courierId) || undefined,
    rate: Number(d.applied_weight_amount || d.freight_charges) || undefined,
    bookedAt: new Date(),
  };
  order.trackingNumber = String(d.awb_code);
  if (['pending', 'confirmed', 'processing'].includes(order.status)) order.status = 'shipped';
  await order.save();

  // Pickup and label are best effort: the booking above already holds.
  try {
    await authed('/courier/generate/pickup', { method: 'POST', body: { shipment_id: [sid] } });
    order.shiprocket = { ...order.shiprocket, pickupRequested: true };
  } catch (e) { console.warn('Shiprocket pickup request:', e.message); }
  try {
    const l = await authed('/courier/generate/label', { method: 'POST', body: { shipment_id: [sid] } });
    if (l?.label_url) order.shiprocket = { ...order.shiprocket, labelUrl: l.label_url };
  } catch (e) { console.warn('Shiprocket label:', e.message); }
  await order.save();
  return order;
}

async function label(order) {
  if (order.shiprocket?.labelUrl) return order.shiprocket.labelUrl;
  if (!order.shiprocket?.shipmentId) throw new ShiprocketError('Book a courier first', 400);
  const l = await authed('/courier/generate/label', { method: 'POST', body: { shipment_id: [order.shiprocket.shipmentId] } });
  if (!l?.label_url) throw new ShiprocketError(firstError(l) || 'Label not ready yet, try again in a minute', 400);
  order.shiprocket = { ...order.shiprocket, labelUrl: l.label_url };
  await order.save();
  return l.label_url;
}

const trackingUrl = (awb) => (awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : '');

module.exports = { getConfig, getToken, login, couriersFor, book, label, parcelFor, parseKg, orderPayload, trackingUrl, ShiprocketError, __setSender };

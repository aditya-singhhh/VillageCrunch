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
 * - Up to 0.5 kg (one 400 g pack): box cut down to 9.5 x 6.5 inch x 6 cm high
 *   = 24.1 x 16.5 x 6 cm = 0.48 kg by volume, so it stays in the 0.5 kg slab.
 * - Heavier (800 g, or 2+ packs): full box 9.5 x 6.5 x 4.5 inch = 24.1 x 16.5 x 11.4 cm (0.91 kg).
 * Weigh the packed parcel and edit the weight in admin if it is heavier.
 */
const SMALL_BOX = { length: 24.1, breadth: 16.5, height: 6 };
const BIG_BOX = { length: 24.1, breadth: 16.5, height: 11.4 };
function parcelFor(order) {
  const contents = (order.items || []).reduce((s, i) => s + parseKg(i.weight) * (Number(i.quantity) || 1), 0);
  const weight = Math.max(0.5, Math.round((contents + 0.1) * 100) / 100);
  return { weight, ...(weight <= 0.5 ? SMALL_BOX : BIG_BOX) };
}

const isCod = (order) => order.paymentInfo?.method === 'cod';

function istStamp(d) {
  const t = new Date(new Date(d || Date.now()).getTime() + 330 * 60000);
  return t.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Shiprocket works out the order value (and the cash to collect on COD) as
 *   sub_total (= sum of item prices) - total_discount + shipping_charges.
 * Items carry the MRP, so the discount and any COD fee/shipping go in their own fields,
 * making the value exactly what the customer pays.
 */
function amountsFor(order) {
  const r2 = (n) => Math.round(n * 100) / 100;
  const items = (order.items || []).reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const total = Number(order.totalPrice) || 0;
  let discount = Math.max(0, Number(order.promocodeDiscount) || 0);
  let extra = total - (items - discount); // shipping, COD fee, rounding
  if (extra < 0) { discount += -extra; extra = 0; }
  return { sub_total: r2(items), total_discount: r2(discount), shipping_charges: r2(extra) };
}

function orderPayload(order, cfg, parcel, user = {}) {
  const a = order.shippingAddress || {};
  const [first, ...rest] = String(a.name || user.name || 'Customer').trim().split(/\s+/);
  const phone = String(a.phone || user.phone || '').replace(/\D/g, '').slice(-10);
  return {
    // a cancelled Shiprocket order keeps its id, so a re-booking gets a suffix (-2, -3 ...)
    order_id: (order.shiprocket?.attempts || 0) > 0 ? `${order.orderNumber}-${order.shiprocket.attempts + 1}` : order.orderNumber,
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
    ...amountsFor(order),
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
  // Ask for all modes and for surface only, and merge: Shiprocket's default answer can leave out
  // surface couriers (e.g. Ekart) while offering air ones the order can't use (DG-flagged items).
  const [all, surface] = await Promise.all([
    authed(`/courier/serviceability/?${q}`),
    authed(`/courier/serviceability/?${q}&mode=Surface`).catch(() => null),
  ]);
  const seen = new Set();
  const list = [...(all?.data?.available_courier_companies || []), ...(surface?.data?.available_courier_companies || [])]
    .filter((c) => (seen.has(c.courier_company_id) ? false : seen.add(c.courier_company_id)));
  const data = all;
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

/** Always asks Shiprocket for the label, so it follows the current label settings. */
async function label(order) {
  if (!order.shiprocket?.shipmentId) throw new ShiprocketError('Book a courier first', 400);
  const l = await authed('/courier/generate/label', { method: 'POST', body: { shipment_id: [order.shiprocket.shipmentId] } });
  if (!l?.label_url) {
    if (order.shiprocket?.labelUrl) return order.shiprocket.labelUrl;
    throw new ShiprocketError(firstError(l) || 'Label not ready yet, try again in a minute', 400);
  }
  order.shiprocket = { ...(order.shiprocket.toObject ? order.shiprocket.toObject() : order.shiprocket), labelUrl: l.label_url };
  await order.save();
  return l.label_url;
}

/**
 * Cancel the Shiprocket booking (before pickup) so the order can be booked again,
 * e.g. from another pickup address. Freight goes back to the Shiprocket wallet.
 */
async function cancel(order) {
  const sr = order.shiprocket?.toObject ? order.shiprocket.toObject() : (order.shiprocket || {});
  if (!sr.orderId) throw new ShiprocketError('This order is not booked with Shiprocket', 400);
  await authed('/orders/cancel', { method: 'POST', body: { ids: [Number(sr.orderId) || sr.orderId] } });
  order.shiprocket = { attempts: (sr.attempts || 0) + 1 };
  if (order.trackingNumber === sr.awb) order.trackingNumber = undefined;
  if (order.status === 'shipped') order.status = 'processing';
  if (order.notified?.shipped) order.notified = { ...(order.notified.toObject ? order.notified.toObject() : order.notified), shipped: undefined };
  await order.save();
  return order;
}

const trackingUrl = (awb) => (awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : '');

module.exports = { amountsFor, cancel, getConfig, getToken, login, couriersFor, book, label, parcelFor, parseKg, orderPayload, trackingUrl, ShiprocketError, __setSender };

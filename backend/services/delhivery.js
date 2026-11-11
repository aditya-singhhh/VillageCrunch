/**
 * Delhivery One courier booking for admin (direct, no aggregator).
 *
 * Flow for one order: quote (serviceability + freight) -> book (create shipment = AWB,
 * request pickup, get label) -> order is marked shipped with the AWB as tracking number.
 *
 * Needs the live API token from Delhivery One (Settings -> API and MCP Setup) and the
 * pickup location name exactly as in Delhivery One (Settings -> Pickup Locations).
 * The token is write-only from the admin page and never returned to the browser.
 */
const Settings = require('../models/Settings');
const { parcelFor, amountsFor } = require('./shiprocket');

const LIVE = 'https://track.delhivery.com';
const STAGING = 'https://staging-express.delhivery.com';

let sender = async (url, opts) => fetch(url, opts);
const __setSender = (fn) => { sender = fn; };

class DelhiveryError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

async function getConfig() {
  const s = await Settings.getSettings();
  const c = (s.toObject ? s.toObject() : s).delhivery || {};
  return {
    token: process.env.DELHIVERY_TOKEN || c.token,
    pickupLocation: c.pickupLocation || 'VILLAGECRUNCH B2C',
    pickupPincode: c.pickupPincode || '811211',
    staging: !!c.staging,
  };
}

const isCod = (order) => order.paymentInfo?.method === 'cod';
const digits = (v) => String(v || '').replace(/\D/g, '');

async function call(cfg, path, { method = 'GET', body, form } = {}) {
  if (!cfg.token) throw new DelhiveryError('Delhivery is not connected yet. Add the API token in Admin first.', 409);
  const headers = { Authorization: `Token ${cfg.token}`, Accept: 'application/json' };
  let payload;
  if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form).toString(); }
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await sender(`${cfg.staging ? STAGING : LIVE}${path}`, { method, headers, ...(payload ? { body: payload } : {}) });
  let data = null;
  try { data = await res.json(); } catch (_) { /* empty or non-JSON */ }
  if (res.status === 401 || res.status === 403) throw new DelhiveryError('Delhivery rejected the API token. Generate a new live token and save it in Admin.', 400);
  if (!res.ok) throw new DelhiveryError(msgOf(data) || `Delhivery error (${res.status})`, res.status >= 500 ? 502 : 400);
  return data;
}

function msgOf(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  const r = d.packages?.[0]?.remarks;
  if (Array.isArray(r) && r.length) return r.join(' ');
  return d.rmk || d.error || d.message || d.detail || '';
}

/** Is the pincode served (prepaid / COD)? */
async function serviceability(cfg, pin) {
  const d = await call(cfg, `/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pin)}`);
  const pc = d?.delivery_codes?.[0]?.postal_code;
  if (!pc) return { served: false };
  return { served: true, cod: pc.cod === 'Y', prepaid: pc.pre_paid === 'Y', city: pc.city, state: pc.state_code };
}

/** Freight for one parcel (surface). Chargeable weight = max(actual, L x B x H / 5000). */
async function freight(cfg, order, parcel, mode = 'S') {
  const vol = (parcel.length * parcel.breadth * parcel.height) / 5000;
  const grams = Math.round(Math.max(parcel.weight, vol) * 1000);
  const q = new URLSearchParams({
    md: mode, ss: 'Delivered', d_pin: order.shippingAddress?.pincode, o_pin: cfg.pickupPincode,
    cgm: String(grams), pt: isCod(order) ? 'COD' : 'Pre-paid',
    ...(isCod(order) ? { cod: String(Math.round(order.totalPrice || 0)) } : {}),
  });
  const d = await call(cfg, `/api/kinko/v1/invoice/charges/.json?${q}`);
  const row = Array.isArray(d) ? d[0] : d;
  return row?.total_amount != null ? Math.round(Number(row.total_amount)) : null;
}

/** Optional per-booking pickup (another address saved in Delhivery One). */
const withPickup = (cfg, pickup = {}) => ({
  ...cfg,
  ...(pickup.location ? { pickupLocation: String(pickup.location).trim().slice(0, 80) } : {}),
  ...(/^\d{6}$/.test(String(pickup.pincode || '')) ? { pickupPincode: String(pickup.pincode) } : {}),
});

async function quote(order, overrides = {}, pickup = {}) {
  const cfg = withPickup(await getConfig(), pickup);
  const pin = order.shippingAddress?.pincode;
  if (!/^\d{6}$/.test(String(pin || ''))) throw new DelhiveryError('The order has no valid 6-digit pincode', 400);
  const parcel = { ...parcelFor(order), ...overrides };
  const svc = await serviceability(cfg, pin);
  const rateFor = (m) => freight(cfg, order, parcel, m).catch((e) => { console.warn(`Delhivery rate ${m}:`, e.message); return null; });
  const [surface, express] = await Promise.all([rateFor('S'), rateFor('E')]);
  const ok = svc.served && (isCod(order) ? svc.cod : svc.prepaid);
  const options = [
    { mode: 'Surface', rate: surface, days: '4-7' },
    { mode: 'Express', rate: express, days: '2-4' },
  ].filter((o) => o.rate != null);
  return {
    parcel, rate: surface, options, served: svc.served, cod: !!svc.cod, ok,
    pickupLocation: cfg.pickupLocation, pickupPincode: cfg.pickupPincode,
    message: !svc.served ? 'Delhivery does not deliver to this pincode'
      : (isCod(order) && !svc.cod ? 'Delhivery does not collect cash at this pincode' : ''),
  };
}

const istDate = (d = Date.now()) => new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 10);

function shipmentFor(order, cfg, parcel, user = {}, mode = 'Surface') {
  const a = order.shippingAddress || {};
  const attempts = order.delhivery?.attempts || 0;
  const amounts = amountsFor(order);
  const value = Math.round(amounts.sub_total - amounts.total_discount + amounts.shipping_charges);
  return {
    name: String(a.name || user.name || 'Customer').slice(0, 60),
    add: String(a.street || '').replace(/[&#;%\\]/g, ' ').slice(0, 200),
    pin: String(a.pincode),
    city: a.city || '',
    state: a.state || '',
    country: 'India',
    phone: digits(a.phone || user.phone).slice(-10),
    // a cancelled AWB keeps its order id, so a re-booking gets a suffix
    order: attempts > 0 ? `${order.orderNumber}-D${attempts + 1}` : order.orderNumber,
    payment_mode: isCod(order) ? 'COD' : 'Prepaid',
    cod_amount: isCod(order) ? String(Math.round(order.totalPrice || 0)) : '0',
    total_amount: String(value),
    order_date: new Date(order.createdAt || Date.now()).toISOString(),
    products_desc: (order.items || []).map((i) => [i.name, i.weight].filter(Boolean).join(' ')).join(', ').slice(0, 200) || 'Thekua (food)',
    quantity: String((order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0) || 1),
    weight: String(Math.round(parcel.weight * 1000)), // grams
    shipment_length: String(parcel.length),
    shipment_width: String(parcel.breadth),
    shipment_height: String(parcel.height),
    shipping_mode: mode === 'Express' ? 'Express' : 'Surface',
    seller_name: 'VillageCrunch',
    hsn_code: '1905',
  };
}

/** Book: create the shipment (gets the AWB), then pickup + label as best effort. Safe to retry. */
async function book(order, { parcel: overrides = {}, mode = 'Surface', pickup = {} } = {}, user = {}) {
  if (order.delhivery?.awb) return order;
  if (order.status === 'cancelled') throw new DelhiveryError('This order is cancelled', 400);
  if (order.shiprocket?.awb) throw new DelhiveryError('This order is booked with Shiprocket. Cancel that booking first.', 400);
  const cfg = withPickup(await getConfig(), pickup);
  const parcel = { ...parcelFor(order), ...overrides };
  const data = { shipments: [shipmentFor(order, cfg, parcel, user, mode)], pickup_location: { name: cfg.pickupLocation } };
  const r = await call(cfg, '/api/cmu/create.json', { method: 'POST', form: { format: 'json', data: JSON.stringify(data) } });
  const pkg = r?.packages?.[0];
  if (!pkg?.waybill || (pkg.status && !/success/i.test(pkg.status))) {
    throw new DelhiveryError(msgOf(r) || 'Delhivery did not create the shipment', 400);
  }
  const prev = order.delhivery?.toObject ? order.delhivery.toObject() : (order.delhivery || {});
  order.delhivery = { ...prev, awb: String(pkg.waybill), bookedAt: new Date(), weight: parcel.weight, mode: mode === 'Express' ? 'Express' : 'Surface', pickupLocation: cfg.pickupLocation };
  order.trackingNumber = String(pkg.waybill);
  if (['pending', 'confirmed', 'processing'].includes(order.status)) order.status = 'shipped';
  await order.save();

  try { await requestPickup(cfg, 1); order.delhivery = { ...order.delhivery, pickupRequested: true }; }
  catch (e) { console.warn('Delhivery pickup request:', e.message); }
  try { const url = await labelUrlFor(cfg, order.delhivery.awb); if (url) order.delhivery = { ...order.delhivery, labelUrl: url }; }
  catch (e) { console.warn('Delhivery label:', e.message); }
  await order.save();
  return order;
}

/** Pickup for tomorrow (or today if before 10 am IST) at the saved pickup location. */
async function requestPickup(cfg, count = 1) {
  const now = new Date(Date.now() + 330 * 60000);
  const sameDay = now.getUTCHours() < 10;
  const date = istDate(Date.now() + (sameDay ? 0 : 24 * 3600 * 1000));
  return call(cfg, '/fm/request/new/', { method: 'POST', body: { pickup_time: '11:00:00', pickup_date: date, pickup_location: cfg.pickupLocation, expected_package_count: count } });
}

async function labelUrlFor(cfg, awb) {
  const d = await call(cfg, `/api/p/packing_slip?wbns=${encodeURIComponent(awb)}&pdf=true`);
  return d?.packages?.[0]?.pdf_download_link || '';
}

async function label(order) {
  if (!order.delhivery?.awb) throw new DelhiveryError('Book with Delhivery first', 400);
  const cfg = await getConfig();
  const url = await labelUrlFor(cfg, order.delhivery.awb);
  if (!url) throw new DelhiveryError('Label not ready yet, try again in a minute', 400);
  order.delhivery = { ...(order.delhivery.toObject ? order.delhivery.toObject() : order.delhivery), labelUrl: url };
  await order.save();
  return url;
}

/** Cancel before pickup so the order can be booked again. */
async function cancel(order) {
  const d = order.delhivery?.toObject ? order.delhivery.toObject() : (order.delhivery || {});
  if (!d.awb) throw new DelhiveryError('This order is not booked with Delhivery', 400);
  const cfg = await getConfig();
  await call(cfg, '/api/p/edit', { method: 'POST', body: { waybill: d.awb, cancellation: 'true' } });
  order.delhivery = { attempts: (d.attempts || 0) + 1 };
  if (order.trackingNumber === d.awb) order.trackingNumber = undefined;
  if (order.status === 'shipped') order.status = 'processing';
  if (order.notified?.shipped) order.notified = { ...(order.notified.toObject ? order.notified.toObject() : order.notified), shipped: undefined };
  await order.save();
  return order;
}

/** Checks the token works (used when saving it). */
async function testToken(cfg) {
  await call(cfg, `/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(cfg.pickupPincode || '811211')}`);
  return true;
}

const trackingUrl = (awb) => (awb ? `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}` : '');

module.exports = { getConfig, quote, book, label, cancel, testToken, trackingUrl, shipmentFor, DelhiveryError, __setSender };

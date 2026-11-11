import { validatePromocode } from './api';

const OFF_KEY = 'vc-first-off';
export const AUTO_CODE = 'FIRST';
const WELCOME_KEY = 'vc-welcome-code';
/** Offers shown in the cart, best first. The server decides who is eligible. */
export const OFFER_CODES = ['WELCOME15', AUTO_CODE];
const OFFER_TEXT = {
  WELCOME15: '20% off + free delivery on your first order',
  FIRST: 'Free delivery on your first order',
};

const cartPayload = (cartItems = []) => ({
  subtotal: cartItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0),
  products: cartItems.map((i) => ({ productId: i._id, quantity: i.quantity, price: i.price, category: i.category })),
  cats: [...new Set(cartItems.map((i) => i.category))],
});

/**
 * Check each public offer against this cart and shopper.
 * Returns [{ code, description, valid, discount, amountNeeded, used }] in OFFER_CODES order.
 */
export async function getOffers(cartItems = [], userId) {
  if (!cartItems.length) return [];
  const { subtotal, products, cats } = cartPayload(cartItems);
  return Promise.all(OFFER_CODES.map(async (code) => {
    try {
      const v = await validatePromocode(code, subtotal, products, cats, userId);
      return {
        code,
        description: v.promocode?.description || OFFER_TEXT[code] || '',
        valid: !!v.valid,
        discount: Number(v.discount) || 0,
        amountNeeded: !v.valid && Number(v.minOrderValue) > subtotal ? Math.ceil(Number(v.minOrderValue) - subtotal) : 0,
        used: false,
      };
    } catch (e) {
      const d = e?.response?.data || {};
      if (e?.response?.status === 404) return null; // offer not set up
      const used = /already used/i.test(d.message || '');
      return { code, description: OFFER_TEXT[code] || '', valid: false, discount: 0, amountNeeded: 0, used };
    }
  })).then((list) => list.filter(Boolean));
}

/** Code unlocked by the pop-up (stored on this device), if any. */
export const getWelcomeCode = () => { try { return localStorage.getItem(WELCOME_KEY) || null; } catch (_) { return null; } };
export const saveWelcomeCode = (code) => { try { localStorage.setItem(WELCOME_KEY, code); } catch (_) { /* ignore */ } };

/** Remember that the shopper removed the auto-applied code, so we don't re-add it. */
export const markAutoPromoRemoved = () => { try { sessionStorage.setItem(OFF_KEY, '1'); } catch (_) { /* ignore */ } };

/**
 * Quietly try the first-order code. Returns the applied-promo object or null.
 * The server still enforces every rule (minimum, one use per customer).
 */
export async function tryAutoFirst(cartItems = [], userId) {
  try {
    if (sessionStorage.getItem(OFF_KEY) === '1') return null;
  } catch (_) { /* ignore */ }
  if (!cartItems.length) return null;
  const subtotal = cartItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const products = cartItems.map((i) => ({ productId: i._id, quantity: i.quantity, price: i.price, category: i.category }));
  const cats = [...new Set(cartItems.map((i) => i.category))];
  // The welcome code (bigger discount) first, then the plain first-order code
  for (const code of [...new Set([getWelcomeCode(), ...OFFER_CODES].filter(Boolean))]) {
    try {
      const v = await validatePromocode(code, subtotal, products, cats, userId);
      if (v?.valid) return pick(code, v);
    } catch (_) { /* try the next one */ }
  }
  return null;
}

function pick(code, v) {
  return {
    code,
    description: v.promocode?.description,
    discount: v.discount,
    discountType: v.promocode?.type || v.promocode?.discountType,
    auto: true,
  };
}

/**
 * If the shopper can still get first-order free delivery but the cart is below its minimum,
 * return that minimum (e.g. 399). Otherwise null (already applied, already used, or none).
 */
export async function firstOrderMinimum(cartItems = [], userId) {
  try {
    if (!cartItems.length) return null;
    const subtotal = cartItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const products = cartItems.map((i) => ({ productId: i._id, quantity: i.quantity, price: i.price, category: i.category }));
    const cats = [...new Set(cartItems.map((i) => i.category))];
    const v = await validatePromocode(AUTO_CODE, subtotal, products, cats, userId);
    if (!v?.valid && Number(v?.minOrderValue) > subtotal) return Number(v.minOrderValue);
    return null;
  } catch (_) { return null; }
}

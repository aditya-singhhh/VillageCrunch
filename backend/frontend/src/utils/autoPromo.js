import { validatePromocode } from './api';

const OFF_KEY = 'vc-first-off';
export const AUTO_CODE = 'FIRST';
const WELCOME_KEY = 'vc-welcome-code';

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
  // The pop-up code (bigger discount) first, then the plain first-order code
  for (const code of [getWelcomeCode(), AUTO_CODE].filter(Boolean)) {
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

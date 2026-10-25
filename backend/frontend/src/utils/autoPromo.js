import { validatePromocode } from './api';

const OFF_KEY = 'vc-first-off';
export const AUTO_CODE = 'FIRST';

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
  try {
    const v = await validatePromocode(AUTO_CODE, subtotal, products, [...new Set(cartItems.map((i) => i.category))], userId);
    if (!v?.valid) return null;
    return {
      code: AUTO_CODE,
      description: v.promocode?.description,
      discount: v.discount,
      discountType: v.promocode?.type || v.promocode?.discountType,
      auto: true,
    };
  } catch (_) {
    return null;
  }
}

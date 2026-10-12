// Shared display helpers

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const inrCents = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** 1198 -> ₹1,198 ; 2474.46 -> ₹2,474.46 ; 120.5 -> ₹120.50 */
export const formatINR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return inrWhole.format(rounded);
  return inrCents.format(rounded);
};

export const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

const CATEGORY_LABELS = {
  'dry-fruits': 'Dry fruits',
  dryfruits: 'Dry fruits',
  makhana: 'Makhana',
  sattu: 'Sattu',
  thekua: 'Thekua',
  masala: 'Masala & spices',
  gifts: 'Gift boxes',
  'gift-boxes': 'Gift boxes',
};

export const formatCategory = (slug) => {
  if (!slug) return '';
  if (CATEGORY_LABELS[slug]) return CATEGORY_LABELS[slug];
  const s = String(slug).replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Percentage saved, or 0 */
export const discountPercent = (price, originalPrice) => {
  const p = Number(price);
  const o = Number(originalPrice);
  if (!o || !p || o <= p) return 0;
  return Math.round(((o - p) / o) * 100);
};

/** "₹120 / 100 g" when weight parses as g or kg, else null */
export const unitPrice = (price, weight) => {
  if (!weight) return null;
  const m = String(weight).trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|gram|grams)$/);
  if (!m) return null;
  const grams = parseFloat(m[1]) * (m[2] === 'kg' ? 1000 : 1);
  if (!grams || !Number(price)) return null;
  return `${formatINR((Number(price) / grams) * 100)} / 100 g`;
};

/** Mean rating from reviews array; null when no reviews */
export const averageRating = (reviews) => {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  return reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0) / reviews.length;
};

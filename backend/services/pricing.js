/**
 * Single source of truth for order pricing.
 *
 * The client may *display* totals, but every amount that is charged or stored is
 * computed here from database prices, current Settings and a server-validated
 * promocode. Nothing price-related from the request body is ever trusted.
 */
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const Promocode = require('../models/Promocode');

const MAX_QTY_PER_ITEM = 50;
const MAX_LINE_ITEMS = 50;

class PricingError extends Error {
  constructor(message, code = 'PRICING_ERROR', status = 400) {
    super(message);
    this.name = 'PricingError';
    this.code = code;
    this.status = status;
  }
}

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const isMasala = (product) => product?.category?.toLowerCase() === 'masala';

/** Normalise client cart lines to [{ productId, quantity }] merging duplicates. */
const normaliseItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingError('No order items', 'EMPTY_CART');
  }
  if (items.length > MAX_LINE_ITEMS) {
    throw new PricingError('Too many items in cart', 'TOO_MANY_ITEMS');
  }

  const merged = new Map();
  for (const item of items) {
    const id = String(item?.productId || item?.product || item?._id || '');
    const quantity = Number(item?.quantity);
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      throw new PricingError('Invalid product in cart', 'INVALID_PRODUCT');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
      throw new PricingError(`Quantity must be a whole number between 1 and ${MAX_QTY_PER_ITEM}`, 'INVALID_QUANTITY');
    }
    merged.set(id, (merged.get(id) || 0) + quantity);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
};

/**
 * @param {Object}  opts
 * @param {Array}   opts.items            cart lines (ids + quantities only are used)
 * @param {string}  [opts.shippingMethod] key of settings.pricing.shippingCharges
 * @param {string}  [opts.paymentMethod]  'cod' adds the COD charge
 * @param {string}  [opts.promocodeCode]  validated server-side
 * @param {string}  [opts.userId]         enforces per-user promocode limits
 * @param {boolean} [opts.checkStock]     reject lines exceeding stock (default true)
 */
async function priceCart({
  items,
  shippingMethod = 'standard',
  paymentMethod,
  promocodeCode,
  userId,
  checkStock = true,
}) {
  const lines = normaliseItems(items);
  const settings = await Settings.getSettings();

  const products = await Product.find({ _id: { $in: lines.map((l) => l.productId) } });
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const pricedLines = [];
  let subtotal = 0;

  for (const { productId, quantity } of lines) {
    const product = byId.get(productId);
    if (!product || product.isActive === false) {
      throw new PricingError('A product in your cart is no longer available', 'PRODUCT_NOT_FOUND');
    }
    if (isMasala(product)) {
      throw new PricingError('Masala items are coming soon and cannot be purchased yet', 'MASALA_BLOCKED');
    }
    if (checkStock && product.stock < quantity) {
      throw new PricingError(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
        'INSUFFICIENT_STOCK'
      );
    }
    const lineTotal = round2(product.price * quantity);
    subtotal += lineTotal;
    pricedLines.push({
      product: product._id,
      name: product.name,
      image: product.image,
      weight: product.weight,
      category: product.category,
      price: product.price,
      quantity,
      lineTotal,
    });
  }
  subtotal = round2(subtotal);

  // Shipping
  const shippingConfig =
    settings.pricing.shippingCharges[shippingMethod] || settings.pricing.shippingCharges.standard;
  let shipping = subtotal < shippingConfig.freeShippingThreshold ? shippingConfig.rate : 0;

  // Promocode (fully server-validated)
  let discount = 0;
  let promo = null;
  if (promocodeCode) {
    promo = await Promocode.findOne({ code: String(promocodeCode).toUpperCase(), isActive: true });
    if (!promo) throw new PricingError('Promocode is not valid', 'PROMO_INVALID');
    if (!promo.canUserUse(userId)) {
      throw new PricingError('You have already used this promocode', 'PROMO_USED');
    }
    const categories = [...new Set(pricedLines.map((l) => l.category).filter(Boolean))];
    const result = promo.calculateDiscount(
      subtotal,
      pricedLines.map((l) => l.product.toString()),
      categories
    );
    if (!result.valid) throw new PricingError(result.message || 'Promocode cannot be applied', 'PROMO_REJECTED');
    discount = Number(result.discount) || 0;
    if (promo.type === 'freeShipping' || promo.includesFreeShipping) shipping = 0;
  }

  // Prices on the site are MRP, inclusive of GST (Legal Metrology rules). By default the
  // tax is the GST already contained in the amount; it is shown, never added on top.
  // Set pricing.pricesIncludeTax = false to go back to adding tax at checkout.
  const rate = Number(settings.pricing.taxRate) || 0;
  const inclusive = settings.pricing.pricesIncludeTax !== false;
  const taxable = subtotal + shipping;
  const tax = inclusive ? round2((taxable * rate) / (100 + rate)) : round2((taxable * rate) / 100);
  const codCharge = paymentMethod === 'cod' ? Number(settings.pricing.codCharges) || 0 : 0;

  const gross = subtotal + shipping + (inclusive ? 0 : tax) + codCharge;
  discount = Math.min(round2(discount), round2(gross));
  const total = round2(Math.max(0, gross - discount));

  return {
    lines: pricedLines,
    subtotal,
    shipping: round2(shipping),
    shippingConfig,
    tax,
    taxRate: settings.pricing.taxRate,
    taxInclusive: inclusive,
    codCharge,
    discount,
    promo,
    total,
    currency: settings.pricing.currency,
  };
}

/** Stable fingerprint of a cart used to tie a payment to the order it paid for. */
const cartSignature = (lines) =>
  lines
    .map((l) => `${(l.product || l.productId).toString()}:${l.quantity}`)
    .sort()
    .join('|');

module.exports = { priceCart, cartSignature, normaliseItems, PricingError, round2, MAX_QTY_PER_ITEM };

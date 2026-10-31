import { useEffect, useState } from 'react';
import { Truck, Plus } from 'lucide-react';
import { getProducts } from '../utils/api';
import { useCart } from '../context/CartContext';
import { firstOrderMinimum } from '../utils/autoPromo';
import { formatINR } from '../utils/format';
import { imgSrc } from '../utils/img';

let productCache = null;

/**
 * "Add ₹31 more for FREE delivery" with a progress bar and one small item to add.
 * Target = the first-order free-delivery minimum when the shopper is eligible for it
 * (e.g. ₹399), otherwise the store's free-shipping threshold (e.g. ₹500).
 */
const FreeDeliveryNudge = ({ subtotal, shipping, freeThreshold, userId, compact = false }) => {
  const { cartItems, addToCart } = useCart();
  const [firstMin, setFirstMin] = useState(null);
  const [products, setProducts] = useState(productCache || []);
  const [adding, setAdding] = useState(false);

  // Is this shopper still eligible for first-order free delivery, and from what amount?
  useEffect(() => {
    let live = true;
    if (shipping > 0 && cartItems.length) {
      firstOrderMinimum(cartItems, userId).then((m) => { if (live) setFirstMin(m); });
    }
    return () => { live = false; };
  }, [shipping, userId, cartItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (productCache) return;
    getProducts().then((d) => {
      const list = Array.isArray(d) ? d : d?.products || [];
      productCache = list;
      setProducts(list);
    }).catch(() => {});
  }, []);

  const target = firstMin && (!freeThreshold || firstMin < freeThreshold) ? firstMin : freeThreshold;
  const remaining = target ? Math.max(0, Math.ceil(target - subtotal)) : 0;
  if (!(shipping > 0) || !target || remaining <= 0) return null;

  // Cheapest in-stock item that gets them over the line (not already in the cart)
  const inCart = new Set(cartItems.map((i) => String(i._id)));
  const suggestion = products
    .filter((p) => p.isActive !== false && (p.stock ?? 1) > 0 && p.category !== 'masala' && !p.isBundle
      && !inCart.has(String(p._id)) && Number(p.price) >= remaining)
    .sort((a, b) => a.price - b.price)[0];

  const add = async () => {
    if (!suggestion || adding) return;
    setAdding(true);
    try { await addToCart(suggestion, 1); } finally { setAdding(false); }
  };

  return (
    <div className={`rounded-lg border border-leaf/40 bg-leaf-tint/50 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="flex items-center gap-2 text-sm text-ink">
        <Truck className="w-4 h-4 text-leaf flex-shrink-0" aria-hidden="true" />
        <span>Add <strong>{formatINR(remaining)}</strong> more for <strong className="text-leaf">FREE delivery</strong>{firstMin && target === firstMin ? ' on your first order' : ''}</span>
      </p>
      <div className="mt-2 h-2 rounded-full bg-white overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(subtotal, target)} aria-label="Progress to free delivery">
        <div className="h-full bg-leaf" style={{ width: `${Math.min(100, (subtotal / target) * 100)}%` }} />
      </div>
      {suggestion && (
        <div className="mt-3 flex items-center gap-3">
          <img src={imgSrc(suggestion.image || suggestion.images?.[0], 400)} alt="" width="44" height="44" className="w-11 h-11 rounded-md object-cover bg-cream flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{suggestion.name}</p>
            <p className="text-xs text-ink-soft">{formatINR(suggestion.price)} · gets you free delivery</p>
          </div>
          <button type="button" onClick={add} disabled={adding}
            className="h-10 px-3 rounded-md border-2 border-leaf text-leaf text-sm font-semibold inline-flex items-center gap-1 hover:bg-leaf hover:text-white transition-colors flex-shrink-0">
            <Plus className="w-4 h-4" aria-hidden="true" /> {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FreeDeliveryNudge;

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getProducts } from '../utils/api';
import { imgSrc } from '../utils/img';
import { formatINR } from '../utils/format';

/*
 * Swipeable "add to your box" row (like quick-commerce apps): small cards with photo, price and
 * a one-tap Add button. Shows add-on products (sattu, nimki, makhana) and live combo packs that
 * aren't already in the cart, so a thekua order can grow without extra ad cost. Combo packs show
 * only where includeBundles is set (the product page).
 */
export const ADDON_CATEGORIES = ['sattu', 'nimki', 'makhana'];

let cached = null; // one product lookup per page load
const loadAddOns = () => {
  if (!cached) {
    cached = getProducts()
      .then((res) => (Array.isArray(res) ? res : res?.products || [])
        .filter((p) => p && p.isActive !== false && Number(p.stock) > 0 && Number(p.price) > 0
          && (ADDON_CATEGORIES.includes(p.category) || p.isBundle))
        // combos first (best value), then cheapest add-ons
        .sort((a, b) => (b.isBundle ? 1 : 0) - (a.isBundle ? 1 : 0) || a.price - b.price))
      .catch(() => { cached = null; return []; });
  }
  return cached;
};

const AddOnStrip = ({ title = 'Add to your box', excludeId, compact = false, className = '', includeBundles = false }) => {
  const { cartItems, addToCart } = useCart();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);
  const [added, setAdded] = useState({});

  useEffect(() => {
    let live = true;
    loadAddOns().then((list) => { if (live) setItems(list); });
    return () => { live = false; };
  }, []);

  const inCart = new Set(cartItems.map((i) => String(i._id || i.product)));
  // Combo packs already contain thekua, so they're only offered on the product page (as a better-value
  // way to buy it), not next to a cart that already has thekua in it.
  const shown = items.filter((p) => (includeBundles || !p.isBundle)
    && String(p._id) !== String(excludeId) && (!inCart.has(String(p._id)) || added[p._id]));
  if (!shown.length) return null;

  const add = async (p) => {
    setBusy(p._id);
    try {
      await addToCart(p, 1);
      setAdded((a) => ({ ...a, [p._id]: true }));
    } finally { setBusy(null); }
  };

  const w = compact ? 'w-[132px]' : 'w-[150px]';
  return (
    <section className={className} aria-label={title}>
      <h3 className={`font-semibold text-ink ${compact ? 'text-sm mb-2' : 'text-base mb-3'}`}>{title}</h3>
      <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.map((p) => {
          const done = added[p._id];
          return (
            <li key={p._id} className={`${w} flex-shrink-0 snap-start rounded-lg border border-line bg-white p-2 flex flex-col`}>
              <Link to={`/product/${p._id}`} className="block">
                <img
                  src={imgSrc(p.image || p.images?.[0], 400)}
                  alt=""
                  loading="lazy"
                  width="132" height="132"
                  className="w-full aspect-square rounded-md object-cover bg-cream"
                />
                <p className="mt-2 text-[13px] leading-4 font-medium text-ink line-clamp-2 min-h-[32px]">{p.name}</p>
              </Link>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-ink tabular-nums">{formatINR(p.price)}</span>
                {p.originalPrice > p.price && <span className="text-xs text-ink-mute line-through tabular-nums">{formatINR(p.originalPrice)}</span>}
              </div>
              <button
                type="button"
                onClick={() => !done && add(p)}
                disabled={busy === p._id || done}
                className={`mt-2 h-9 rounded-md text-sm font-semibold inline-flex items-center justify-center gap-1 border-2 ${done ? 'border-leaf text-leaf' : 'border-action text-action hover:bg-action-tint'}`}
                aria-label={done ? `${p.name} added` : `Add ${p.name} for ${formatINR(p.price)}`}
              >
                {done ? <><Check className="w-4 h-4" aria-hidden="true" /> Added</> : <><Plus className="w-4 h-4" aria-hidden="true" /> Add</>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default AddOnStrip;

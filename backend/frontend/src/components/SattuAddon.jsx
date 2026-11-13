import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getProducts } from '../utils/api';
import { imgSrc } from '../utils/img';
import { formatINR } from '../utils/format';

/*
 * "Add sattu for litti" suggestion. Shown only when thekua is in the cart and sattu is not:
 * it goes in the same parcel, so it adds to the order without extra ad cost.
 */
let cached = null; // one lookup per page load
const loadSattu = () => {
  if (!cached) {
    cached = getProducts({ category: 'sattu' })
      .then((res) => (Array.isArray(res) ? res : res?.products || [])
        .find((p) => p.category === 'sattu' && p.isActive !== false && Number(p.stock) > 0) || null)
      .catch(() => { cached = null; return null; });
  }
  return cached;
};

const SattuAddon = ({ compact = false }) => {
  const { cartItems, addToCart } = useCart();
  const [sattu, setSattu] = useState(null);
  const [adding, setAdding] = useState(false);

  const hasThekua = cartItems.some((i) => i.category === 'thekua');
  const hasSattu = cartItems.some((i) => i.category === 'sattu');

  useEffect(() => {
    if (!hasThekua || hasSattu) return undefined;
    let live = true;
    loadSattu().then((p) => { if (live) setSattu(p); });
    return () => { live = false; };
  }, [hasThekua, hasSattu]);

  if (!sattu || !hasThekua || hasSattu) return null;

  const add = async () => {
    setAdding(true);
    try { await addToCart(sattu, 1); } finally { setAdding(false); }
  };

  return (
    <div className={`flex items-center gap-3 rounded-lg border border-line bg-cream/60 ${compact ? 'p-2.5 mt-3' : 'p-3 sm:p-4'}`}>
      <img
        src={imgSrc(sattu.image || sattu.images?.[0], 400)}
        alt=""
        width="48" height="48"
        className="w-12 h-12 rounded-md object-cover bg-white flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">Add Bihari Sattu</p>
        <p className="text-xs text-ink-mute">{sattu.weight || '500 g'} roasted chana sattu · goes in the same parcel</p>
      </div>
      <button
        type="button"
        onClick={add}
        disabled={adding}
        className="inline-flex items-center gap-1 h-10 px-3 rounded-md border-2 border-action text-action text-sm font-semibold whitespace-nowrap"
        aria-label={`Add ${sattu.name} for ${formatINR(sattu.price)}`}
      >
        <Plus className="w-4 h-4" aria-hidden="true" /> {formatINR(sattu.price)}
      </button>
    </div>
  );
};

export default SattuAddon;

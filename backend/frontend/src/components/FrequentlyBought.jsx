import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { loadAddOns } from './AddOnStrip';
import { imgSrc } from '../utils/img';
import { formatINR } from '../utils/format';

/*
 * "Frequently bought together" on a 400 g thekua page: this thekua + nimki (+ sattu), with the combo
 * saving shown up front. The real saving is calculated by the server at checkout (services/combos.js);
 * the numbers here only mirror it for display. Hidden until a nimki product is live.
 */
const PAIR = { shuddh: 20, regular: 20 };
const TRIO_EXTRA = 10;

const FrequentlyBought = ({ product }) => {
  const { cartItems, addToCart } = useCart();
  const [nimki, setNimki] = useState(null);
  const [sattu, setSattu] = useState(null);
  const [pick, setPick] = useState({ nimki: true, sattu: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    loadAddOns().then((list) => {
      if (!live) return;
      setNimki(list.find((p) => p.category === 'nimki' && !p.isBundle) || null);
      setSattu(list.find((p) => p.category === 'sattu' && !p.isBundle) || null);
    });
    return () => { live = false; };
  }, []);

  const is400 = product && product.category === 'thekua' && !product.isBundle && /^400\s?g/i.test(String(product.weight || ''));
  if (!is400 || !nimki || product.stock === 0) return null;

  const rows = [
    { key: 'this', p: product, label: 'This thekua', fixed: true },
    { key: 'nimki', p: nimki, label: nimki.name },
    ...(sattu ? [{ key: 'sattu', p: sattu, label: sattu.name }] : []),
  ];
  const chosen = rows.filter((r) => r.fixed || pick[r.key]);
  const full = chosen.reduce((s, r) => s + Number(r.p.price), 0);
  const pairOff = pick.nimki ? (product.oilFried ? PAIR.regular : PAIR.shuddh) : 0;
  const saving = pairOff + (pick.nimki && pick.sattu && sattu ? TRIO_EXTRA : 0);

  const addAll = async () => {
    setBusy(true);
    try {
      const inCart = new Set(cartItems.map((i) => String(i._id || i.product)));
      for (const r of chosen) {
        if (!inCart.has(String(r.p._id))) await addToCart(r.p, 1);
      }
      toast.success(saving ? `Added. Combo saving ${formatINR(saving)} applied in cart` : 'Added to cart');
    } finally { setBusy(false); }
  };

  return (
    <section className="mt-6 rounded-lg border border-line bg-white p-4" aria-label="Frequently bought together">
      <h3 className="font-semibold text-ink">Frequently bought together</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => {
          const on = r.fixed || pick[r.key];
          return (
            <li key={r.key}>
              <label className={`flex items-center gap-3 ${r.fixed ? '' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={r.fixed}
                  onChange={() => setPick((s) => ({ ...s, [r.key]: !s[r.key] }))}
                  className="w-5 h-5 accent-[var(--color-action,#C2410C)] flex-shrink-0"
                />
                <img src={imgSrc(r.p.image || r.p.images?.[0], 400)} alt="" width="44" height="44" className="w-11 h-11 rounded object-cover bg-cream flex-shrink-0" />
                <span className="flex-1 min-w-0 text-sm text-ink leading-5 line-clamp-2">{r.fixed ? `${r.label} (${product.weight})` : r.label}</span>
                <span className="text-sm font-medium tabular-nums text-ink">{formatINR(r.p.price)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 pt-3 border-t border-line flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-soft">{chosen.length} items</span>
        <span className="text-right">
          {saving > 0 && <span className="text-sm text-ink-mute line-through mr-2 tabular-nums">{formatINR(full)}</span>}
          <span className="text-lg font-semibold text-ink tabular-nums">{formatINR(full - saving)}</span>
          {saving > 0 && <span className="block text-sm font-semibold text-leaf">Combo saving {formatINR(saving)}</span>}
        </span>
      </div>
      <button
        type="button"
        onClick={addAll}
        disabled={busy}
        className="mt-3 w-full h-11 rounded-md bg-action text-white font-semibold inline-flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" aria-hidden="true" /> Add {chosen.length} items · {formatINR(full - saving)}
      </button>
      <p className="mt-2 text-xs text-ink-mute">Combo saving or the first-order ₹100 off, whichever is bigger, is applied at checkout.</p>
    </section>
  );
};

export default FrequentlyBought;

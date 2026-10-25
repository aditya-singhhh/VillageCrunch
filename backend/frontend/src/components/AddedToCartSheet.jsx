import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Check, X, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import useStoreSettings from '../hooks/useStoreSettings';
import { formatINR } from '../utils/format';
import { imgSrc } from '../utils/img';

export const CART_ADDED_EVENT = 'vc:cart-added';

/**
 * Mobile: a small sheet that slides up from the bottom after "Add to cart",
 * with the item, the cart total and a clear Checkout button.
 * It does not lock the page; it hides itself after a few seconds.
 */
const AddedToCartSheet = () => {
  const [item, setItem] = useState(null);
  const { getCartTotal, getCartCount } = useCart();
  const { freeShippingThreshold } = useStoreSettings();
  const navigate = useNavigate();
  const timer = useRef(null);

  useEffect(() => {
    const onAdded = (e) => {
      if (window.matchMedia('(min-width: 768px)').matches) return; // desktop uses the cart drawer
      setItem({ ...e.detail, key: Date.now() });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setItem(null), 7000);
    };
    window.addEventListener(CART_ADDED_EVENT, onAdded);
    return () => { window.removeEventListener(CART_ADDED_EVENT, onAdded); clearTimeout(timer.current); };
  }, []);

  if (!item) return null;
  const close = () => { clearTimeout(timer.current); setItem(null); };
  const go = (to) => { close(); navigate(to); };
  const total = getCartTotal();
  const count = getCartCount();
  const remaining = freeShippingThreshold ? Math.max(0, freeShippingThreshold - total) : 0;
  const p = item.product || {};

  return createPortal(
    <div
      key={item.key}
      role="status"
      aria-live="polite"
      className="md:hidden fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(12px,env(safe-area-inset-bottom))] animate-sheet-up"
    >
      <div className="rounded-2xl bg-white shadow-raised border border-line p-4">
        <div className="flex items-start gap-3">
          <img
            src={imgSrc(p.image || p.images?.[0], 400)}
            alt=""
            width="56" height="56"
            className="w-14 h-14 rounded-lg object-cover bg-cream flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-leaf">
              <span className="w-5 h-5 rounded-full bg-leaf text-white inline-flex items-center justify-center">
                <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
              </span>
              Added to cart
            </p>
            <p className="text-sm text-ink truncate mt-0.5">{p.name}</p>
            <p className="text-xs text-ink-mute">
              {count} {count === 1 ? 'item' : 'items'} · {formatINR(total)}
            </p>
          </div>
          <button onClick={close} className="icon-btn -mr-2 -mt-2" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-soft">
          <Truck className="w-4 h-4 text-leaf flex-shrink-0" aria-hidden="true" />
          {remaining > 0
            ? <>First order? <b className="text-ink">Free delivery</b>, applied at checkout</>
            : <>Free delivery on this order</>}
        </p>

        <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2">
          <button onClick={() => go('/cart')} className="btn-secondary h-12">View cart</button>
          <button onClick={() => go('/checkout')} className="btn-primary h-12">Checkout →</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddedToCartSheet;

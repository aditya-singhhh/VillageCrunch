import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/format';

/** Desktop mini-cart. Reads from CartContext only; no API changes. */
const CartDrawer = ({ open, onClose }) => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('button')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const idOf = (item) => (user ? item._id : item.cartItemId);

  return (
    <div className="fixed inset-0 z-[60] hidden md:block">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="absolute right-0 top-0 bottom-0 w-[420px] max-w-full bg-white shadow-raised flex flex-col animate-drawer-right"
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-line">
          <h2 className="font-display text-xl font-semibold">Your cart</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close cart"><X className="w-5 h-5" /></button>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
            <ShoppingBag className="w-10 h-10 text-ink-mute" strokeWidth={1.5} />
            <p className="font-display text-lg font-semibold">Your cart is empty</p>
            <Link to="/products" className="btn-primary mt-2">Start shopping</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-line px-5">
              {cartItems.map((item) => (
                <li key={item.cartItemId || item._id} className="flex gap-3 py-4">
                  <img
                    src={item.image || item.images?.[0]}
                    alt={item.name}
                    width="72" height="72" loading="lazy" decoding="async"
                    className="w-[72px] h-[72px] rounded-md object-cover bg-cream flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item._id}`} className="text-sm font-semibold line-clamp-2 hover:text-action">{item.name}</Link>
                    <p className="text-xs text-ink-mute mt-0.5">{item.weight}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex items-center border border-line rounded-md">
                        <button
                          onClick={() => updateQuantity(idOf(item), item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                          className="w-9 h-9 inline-flex items-center justify-center disabled:text-sand"
                        ><Minus className="w-4 h-4" /></button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idOf(item), item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          aria-label="Increase quantity"
                          className="w-9 h-9 inline-flex items-center justify-center disabled:text-sand"
                        ><Plus className="w-4 h-4" /></button>
                      </div>
                      <span className="font-semibold tabular-nums">{formatINR(item.price * item.quantity)}</span>
                    </div>
                    <button onClick={() => removeFromCart(idOf(item))} className="text-sm text-berry hover:underline mt-1 h-8">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-5 space-y-3 bg-paper">
              <div className="flex justify-between text-base">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-semibold tabular-nums">{formatINR(getCartTotal())}</span>
              </div>
              <p className="text-sm text-ink-soft">Shipping and taxes are calculated at checkout.</p>
              <button onClick={() => { onClose(); navigate(user ? '/checkout' : '/login?redirect=/checkout'); }} className="btn-primary w-full">Checkout</button>
              <Link to="/cart" onClick={onClose} className="btn-ghost w-full">View cart</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default CartDrawer;

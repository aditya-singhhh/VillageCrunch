import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { saveCheckoutLead } from '../utils/api';
import { fbPixel } from '../utils/analytics';
import { getWelcomeCode, saveWelcomeCode } from '../utils/autoPromo';

const CODE = 'WELCOME15';
const SEEN_KEY = 'vc-welcome-seen';
const seen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (_) { return true; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) { /* ignore */ } };

/**
 * Small "15% off for your WhatsApp number" card. Shows once per visitor, after
 * 15 seconds or half a page of scrolling, only on shopping pages.
 */
const WelcomePopup = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { cartItems, getCartTotal } = useCart();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const eligible = !user && !getWelcomeCode() && /^\/($|product\/|products|diwali|ghar)/.test(pathname);

  useEffect(() => {
    if (!eligible || open || seen()) return undefined;
    const show = () => { if (!seen()) { setOpen(true); markSeen(); } };
    const t = setTimeout(show, 15000);
    const onScroll = () => {
      const h = document.documentElement;
      if (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) > 0.5) show();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, [eligible, open, pathname]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    const ten = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(ten)) { setError('Please enter a valid 10-digit mobile number'); return; }
    saveCheckoutLead({
      phone: ten,
      items: (cartItems || []).map((i) => ({ productId: i._id, name: i.name, quantity: i.quantity, price: i.price })),
      total: getCartTotal(),
      source: 'popup',
    });
    saveWelcomeCode(CODE);
    fbPixel('Lead', { content_name: 'welcome15' });
    setDone(true);
  };

  const close = () => setOpen(false);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Get 15% off">
      <div className="absolute inset-0 bg-black/55" onClick={close} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-raised p-6 pt-7">
        <button onClick={close} className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white border border-line shadow-card inline-flex items-center justify-center text-ink" aria-label="Close">
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>
        {!done ? (
          <form onSubmit={submit} className="text-center">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-brand">First order offer</p>
            <p className="font-display font-semibold text-[28px] leading-tight text-ink mt-1">15% off<br />+ free delivery</p>
            <p className="text-sm text-ink-soft mt-2">Enter your WhatsApp number to unlock it.</p>
            <div className="mt-4 flex gap-2 text-left">
              <span className="inline-flex items-center px-3 rounded-md border border-line bg-paper text-ink-soft text-sm">+91</span>
              <input
                type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10}
                value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                placeholder="Mobile number" className="input-field flex-1 min-w-0" aria-label="WhatsApp number"
              />
            </div>
            {error && <p className="text-sm text-berry mt-1 text-left">{error}</p>}
            <button type="submit" className="btn-primary w-full mt-3 h-12">Get 15% off</button>
            <button type="button" onClick={close} className="mt-2 h-10 text-sm text-ink-mute underline underline-offset-4">No thanks</button>
            <p className="text-[11px] text-ink-mute mt-1">Only order updates and offers from VillageCrunch. No spam.</p>
          </form>
        ) : (
          <div className="text-center">
            <span className="mx-auto w-12 h-12 rounded-full bg-leaf text-white inline-flex items-center justify-center"><Check className="w-7 h-7" strokeWidth={3} /></span>
            <p className="font-display font-semibold text-2xl text-ink mt-3">Unlocked!</p>
            <p className="mt-2 text-ink-soft">Your code <b className="text-ink tracking-wide">{CODE}</b> (15% off + free delivery) is applied automatically at checkout.</p>
            <button onClick={close} className="btn-primary w-full mt-4 h-12">Continue shopping</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default WelcomePopup;

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const KEY = 'vc_announce_dismissed';
const THEKUA_400 = '/product/697a51ed6d805b30e09a52dc';

/**
 * Top bar. Tapping it does something useful: on a product page it scrolls to the
 * price and buy button; elsewhere it opens the thekua 400 g page.
 */
const AnnouncementBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  if (hidden || /^\/(checkout|admin)/.test(location.pathname)) return null;
  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  };
  const go = () => {
    if (location.pathname.startsWith('/product/')) {
      const target = document.querySelector('h1');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(THEKUA_400);
    }
  };
  return (
    <div className="bg-brand text-cream text-[13px] relative">
      <button type="button" onClick={go} className="block w-full text-center py-2 px-12">
        First order: <strong className="font-semibold text-white">FREE delivery</strong> · Made fresh in desi ghee
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-0 top-0 h-full w-11 inline-flex items-center justify-center hover:bg-brand-dark"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default AnnouncementBar;

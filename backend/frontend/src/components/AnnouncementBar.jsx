import { useState } from 'react';
import { X } from 'lucide-react';
import useStoreSettings from '../hooks/useStoreSettings';
import { formatINR } from '../utils/format';

const KEY = 'vc_announce_dismissed';

const AnnouncementBar = () => {
  const { freeShippingThreshold } = useStoreSettings();
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  if (hidden || !freeShippingThreshold) return null;
  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  };
  return (
    <div className="bg-brand text-cream text-[13px] relative">
      <p className="text-center py-2 px-12">
        Free delivery on orders above <strong className="font-semibold text-white">{formatINR(freeShippingThreshold)}</strong>
      </p>
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

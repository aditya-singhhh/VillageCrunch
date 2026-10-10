import { useEffect, useState } from 'react';
import { getSettings } from '../utils/api';

let cached = null;
let inflight = null;

/** Public store settings (shipping threshold, tax, COD). Cached for the session. */
export default function useStoreSettings() {
  const [settings, setSettings] = useState(cached);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    inflight = inflight || getSettings().then((s) => { cached = s; return s; }).catch(() => null);
    inflight.then((s) => { if (alive && s) setSettings(s); });
    return () => { alive = false; };
  }, []);
  const standard = settings?.pricing?.shippingCharges?.standard;
  return {
    settings,
    freeShippingThreshold: standard?.freeShippingThreshold || 0,
    shippingRate: standard?.rate,
    codCharges: settings?.pricing?.codCharges || 0,
    phone: settings?.business?.phone,
  };
}

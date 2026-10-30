import { useState } from 'react';
import { Truck } from 'lucide-react';
import { lookupPincode } from '../utils/api';

/*
 * "When will it reach me?" on the product page. Orders are made fresh and shipped from
 * Khagaria (Bihar) in 1-2 days; transit depends on how far the PIN code is.
 * Ranges are deliberately cautious (surface courier). Adjust here if courier times change.
 */
const ZONES = [
  { days: [2, 4], states: ['Bihar'] },
  { days: [3, 5], states: ['Jharkhand', 'West Bengal', 'Uttar Pradesh', 'Odisha', 'Delhi', 'Haryana', 'Chandigarh'] },
  { days: [6, 9], states: ['Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Tripura', 'Sikkim', 'Jammu and Kashmir', 'Ladakh', 'Andaman and Nicobar Islands', 'Lakshadweep'] },
];
const DEFAULT_DAYS = [4, 7];

const daysFor = (state) => (ZONES.find((z) => z.states.some((s) => s.toLowerCase() === String(state || '').toLowerCase())) || {}).days || DEFAULT_DAYS;

const fmt = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

const KEY = 'vc-delivery-pin';

const DeliveryEstimate = () => {
  const [pin, setPin] = useState(() => { try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; } });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async (e) => {
    e?.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pin)) { setError('Enter a valid 6-digit PIN code'); setResult(null); return; }
    setLoading(true); setError('');
    const hit = await lookupPincode(pin);
    setLoading(false);
    if (!hit) { setError('We could not find this PIN code. We still deliver across India.'); setResult(null); return; }
    try { localStorage.setItem(KEY, pin); } catch (_) { /* ignore */ }
    const [a, b] = daysFor(hit.state);
    setResult({ place: [hit.city, hit.state].filter(Boolean).join(', '), from: fmt(addDays(a)), to: fmt(addDays(b)) });
  };

  return (
    <div className="mt-4 rounded-md border border-line bg-white p-3">
      <form onSubmit={check} className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-leaf flex-shrink-0" aria-hidden="true" />
        <label htmlFor="pdp-pin" className="text-sm font-semibold text-ink whitespace-nowrap">Delivery to</label>
        <input
          id="pdp-pin"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
          placeholder="PIN code"
          className="input-field h-10 w-28 text-sm"
        />
        <button type="submit" disabled={loading} className="text-sm font-semibold text-action min-h-[40px] px-2">
          {loading ? 'Checking…' : 'Check'}
        </button>
      </form>
      {result && (
        <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
          Arrives by <b className="text-ink">{result.from} – {result.to}</b> in {result.place}.
          <span className="block text-xs text-ink-mute mt-0.5">Made fresh after you order and shipped from Khagaria, Bihar in 1–2 days.</span>
        </p>
      )}
      {error && <p className="mt-2 text-sm text-berry" aria-live="polite">{error}</p>}
    </div>
  );
};

export default DeliveryEstimate;

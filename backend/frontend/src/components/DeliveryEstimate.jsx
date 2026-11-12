import { useState } from 'react';
import { Truck } from 'lucide-react';
import { lookupPincode, getDeliveryEta } from '../utils/api';

/*
 * "When will it reach me?" on the product page. Orders are made fresh and shipped from
 * Munger (Bihar) in 1-2 days. Dates come from Delhivery's expected transit time for the PIN;
 * if Delhivery doesn't answer, the cautious zone ranges below are used.
 */
const ZONES = [
  { days: [2, 4], states: ['Bihar'] },
  { days: [3, 5], states: ['Jharkhand', 'West Bengal', 'Uttar Pradesh', 'Odisha', 'Delhi', 'Haryana', 'Chandigarh'] },
  { days: [6, 9], states: ['Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Tripura', 'Sikkim', 'Jammu and Kashmir', 'Ladakh', 'Andaman and Nicobar Islands', 'Lakshadweep'] },
];
const DEFAULT_DAYS = [4, 7];

const daysFor = (state) => (ZONES.find((z) => z.states.some((s) => s.toLowerCase() === String(state || '').toLowerCase())) || {}).days || DEFAULT_DAYS;

const fmt = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
// Ranges assume dispatch tomorrow. When a version only ships from a later date, count from the day before it.
export const shipDate = (shipsFrom) => {
  if (!shipsFrom) return null;
  const d = new Date(`${shipsFrom}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Number.isNaN(d.getTime()) || d <= today ? null : d;
};
const addDays = (n, from) => { const d = from ? new Date(from) : new Date(); if (from) d.setDate(d.getDate() - 1); d.setDate(d.getDate() + n); return d; };

const KEY = 'vc-delivery-pin';

const DeliveryEstimate = ({ shipsFrom }) => {
  const later = shipDate(shipsFrom);
  const [pin, setPin] = useState(() => { try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; } });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async (e) => {
    e?.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pin)) { setError('Enter a valid 6-digit PIN code'); setResult(null); return; }
    setLoading(true); setError('');
    const [hit, eta] = await Promise.all([lookupPincode(pin), getDeliveryEta(pin)]);
    setLoading(false);
    if (eta && eta.served === false) { setError('Our courier does not deliver to this PIN code yet. Message us and we will try to arrange it.'); setResult(null); return; }
    if (!hit && !eta?.days) { setError('We could not find this PIN code. We still deliver across India.'); setResult(null); return; }
    try { localStorage.setItem(KEY, pin); } catch (_) { /* ignore */ }
    const [a, b] = eta?.days || daysFor(hit?.state);
    setResult({ place: hit ? [hit.city, hit.state].filter(Boolean).join(', ') : `PIN ${pin}`, from: fmt(addDays(a, later)), to: fmt(addDays(b, later)), courier: !!eta?.days });
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
          <span className="block text-xs text-ink-mute mt-0.5">{later ? `Made fresh in our first batch after Chhath and shipped from Munger, Bihar on ${fmt(later)}` : 'Made fresh after you order and shipped from Munger, Bihar in 1–2 days'}{result.courier ? ' · Delhivery estimate' : ''}.</span>
        </p>
      )}
      {error && <p className="mt-2 text-sm text-berry" aria-live="polite">{error}</p>}
    </div>
  );
};

export default DeliveryEstimate;

import { useState } from 'react';
import { Truck, ExternalLink, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDelhiveryQuote, bookDelhivery, getDelhiveryLabel, cancelDelhivery } from '../utils/api';

const trackUrl = (awb) => `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`;

/** Inside an order's Manage window: Delhivery price, book, label + tracking. */
const DelhiveryBooking = ({ order, onBooked }) => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [weight, setWeight] = useState('');
  const [otherPickup, setOtherPickup] = useState(false);
  const [pickup, setPickup] = useState({ location: '', pincode: '' });
  const d = order.delhivery || {};
  if (order.shiprocket?.awb) return null; // booked elsewhere

  if (d.awb) {
    const label = async () => {
      try { const { labelUrl } = await getDelhiveryLabel(order._id); window.open(labelUrl, '_blank', 'noopener'); }
      catch (e) { toast.error(e.response?.data?.message || 'Label not ready yet'); }
    };
    return (
      <div className="rounded-md border border-leaf bg-leaf-tint p-3 text-sm">
        <p className="font-semibold text-leaf flex items-center gap-2"><Truck className="w-4 h-4" /> Booked with Delhivery</p>
        <p className="mt-1">AWB <span className="font-mono font-semibold">{d.awb}</span>{d.mode ? ` · ${d.mode}` : ''}{d.pickupRequested ? ' · pickup requested' : ''}</p>
        {d.pickupLocation && <p className="text-xs text-ink-mute">Pickup: {d.pickupLocation}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={label} className="btn-secondary btn-sm inline-flex items-center gap-1"><FileText className="w-4 h-4" /> Label</button>
          <a href={trackUrl(d.awb)} target="_blank" rel="noreferrer" className="btn-secondary btn-sm inline-flex items-center gap-1"><ExternalLink className="w-4 h-4" /> Tracking link</a>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(trackUrl(d.awb)); toast.success('Tracking link copied'); }} className="btn-secondary btn-sm">Copy link</button>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm('Cancel this Delhivery booking? Only before pickup. You can book again.')) return;
              try { const r = await cancelDelhivery(order._id); toast.success('Booking cancelled'); onBooked?.(r); }
              catch (e) { toast.error(e.response?.data?.message || 'Could not cancel'); }
            }}
            className="btn-secondary btn-sm text-berry"
          >
            Cancel booking
          </button>
        </div>
      </div>
    );
  }

  const parcel = () => (Number(weight) > 0 ? { weight: Number(weight) } : {});
  const pickupArg = () => (otherPickup && pickup.location.trim() ? { location: pickup.location.trim(), pincode: pickup.pincode.trim() } : {});
  const load = async () => {
    setLoading(true);
    try {
      const p = pickupArg();
      const q = await getDelhiveryQuote(order._id, { ...parcel(), ...(p.location ? { pickupLocation: p.location, pickupPincode: p.pincode } : {}) });
      setQuote(q);
      if (!weight) setWeight(String(q.parcel.weight));
      if (!q.ok) toast.error(q.message || 'Delhivery cannot take this order');
    } catch (e) { toast.error(e.response?.data?.message || 'Could not get Delhivery price'); }
    finally { setLoading(false); }
  };
  const book = async (mode) => {
    setBooking(mode);
    try {
      const r = await bookDelhivery(order._id, parcel(), mode, pickupArg());
      toast.success(`Booked Delhivery ${mode}. AWB ${r.trackingNumber}`);
      onBooked?.(r);
    } catch (e) { toast.error(e.response?.data?.message || 'Booking failed'); }
    finally { setBooking(false); }
  };

  return (
    <div className="rounded-md border border-line bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold flex items-center gap-2 mr-auto"><Truck className="w-4 h-4 text-action" /> Ship with Delhivery (direct)</p>
        <label className="flex items-center gap-1 text-ink-soft">Weight
          <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="auto" className="input-field h-8 w-20 text-sm" /> kg
        </label>
        <button type="button" onClick={load} disabled={loading} className="btn-secondary btn-sm">{loading ? 'Checking…' : quote ? 'Refresh' : 'See price'}</button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
        <input type="checkbox" checked={otherPickup} onChange={(e) => { setOtherPickup(e.target.checked); setQuote(null); }} />
        Pick up from another address
      </label>
      {otherPickup && (
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <input value={pickup.location} onChange={(e) => { setPickup({ ...pickup, location: e.target.value }); setQuote(null); }} placeholder="Pickup location name (as in Delhivery One)" className="input-field h-9 text-sm" />
          <input value={pickup.pincode} onChange={(e) => { setPickup({ ...pickup, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }); setQuote(null); }} inputMode="numeric" placeholder="Pickup pincode" className="input-field h-9 text-sm" />
          <p className="sm:col-span-2 text-xs text-ink-mute">Add the address first in Delhivery One → Settings → Pickup Locations, then type its exact name here.</p>
        </div>
      )}
      {quote && !quote.ok && <p className="mt-2 text-berry">{quote.message}</p>}
      {quote && quote.ok && (
        <ul className="mt-2 divide-y divide-line">
          {(quote.options?.length ? quote.options : [{ mode: 'Surface', rate: quote.rate, days: '4-7' }]).map((o) => (
            <li key={o.mode} className="flex items-center gap-2 py-2">
              <div className="flex-1">
                <p className="font-medium">Delhivery {o.mode}</p>
                <p className="text-xs text-ink-mute">{o.days} days · pickup: {quote.pickupLocation}</p>
              </div>
              {o.rate != null && <span className="font-semibold">₹{o.rate}</span>}
              <button type="button" onClick={() => book(o.mode)} disabled={!!booking} className="btn-primary btn-sm">{booking === o.mode ? 'Booking…' : 'Book'}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-ink-mute">Charges your Delhivery wallet, requests pickup, and marks this order Shipped.</p>
    </div>
  );
};

export default DelhiveryBooking;

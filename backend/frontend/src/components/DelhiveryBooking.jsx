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
        <p className="mt-1">AWB <span className="font-mono font-semibold">{d.awb}</span>{d.pickupRequested ? ' · pickup requested' : ''}</p>
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
  const load = async () => {
    setLoading(true);
    try {
      const q = await getDelhiveryQuote(order._id, parcel());
      setQuote(q);
      if (!weight) setWeight(String(q.parcel.weight));
      if (!q.ok) toast.error(q.message || 'Delhivery cannot take this order');
    } catch (e) { toast.error(e.response?.data?.message || 'Could not get Delhivery price'); }
    finally { setLoading(false); }
  };
  const book = async () => {
    setBooking(true);
    try {
      const r = await bookDelhivery(order._id, parcel());
      toast.success(`Booked Delhivery. AWB ${r.trackingNumber}`);
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
      {quote && (
        <div className="mt-2 flex items-center gap-2">
          <p className="flex-1">{quote.ok ? <>Delhivery Surface{quote.rate != null ? <> · <b>₹{quote.rate}</b></> : ''}</> : <span className="text-berry">{quote.message}</span>}</p>
          {quote.ok && <button type="button" onClick={book} disabled={booking} className="btn-primary btn-sm">{booking ? 'Booking…' : 'Book'}</button>}
        </div>
      )}
      <p className="mt-2 text-xs text-ink-mute">Charges your Delhivery wallet, requests pickup, and marks this order Shipped.</p>
    </div>
  );
};

export default DelhiveryBooking;

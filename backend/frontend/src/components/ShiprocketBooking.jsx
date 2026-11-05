import { useState } from 'react';
import { Truck, ExternalLink, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getShiprocketCouriers, bookShiprocket, getShiprocketLabel } from '../utils/api';

const trackUrl = (awb) => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;

/** Inside an order's Manage window: see courier prices, book one, get label + tracking. */
const ShiprocketBooking = ({ order, onBooked }) => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [weight, setWeight] = useState('');
  const sr = order.shiprocket || {};
  const isCod = order.paymentInfo?.method === 'cod';

  if (sr.awb) {
    const label = async () => {
      try {
        const { labelUrl } = sr.labelUrl ? { labelUrl: sr.labelUrl } : await getShiprocketLabel(order._id);
        window.open(labelUrl, '_blank', 'noopener');
      } catch (e) { toast.error(e.response?.data?.message || 'Label not ready yet'); }
    };
    return (
      <div className="rounded-md border border-leaf bg-leaf-tint p-3 text-sm">
        <p className="font-semibold text-leaf flex items-center gap-2"><Truck className="w-4 h-4" /> Booked with {sr.courier || 'Shiprocket'}</p>
        <p className="mt-1">AWB <span className="font-mono font-semibold">{sr.awb}</span>{sr.pickupRequested ? ' · pickup requested' : ''}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={label} className="btn-secondary btn-sm inline-flex items-center gap-1"><FileText className="w-4 h-4" /> Label</button>
          <a href={trackUrl(sr.awb)} target="_blank" rel="noreferrer" className="btn-secondary btn-sm inline-flex items-center gap-1"><ExternalLink className="w-4 h-4" /> Tracking link</a>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(trackUrl(sr.awb)); toast.success('Tracking link copied'); }} className="btn-secondary btn-sm">Copy link</button>
        </div>
      </div>
    );
  }

  const parcel = () => (Number(weight) > 0 ? { weight: Number(weight) } : {});
  const load = async () => {
    setLoading(true);
    try {
      const q = await getShiprocketCouriers(order._id, parcel());
      setQuote(q);
      if (!weight) setWeight(String(q.parcel.weight));
      if (!q.couriers.length) toast.error('No courier delivers to this pincode');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not get couriers');
    } finally { setLoading(false); }
  };
  const book = async (c) => {
    setBooking(c.id);
    try {
      const r = await bookShiprocket(order._id, c.id, parcel());
      toast.success(`Booked ${r.shiprocket?.courier || c.name}. AWB ${r.trackingNumber}`);
      onBooked?.(r);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Booking failed');
    } finally { setBooking(null); }
  };

  return (
    <div className="rounded-md border border-line bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold flex items-center gap-2 mr-auto"><Truck className="w-4 h-4 text-action" /> Ship with Shiprocket</p>
        <label className="flex items-center gap-1 text-ink-soft">Weight
          <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="auto" className="input-field h-8 w-20 text-sm" /> kg
        </label>
        <button type="button" onClick={load} disabled={loading} className="btn-secondary btn-sm">{loading ? 'Checking…' : quote ? 'Refresh' : 'See couriers'}</button>
      </div>
      {isCod && !order.codVerified && (
        <p className="mt-2 text-xs text-action-dark">Cash on delivery: confirm with the customer on WhatsApp before booking.</p>
      )}
      {quote && quote.couriers.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {quote.couriers.slice(0, 6).map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{c.name}{c.recommended && <span className="ml-1 text-xs text-leaf">(recommended)</span>}</p>
                <p className="text-xs text-ink-mute">{c.days ? `${c.days} days` : c.etd}{c.rating ? ` · ★ ${c.rating}` : ''}{c.surface ? ' · surface' : ' · air'}</p>
              </div>
              <span className="font-semibold">₹{c.rate}</span>
              <button type="button" onClick={() => book(c)} disabled={!!booking} className="btn-primary btn-sm">{booking === c.id ? 'Booking…' : 'Book'}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-ink-mute">Booking charges your Shiprocket wallet, requests pickup, and marks this order Shipped.</p>
    </div>
  );
};

export default ShiprocketBooking;

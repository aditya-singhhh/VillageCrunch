import { useEffect, useState } from 'react';
import { Truck, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDelhivery, saveDelhivery } from '../utils/api';

/** Admin: connect Delhivery One once with the live API token, to book directly from each order. */
const DelhiveryCard = () => {
  const [info, setInfo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ token: '', pickupLocation: 'VILLAGECRUNCH B2C', pickupPincode: '811211' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getDelhivery().then((i) => {
      setInfo(i);
      setForm((f) => ({ ...f, pickupLocation: i.pickupLocation || f.pickupLocation, pickupPincode: i.pickupPincode || f.pickupPincode }));
    }).catch(() => {});
  }, []);
  if (!info) return null;

  if (info.configured && !editing) {
    return (
      <p className="mb-6 flex flex-wrap items-center gap-2 text-sm text-leaf">
        <Check className="w-4 h-4" /> Delhivery connected (pickup "{info.pickupLocation}" {info.pickupPincode}). Book from each order's Manage window.
        <button type="button" onClick={() => setEditing(true)} className="underline text-ink-soft">Change</button>
      </p>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await saveDelhivery(form);
      setInfo(r);
      setForm((f) => ({ ...f, token: '' }));
      setEditing(false);
      toast.success('Delhivery connected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not connect Delhivery');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-line bg-white p-4 md:p-5">
      <h2 className="font-semibold text-ink flex items-center gap-2"><Truck className="w-5 h-5 text-action" /> Connect Delhivery</h2>
      <p className="mt-1 text-sm text-ink-soft">Book Delhivery directly (business rates) for any order in one tap: AWB, pickup and label are done for you, and the order is marked Shipped.</p>
      <ol className="mt-2 space-y-1 text-sm text-ink-soft list-decimal pl-5">
        <li>In Delhivery One open <b>Settings → API and MCP Setup</b> and copy the <b>live API token</b>.</li>
        <li>Paste it below. Pickup name must match <b>Settings → Pickup Locations</b> exactly.</li>
      </ol>
      <form onSubmit={save} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input type="password" autoComplete="new-password" value={form.token} onChange={set('token')} placeholder={info.configured ? 'API token (leave blank to keep)' : 'Live API token'} className="input-field h-10 text-sm sm:col-span-2" required={!info.configured} />
        <input value={form.pickupLocation} onChange={set('pickupLocation')} placeholder="Pickup location name" className="input-field h-10 text-sm" />
        <input value={form.pickupPincode} onChange={set('pickupPincode')} inputMode="numeric" maxLength={6} placeholder="Pickup pincode" className="input-field h-10 text-sm" />
        <div className="sm:col-span-2 flex gap-2">
          <button disabled={saving} className="btn-primary h-10 px-4 text-sm">{saving ? 'Checking…' : 'Connect'}</button>
          {info.configured && <button type="button" onClick={() => setEditing(false)} className="btn-secondary h-10 px-4 text-sm">Cancel</button>}
        </div>
      </form>
      <p className="mt-2 text-xs text-ink-mute">The token is tested before saving, stored on the server and never shown again.</p>
    </div>
  );
};

export default DelhiveryCard;

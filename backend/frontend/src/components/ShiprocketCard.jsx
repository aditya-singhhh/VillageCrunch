import { useEffect, useState } from 'react';
import { Truck, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { getShiprocket, saveShiprocket } from '../utils/api';

/** Admin: connect Shiprocket once with an API user, so couriers can be booked from each order. */
const ShiprocketCard = () => {
  const [info, setInfo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', pickupLocation: 'Home', pickupPincode: '811212' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getShiprocket().then((i) => {
      setInfo(i);
      setForm((f) => ({ ...f, email: i.email || '', pickupLocation: i.pickupLocation || 'Home', pickupPincode: i.pickupPincode || '811212' }));
    }).catch(() => {});
  }, []);
  if (!info) return null;

  if (info.configured && !editing) {
    return (
      <p className="mb-6 flex flex-wrap items-center gap-2 text-sm text-leaf">
        <Check className="w-4 h-4" /> Shiprocket connected ({info.email}, pickup "{info.pickupLocation}" {info.pickupPincode}). Book couriers from each order's Manage window.
        <button type="button" onClick={() => setEditing(true)} className="underline text-ink-soft">Change</button>
      </p>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await saveShiprocket(form);
      setInfo(r);
      setForm((f) => ({ ...f, password: '' }));
      setEditing(false);
      toast.success('Shiprocket connected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not connect Shiprocket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-line bg-white p-4 md:p-5">
      <h2 className="font-semibold text-ink flex items-center gap-2"><Truck className="w-5 h-5 text-action" /> Connect Shiprocket</h2>
      <p className="mt-1 text-sm text-ink-soft">Then book a courier for any order in one tap: AWB, pickup and label are done for you, and the order is marked Shipped.</p>
      <ol className="mt-2 space-y-1 text-sm text-ink-soft list-decimal pl-5">
        <li>In Shiprocket open <b>Settings → API → Add New API User</b>.</li>
        <li>Use a <b>different email</b> from your login (e.g. a second Gmail) and set a password.</li>
        <li>Enter that email and password here. Pickup name must match your Shiprocket pickup address nickname.</li>
      </ol>
      <form onSubmit={save} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input type="email" autoComplete="off" value={form.email} onChange={set('email')} placeholder="API user email" className="input-field h-10 text-sm" required />
        <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} placeholder={info.configured ? 'Password (leave blank to keep)' : 'API user password'} className="input-field h-10 text-sm" required={!info.configured} />
        <input value={form.pickupLocation} onChange={set('pickupLocation')} placeholder="Pickup nickname (e.g. Home)" className="input-field h-10 text-sm" />
        <input value={form.pickupPincode} onChange={set('pickupPincode')} inputMode="numeric" maxLength={6} placeholder="Pickup pincode" className="input-field h-10 text-sm" />
        <div className="sm:col-span-2 flex gap-2">
          <button disabled={saving} className="btn-primary h-10 px-4 text-sm">{saving ? 'Checking…' : 'Connect'}</button>
          {info.configured && <button type="button" onClick={() => setEditing(false)} className="btn-secondary h-10 px-4 text-sm">Cancel</button>}
        </div>
      </form>
      <p className="mt-2 text-xs text-ink-mute">The login is tested before saving. The password is stored on the server and never shown again.</p>
    </div>
  );
};

export default ShiprocketCard;

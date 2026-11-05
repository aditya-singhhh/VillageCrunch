import { useEffect, useState } from 'react';
import { MessageCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { getWhatsApp, saveWhatsApp, createWhatsAppTemplates, testWhatsApp } from '../utils/api';

const STATUS_TEXT = { APPROVED: 'approved', PENDING: 'waiting for Meta', REJECTED: 'rejected', MISSING: 'not created' };

/** Admin: automatic WhatsApp updates (order placed, shipped, delivered). */
const WhatsAppCard = () => {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ phoneNumberId: '', wabaId: '', token: '', supportPhone: '' });
  const [busy, setBusy] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  const load = () => getWhatsApp({ status: 1 }).then((i) => {
    setInfo(i);
    setForm((f) => ({ ...f, phoneNumberId: i.phoneNumberId, wabaId: i.wabaId, supportPhone: i.supportPhone }));
  }).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!info) return null;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const run = async (fn, ok) => {
    setBusy(true);
    try { const r = await fn(); if (ok) toast.success(ok(r)); await load(); } catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); } finally { setBusy(false); }
  };
  const statuses = info.status || {};
  const allApproved = info.configured && Object.keys(info.templates).every((k) => statuses[k] === 'APPROVED');

  if (allApproved && !open) {
    return (
      <p className="mb-6 flex flex-wrap items-center gap-2 text-sm text-leaf">
        <Check className="w-4 h-4" /> WhatsApp updates are on: customers get a message when the order is placed, shipped and delivered.
        <button type="button" onClick={() => setOpen(true)} className="underline text-ink-soft">Settings</button>
      </p>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-line bg-white p-4 md:p-5">
      <h2 className="font-semibold text-ink flex items-center gap-2"><MessageCircle className="w-5 h-5 text-leaf" /> Automatic WhatsApp updates</h2>
      <p className="mt-1 text-sm text-ink-soft">Customers get a WhatsApp from <b>VillageCrunch</b> when the order is placed, shipped (with tracking) and delivered.</p>
      <ol className="mt-2 space-y-1 text-sm text-ink-soft list-decimal pl-5">
        <li>In <b>WhatsApp Manager</b> add your new number, then copy its <b>Phone number ID</b> and the <b>WhatsApp Business account ID</b>.</li>
        <li>In <b>Business settings → System users</b>, generate a permanent token with <b>whatsapp_business_messaging</b> and <b>whatsapp_business_management</b>.</li>
        <li>Save here, tap <b>Create message templates</b>, and wait for Meta to approve them (minutes to a few hours).</li>
      </ol>
      <form onSubmit={(e) => { e.preventDefault(); run(() => saveWhatsApp(form).then(() => setForm((f) => ({ ...f, token: '' }))), () => 'Saved'); }} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input value={form.phoneNumberId} onChange={set('phoneNumberId')} inputMode="numeric" placeholder="Phone number ID" className="input-field h-10 text-sm" />
        <input value={form.wabaId} onChange={set('wabaId')} inputMode="numeric" placeholder="WhatsApp Business account ID" className="input-field h-10 text-sm" />
        <input type="password" autoComplete="off" value={form.token} onChange={set('token')} placeholder={info.configured ? 'Token (leave blank to keep)' : 'Permanent access token'} className="input-field h-10 text-sm" />
        <input value={form.supportPhone} onChange={set('supportPhone')} inputMode="tel" placeholder="Your number for customer questions" className="input-field h-10 text-sm" />
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <button disabled={busy} className="btn-primary h-10 px-4 text-sm">Save</button>
          {info.configured && (
            <button type="button" disabled={busy} onClick={() => run(createWhatsAppTemplates, () => 'Templates sent to Meta for approval')} className="btn-secondary h-10 px-4 text-sm">Create message templates</button>
          )}
          {allApproved && <button type="button" onClick={() => setOpen(false)} className="btn-secondary h-10 px-4 text-sm">Close</button>}
        </div>
      </form>
      {info.configured && (
        <>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(info.templates).map(([k, t]) => (
              <li key={k} className="flex items-center gap-2">
                <span className="font-mono text-xs">{t.name}</span>
                <span className={statuses[k] === 'APPROVED' ? 'text-leaf' : statuses[k] === 'REJECTED' ? 'text-berry' : 'text-ink-mute'}>{STATUS_TEXT[statuses[k]] || statuses[k] || '…'}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); run(() => testWhatsApp(testPhone), () => 'Test message sent'); }} className="mt-3 flex flex-wrap gap-2">
            <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} inputMode="tel" placeholder="Your mobile, for a test" className="input-field h-10 text-sm flex-1 min-w-[180px]" />
            <button disabled={busy || statuses.placed !== 'APPROVED'} className="btn-secondary h-10 px-4 text-sm">Send test</button>
          </form>
        </>
      )}
      <p className="mt-2 text-xs text-ink-mute">The token is stored on the server and never shown again. If a message fails you get a phone alert to message the customer yourself.</p>
    </div>
  );
};

export default WhatsAppCard;

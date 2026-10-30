import { useEffect, useState } from 'react';
import { CreditCard, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPaymentWebhookInfo, getStuckPayments, reconcilePayments, createOrderForPayment } from '../utils/api';
import { formatINR } from '../utils/format';

const emptyAddress = { name: '', phone: '', street: '', city: '', state: '', pincode: '' };

/** One paid payment with no order: shows who paid and lets the admin enter the address. */
const StuckPayment = ({ item, onDone }) => {
  const [addr, setAddr] = useState(() => ({
    ...emptyAddress,
    name: item.customer?.name || '',
    phone: item.customer?.phone || '',
    ...(item.shippingAddress || {}),
  }));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setAddr((a) => ({ ...a, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await createOrderForPayment(item.id, addr);
      toast.success(`Order ${r.order?.orderNumber || ''} created`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create the order');
    } finally {
      setSaving(false);
    }
  };
  const phone = (item.customer?.phone || '').replace(/\D/g, '').slice(-10);
  return (
    <form onSubmit={submit} className="rounded-md border border-line p-3 bg-cream/40">
      <p className="text-sm text-ink">
        <b>{formatINR(item.amount)}</b> paid · {new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        {item.razorpayPaymentId && <span className="text-ink-mute"> · {item.razorpayPaymentId}</span>}
      </p>
      <p className="text-xs text-ink-soft mt-0.5">{(item.items || []).map((i) => `${i.name} x${i.quantity}`).join(', ')}</p>
      {phone && (
        <a className="text-xs text-action underline" target="_blank" rel="noreferrer"
          href={`https://wa.me/91${phone}?text=${encodeURIComponent(`Namaste! Aapka ${formatINR(item.amount)} payment VillageCrunch ko mil gaya hai. Bas apna delivery address bhej dijiye, hum taaza bana ke bhej denge.`)}`}>
          Ask for the address on WhatsApp
        </a>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[['name', 'Name'], ['phone', 'Phone'], ['street', 'House, street, area', 'col-span-2'], ['city', 'City'], ['state', 'State'], ['pincode', 'PIN code']].map(([k, label, cls]) => (
          <input key={k} value={addr[k] || ''} onChange={set(k)} placeholder={label} aria-label={label}
            className={`input-field h-10 text-sm ${cls || ''}`} required inputMode={k === 'pincode' || k === 'phone' ? 'numeric' : undefined} />
        ))}
      </div>
      <button disabled={saving} className="btn-primary h-10 px-4 text-sm mt-2">{saving ? 'Creating…' : 'Create order'}</button>
    </form>
  );
};

/**
 * Admin: (1) Razorpay webhook set-up so paid orders are never lost, (2) find payments that
 * were taken but never became orders, and create them.
 */
const PaymentRecoveryCard = () => {
  const [hook, setHook] = useState(null);
  const [stuck, setStuck] = useState([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('vc-webhook-done') !== '1'; } catch (_) { return true; } });

  const load = () => getStuckPayments().then((r) => setStuck(r.paidWithoutOrder || [])).catch(() => {});
  useEffect(() => { getPaymentWebhookInfo().then(setHook).catch(() => {}); load(); }, []);
  if (!hook && !stuck.length) return null;

  const check = async () => {
    setBusy(true);
    try {
      const r = await reconcilePayments();
      setStuck(r.paidWithoutOrder || []);
      const n = r.recovered?.length || 0;
      toast.success(n ? `${n} paid order(s) recovered` : (r.paidWithoutOrder?.length ? 'Found paid payments that need an address' : 'No stuck payments'));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not check payments');
    } finally {
      setBusy(false);
    }
  };
  const copy = (t) => { navigator.clipboard?.writeText(t); toast.success('Copied'); };
  const hide = () => { try { localStorage.setItem('vc-webhook-done', '1'); } catch (_) { /* ignore */ } setOpen(false); };

  return (
    <div className="mb-6 rounded-lg border border-line bg-white p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-ink flex items-center gap-2"><CreditCard className="w-5 h-5 text-action" /> Online payments</h2>
        <button onClick={check} disabled={busy} className="btn-secondary h-9 px-3 text-sm inline-flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Find stuck payments
        </button>
      </div>

      {stuck.length > 0 && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-desi-terracotta font-medium">These customers paid, but no order was created. Enter the address to create it.</p>
          {stuck.map((s) => <StuckPayment key={s.id} item={s} onDone={load} />)}
        </div>
      )}

      {hook && (open ? (
        <div className="mt-3 text-sm text-ink-soft">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-ink">One-time set-up: Razorpay webhook</p>
            <button onClick={hide} className="icon-btn -mt-1 -mr-2" aria-label="Hide"><X className="w-4 h-4" /></button>
          </div>
          <p className="mt-1">So an order is created even when the customer pays and never comes back to the site:</p>
          <ol className="mt-2 space-y-1 list-decimal pl-5">
            <li>Razorpay Dashboard → <b>Account &amp; Settings</b> → <b>Webhooks</b> → <b>Add new webhook</b>.</li>
            <li>Webhook URL:
              <span className="ml-1 inline-flex flex-wrap items-center gap-2"><code className="px-2 py-1 rounded bg-cream text-ink break-all">{hook.url}</code>
              <button onClick={() => copy(hook.url)} className="text-action underline">Copy</button></span></li>
            <li>Secret:
              <span className="ml-1 inline-flex flex-wrap items-center gap-2"><code className="px-2 py-1 rounded bg-cream text-ink break-all select-all">{hook.secret}</code>
              <button onClick={() => copy(hook.secret)} className="text-action underline">Copy</button></span></li>
            <li>Active events: tick <b>payment.captured</b> and <b>order.paid</b>, then <b>Create webhook</b>.</li>
          </ol>
          <p className="mt-2 text-xs text-ink-mute">Keep the secret private. Only Razorpay messages signed with it are accepted.</p>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-2 text-sm text-action">Show Razorpay webhook set-up</button>
      ))}
    </div>
  );
};

export default PaymentRecoveryCard;

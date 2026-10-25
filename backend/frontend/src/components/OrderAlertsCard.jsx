import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrderAlerts, testOrderAlert } from '../utils/api';

/** Admin: set up instant phone alerts for new orders (ntfy app). */
const OrderAlertsCard = () => {
  const [info, setInfo] = useState(null);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('vc-alerts-done') === '1'; } catch (_) { return false; } });
  useEffect(() => { getOrderAlerts().then(setInfo).catch(() => {}); }, []);
  if (!info) return null;

  const done = () => { try { localStorage.setItem('vc-alerts-done', '1'); } catch (_) { /* ignore */ } setHidden(true); };
  if (hidden) {
    return (
      <button onClick={() => setHidden(false)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-action">
        <Bell className="w-4 h-4" /> Order alerts setup
      </button>
    );
  }
  const test = async () => {
    const r = await testOrderAlert().catch(() => null);
    if (r?.ok) toast.success('Test alert sent. Check your phone.');
    else toast.error('Could not send the test alert.');
  };

  return (
    <div className="mb-6 rounded-lg border border-line bg-white p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-ink flex items-center gap-2"><Bell className="w-5 h-5 text-action" /> Get a phone alert for every new order</h2>
        <button onClick={done} className="icon-btn -mt-2 -mr-2" aria-label="Hide"><X className="w-5 h-5" /></button>
      </div>
      <ol className="mt-3 space-y-1.5 text-sm text-ink-soft list-decimal pl-5">
        <li>Install the free <b className="text-ink">ntfy</b> app (Play Store / App Store).</li>
        <li>On this phone, tap <a href={info.url} target="_blank" rel="noreferrer" className="text-action underline font-medium">Subscribe to order alerts</a>, or in the app tap <b>+</b> and enter this topic:</li>
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="px-3 py-2 rounded-md bg-cream text-ink text-sm break-all select-all">{info.topic}</code>
        <button onClick={() => { navigator.clipboard?.writeText(info.topic); toast.success('Copied'); }} className="btn-secondary h-10 px-3 text-sm">Copy</button>
        <button onClick={test} className="btn-primary h-10 px-4 text-sm">Send test alert</button>
      </div>
      <p className="mt-2 text-xs text-ink-mute">Keep this topic private. Alerts show the amount, items and city only, never phone numbers or addresses.</p>
    </div>
  );
};

export default OrderAlertsCard;

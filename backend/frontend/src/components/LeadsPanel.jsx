import { useEffect, useState } from 'react';
import { MessageCircle, Check, RefreshCw } from 'lucide-react';
import { getLeads, updateLead } from '../utils/api';
import { formatINR } from '../utils/format';

const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
};

const waText = (lead) => {
  const first = (lead.name || '').split(' ')[0];
  const item = lead.items?.[0]?.name || 'thekua';
  return `Namaste${first ? ` ${first}` : ''} 🙏 VillageCrunch se. Aapne ${item} cart mein rakha tha. Order aane pe hum taaza desi ghee mein banate hain, 1–2 din mein dispatch. Pehle order pe code FIRST se delivery free. Koi sawaal ho to yahin batayein! Order: https://villagecrunch.in/cart`;
};

/** Admin: people who typed their phone at checkout. Open = no order yet. */
const LeadsPanel = () => {
  const [leads, setLeads] = useState(null);
  const [show, setShow] = useState('open');
  const load = () => getLeads().then(setLeads).catch(() => setLeads([]));
  useEffect(() => { load(); }, []);

  const mark = async (lead, status) => {
    await updateLead(lead._id, status);
    load();
  };

  if (!leads) return <p className="text-ink-soft">Loading…</p>;
  const shown = leads.filter((l) => (show === 'all' ? true : l.status === show));
  const counts = ['open', 'contacted', 'converted'].map((s) => [s, leads.filter((l) => l.status === s).length]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[...counts, ['all', leads.length]].map(([s, n]) => (
          <button key={s} onClick={() => setShow(s)}
            className={`h-10 px-4 rounded-full border text-sm font-medium capitalize ${show === s ? 'bg-ink text-white border-ink' : 'bg-white border-line text-ink-soft'}`}>
            {s} ({n})
          </button>
        ))}
        <button onClick={load} className="h-10 px-3 inline-flex items-center gap-1 text-sm text-action"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>
      <p className="text-sm text-ink-soft mb-4">People who typed their mobile number at checkout. “Open” means they haven’t ordered yet: send them a friendly WhatsApp, then mark contacted.</p>
      {shown.length === 0 ? <p className="text-ink-mute">Nothing here yet.</p> : (
        <ul className="space-y-3">
          {shown.map((l) => (
            <li key={l._id} className="bg-white border border-line rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink">{l.name || 'No name yet'} · <span className="tabular-nums">+91 {l.phone}</span></p>
                <p className="text-sm text-ink-soft truncate">
                  {(l.items || []).map((i) => `${i.name} × ${i.quantity}`).join(', ') || 'Cart not captured'}
                  {l.total ? ` · ${formatINR(l.total)}` : ''}
                </p>
                <p className="text-xs text-ink-mute">{ago(l.lastSeenAt || l.createdAt)} · {l.source || 'web'} · <span className="capitalize">{l.status}</span></p>
              </div>
              {l.status !== 'converted' && (
                <div className="flex gap-2">
                  <a href={`https://wa.me/91${l.phone}?text=${encodeURIComponent(waText(l))}`} target="_blank" rel="noreferrer"
                    onClick={() => l.status === 'open' && mark(l, 'contacted')}
                    className="btn-primary h-10 px-4 text-sm"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                  {l.status === 'open' && (
                    <button onClick={() => mark(l, 'contacted')} className="btn-secondary h-10 px-3 text-sm"><Check className="w-4 h-4" /> Done</button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LeadsPanel;

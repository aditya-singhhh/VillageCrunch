import { useEffect, useState } from 'react';
import { Star, Check, RefreshCw } from 'lucide-react';
import { getFeedback, updateFeedback } from '../utils/api';

const LABEL = {
  perfect: 'Arrived perfect', some_broken: 'A few broken', many_broken: 'Many broken',
  yes: 'Will reorder', maybe: 'Maybe reorder', no: 'Won’t reorder',
};
const when = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Admin: answers from /feedback, newest first, with a quick summary. */
const FeedbackPanel = () => {
  const [rows, setRows] = useState(null);
  const load = () => getFeedback().then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  if (!rows) return <p className="text-ink-soft">Loading…</p>;

  const n = rows.length;
  const avg = n ? (rows.reduce((s, r) => s + r.rating, 0) / n).toFixed(1) : '–';
  const pct = (f) => (n ? `${Math.round((rows.filter(f).length / n) * 100)}%` : '–');

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[['Responses', n], ['Avg taste', avg], ['Arrived perfect', pct((r) => r.condition === 'perfect')], ['Will reorder', pct((r) => r.reorder === 'yes')]].map(([k, v]) => (
          <div key={k} className="bg-white border border-line rounded-lg p-3">
            <p className="text-xs text-ink-mute">{k}</p>
            <p className="text-xl font-semibold text-ink tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-ink-soft">Send every customer the same link after delivery: <span className="font-mono">villagecrunch.in/feedback</span></p>
        <button onClick={load} className="h-10 px-3 inline-flex items-center gap-1 text-sm text-action"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>
      {n === 0 ? <p className="text-ink-mute">No feedback yet.</p> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r._id} className={`bg-white border rounded-lg p-4 ${r.status === 'handled' ? 'border-line opacity-70' : r.rating <= 3 || r.condition === 'many_broken' ? 'border-red-300' : 'border-line'}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex" aria-label={`${r.rating} of 5`}>
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`w-4 h-4 ${i <= r.rating ? 'fill-desi-gold text-desi-gold' : 'text-line'}`} />)}
                </span>
                {r.condition && <span className="text-sm text-ink-soft">{LABEL[r.condition]}</span>}
                {r.reorder && <span className="text-sm text-ink-soft">· {LABEL[r.reorder]}</span>}
                <span className="text-xs text-ink-mute ml-auto">{when(r.createdAt)}{r.order ? ` · ${r.order}` : ''}{r.name ? ` · ${r.name}` : ''}{r.phone ? ` · +91 ${r.phone}` : ''}</span>
              </div>
              {r.comment && <p className="mt-2 text-ink">{r.comment}</p>}
              {r.images?.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.images.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="Customer photo" className="w-20 h-20 object-cover rounded border border-line" /></a>
                  ))}
                </div>
              )}
              {r.phone && r.status !== 'handled' && (
                <a href={`https://wa.me/91${r.phone}`} target="_blank" rel="noreferrer" className="mt-2 mr-2 inline-flex btn-primary h-9 px-3 text-sm">WhatsApp</a>
              )}
              {r.status !== 'handled' && (
                <button onClick={() => updateFeedback(r._id, 'handled').then(load)} className="mt-2 btn-secondary h-9 px-3 text-sm"><Check className="w-4 h-4" /> Mark handled</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FeedbackPanel;

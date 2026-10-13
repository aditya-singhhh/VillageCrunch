import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { downloadGharCsv, getGharClaims, getGharStatus, updateGharClaim } from '../utils/api';

/** Admin: review Chhath "Ghar" claims — approve, mark shipped/delivered, reject; download CSV for the courier. */
const STATUSES = ['pending', 'approved', 'shipped', 'delivered', 'rejected'];
const tone = {
  pending: 'bg-cream text-ink', approved: 'bg-leaf-tint text-leaf', shipped: 'bg-[#E3ECF7] text-[#1D4E89]',
  delivered: 'bg-leaf text-white', rejected: 'bg-berry-tint text-berry',
};

export default function AdminGhar() {
  const [type, setType] = useState('box');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([getGharClaims({ type, ...(status ? { status } : {}) }), getGharStatus()]);
      setRows(r);
      setStats(s);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load claims');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [type, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = async (id, patch) => {
    try {
      const updated = await updateGharClaim(id, patch);
      setRows((rs) => rs.map((r) => (r._id === id ? updated : r)));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    }
  };
  const csv = async () => {
    const blob = await downloadGharCsv(type);
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `ghar-${type}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-page py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin" className="text-sm text-action">← Admin</Link>
          <h1 className="font-display text-2xl font-semibold text-ink">Chhath “Ghar” campaign</h1>
          {stats && (
            <p className="text-sm text-ink-soft">
              Boxes: {stats.box.claimed}/{stats.box.total} claimed · {stats.box.leftNow} open right now · Letters written: {stats.chitthi.written}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {[['box', 'Boxes'], ['chitthi', 'Letters (chitthi)']].map(([v, l]) => (
            <button key={v} onClick={() => setType(v)} className={`px-3 py-2 rounded-md text-sm border ${type === v ? 'bg-ink text-white border-ink' : 'bg-white border-sand'}`}>{l}</button>
          ))}
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-md text-sm border border-sand bg-white">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={csv} className="btn-secondary text-sm">Download CSV</button>
        </div>
      </div>
      <p className="text-sm text-ink-mute mt-3">
        Check new entries once a day. Boxes: approve real ones, reject duplicates or fake addresses, then mark shipped. Letters: approve the ones to show on the wall, reject anything inappropriate.
      </p>

      {loading ? <p className="mt-6 text-ink-mute">Loading…</p> : rows.length === 0 ? <p className="mt-6 text-ink-mute">No claims yet.</p> : (
        <div className="mt-5 space-y-3">
          {rows.map((c) => {
            const a = c.address || {};
            return (
              <div key={c._id} className="rounded-lg bg-white border border-sand p-4 grid md:grid-cols-[1.3fr_1.3fr_1fr] gap-4">
                <div>
                  <p className="font-semibold text-ink">{c.name} {c.phone && <span className="text-ink-mute font-normal">· {c.phone}</span>}</p>
                  <p className="text-sm text-ink-soft">{c.city} · {c.reason} · {new Date(c.createdAt).toLocaleString('en-IN')}</p>
                  {c.story && <p className="text-sm mt-1 italic text-ink">“{c.story}”</p>}
                  <p className="text-xs text-ink-mute mt-1">Code {c.refCode}{c.nominatedBy ? ` · invited by ${c.nominatedBy}` : ''}</p>
                </div>
                <div className="text-sm text-ink-soft">
                  {c.type === 'box' ? (
                    <p>{a.street}, {a.city} {a.state} — <b>{a.pincode}</b></p>
                  ) : (
                    <>
                      {c.message && <p className="whitespace-pre-line text-ink">{c.message}</p>}
                      {c.videoLink && <a href={c.videoLink} target="_blank" rel="noopener noreferrer" className="text-action underline break-all">{c.videoLink}</a>}
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className={`self-start text-xs font-semibold px-2 py-1 rounded ${tone[c.status]}`}>{c.status}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.filter((s) => s !== c.status).map((s) => (
                      <button key={s} onClick={() => change(c._id, { status: s })} className="text-xs px-2 py-1 rounded border border-sand hover:bg-cream">{s}</button>
                    ))}
                  </div>
                  <label className="text-xs text-ink-soft flex items-center gap-2">
                    <input type="checkbox" checked={!!c.shareStory} onChange={(e) => change(c._id, { shareStory: e.target.checked })} /> show story on page
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

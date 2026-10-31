import { useEffect, useState } from 'react';
import { Megaphone, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMetaCapi, saveMetaCapi } from '../utils/api';

/** Admin: one-time set-up so every sale is reported to Meta from the server. */
const MetaCapiCard = () => {
  const [info, setInfo] = useState(null);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { getMetaCapi().then(setInfo).catch(() => {}); }, []);
  if (!info) return null;

  if (info.configured) {
    return (
      <p className="mb-6 inline-flex items-center gap-2 text-sm text-leaf">
        <Check className="w-4 h-4" /> Meta sales tracking is on: every order is reported to Meta (pixel {info.pixelId}).
      </p>
    );
  }

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await saveMetaCapi(token.trim());
      setInfo({ ...info, configured: r.configured });
      setToken('');
      toast.success(`Saved. ${r.backfill?.sent || 0} recent order(s) sent to Meta.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the token');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-line bg-white p-4 md:p-5">
      <h2 className="font-semibold text-ink flex items-center gap-2"><Megaphone className="w-5 h-5 text-action" /> Tell Meta about every sale</h2>
      <p className="mt-1 text-sm text-ink-soft">So ads learn who buys, even when the customer pays in another app and never returns to the site.</p>
      <ol className="mt-2 space-y-1 text-sm text-ink-soft list-decimal pl-5">
        <li>Open <b>Meta Events Manager</b> → your pixel (<b>{info.pixelId}</b>) → <b>Settings</b>.</li>
        <li>Under <b>Conversions API</b>, click <b>Generate access token</b> and copy it.</li>
        <li>Paste it here and save. Recent orders are sent to Meta straight away.</li>
      </ol>
      <form onSubmit={save} className="mt-3 flex flex-wrap gap-2">
        <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)}
          placeholder="Paste the access token" className="input-field h-10 text-sm flex-1 min-w-[220px]" required />
        <button disabled={saving} className="btn-primary h-10 px-4 text-sm">{saving ? 'Saving…' : 'Save'}</button>
      </form>
      <p className="mt-2 text-xs text-ink-mute">The token is stored on the server and never shown again. Customer phone, name and address are hashed before sending.</p>
    </div>
  );
};

export default MetaCapiCard;

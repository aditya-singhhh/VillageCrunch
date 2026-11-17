import { useContext, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Star, Camera, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import { sendFeedback, getMyOrders } from '../utils/api';

const CONDITION = [
  ['perfect', 'Perfect', 'Sab sahi'],
  ['some_broken', 'A few broken', 'Thode toote'],
  ['many_broken', 'Many broken', 'Kaafi toote'],
];
const REORDER = [
  ['yes', 'Yes', 'Haan'],
  ['maybe', 'Maybe', 'Shayad'],
  ['no', 'No', 'Nahi'],
];
const MAX_PHOTOS = 3;

const Choice = ({ options, value, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
    {options.map(([v, en, hi]) => (
      <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
        className={`min-h-[56px] rounded-lg border px-2 py-2 text-sm leading-tight transition-colors ${
          value === v ? 'bg-ink text-white border-ink' : 'bg-white border-line text-ink hover:border-ink-soft'}`}>
        <span className="block font-semibold">{en}</span>
        <span className={`block text-xs ${value === v ? 'text-white/80' : 'text-ink-mute'}`}>{hi}</span>
      </button>
    ))}
  </div>
);

/** Phone photos are 3–8 MB; shrink to ~1600 px JPEG before upload. */
const shrink = (file) => new Promise((resolve) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob((b) => resolve(b ? new File([b], 'photo.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.82);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

/**
 * /feedback — one link for every customer. They log in (phone OTP works for checkout
 * guests) and we pick their latest order. Three taps + optional note and photos.
 */
const Feedback = () => {
  const { user, loading } = useContext(AuthContext);
  const [orders, setOrders] = useState(null);
  const [orderId, setOrderId] = useState('');
  const [rating, setRating] = useState(0);
  const [condition, setCondition] = useState('');
  const [reorder, setReorder] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]); // { file, url }
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    getMyOrders().then((list) => {
      const arr = (Array.isArray(list) ? list : list?.orders || []).filter((o) => o.status !== 'cancelled');
      setOrders(arr);
      const latest = arr.find((o) => ['delivered', 'shipped'].includes(o.status)) || arr[0];
      if (latest) setOrderId(latest._id);
    }).catch(() => setOrders([]));
  }, [user]);
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="min-h-[70vh] bg-paper" aria-busy="true" />;
  if (!user) return <Navigate to="/login?redirect=/feedback" replace />;

  const addPhotos = async (e) => {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/')).slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    const shrunk = await Promise.all(files.map(shrink));
    setPhotos((p) => [...p, ...shrunk.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please tap the stars first'); return; }
    setSending(true); setError('');
    try {
      const fd = new FormData();
      fd.append('rating', String(rating));
      if (condition) fd.append('condition', condition);
      if (reorder) fd.append('reorder', reorder);
      if (comment.trim()) fd.append('comment', comment.trim());
      if (orderId) fd.append('orderId', orderId);
      photos.forEach((p) => fd.append('images', p.file));
      await sendFeedback(fd);
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send. Please try again.');
    } finally { setSending(false); }
  };

  const order = orders?.find((o) => o._id === orderId);

  return (
    <div className="bg-paper min-h-[70vh] py-10">
      <SEOHead title="Your feedback - VillageCrunch" description="Tell us how your VillageCrunch order was." url="/feedback" noIndex />
      <div className="max-w-md mx-auto px-4">
        {done ? (
          <div className="panel text-center p-6">
            <p className="text-4xl" aria-hidden="true">🙏</p>
            <h1 className="font-display text-2xl text-ink mt-2">Bahut shukriya!</h1>
            <p className="text-ink-soft mt-2">Aapki baat seedha humari kitchen tak pahunch gayi.</p>
            {rating >= 4 ? (
              <div className="mt-5 rounded-lg bg-leaf-tint p-4 text-left">
                <p className="text-ink font-semibold">Next order: ₹50 off on ₹399+</p>
                <p className="text-ink-soft text-sm mt-1">Use code <span className="font-bold tracking-wide">WAPAS50</span> at checkout.</p>
              </div>
            ) : (
              <p className="mt-5 text-sm text-ink-soft">Sorry it wasn&apos;t perfect. We&apos;ll WhatsApp you to make it right.</p>
            )}
            <Link to="/thekua" className="btn-primary w-full mt-6">Order again</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="panel p-5 sm:p-6 space-y-6">
            <div>
              <h1 className="font-display text-2xl text-ink">Kaisa laga thekua?</h1>
              <p className="text-ink-soft text-sm mt-1">3 taps, 20 seconds. It helps a small Bihar kitchen a lot.</p>
            </div>

            {orders && orders.length > 1 ? (
              <div>
                <label htmlFor="fb-order" className="field-label">Order</label>
                <select id="fb-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} className="input-field">
                  {orders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {(o.items || []).map((i) => i.name).join(', ').slice(0, 48)}
                    </option>
                  ))}
                </select>
              </div>
            ) : order ? (
              <p className="text-sm text-ink-soft">For your order of {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: {(order.items || []).map((i) => i.name).join(', ')}</p>
            ) : null}

            <fieldset>
              <legend className="field-label">1. Taste</legend>
              <div className="flex justify-between gap-1" role="radiogroup" aria-label="Rating out of 5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => { setRating(n); setError(''); }} className="p-1 min-w-[48px] min-h-[48px] flex items-center justify-center">
                    <Star className={`w-10 h-10 ${n <= rating ? 'fill-desi-gold text-desi-gold' : 'text-line'}`} strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="field-label">2. How did it arrive?</legend>
              <Choice label="Condition on arrival" options={CONDITION} value={condition} onChange={setCondition} />
            </fieldset>

            <fieldset>
              <legend className="field-label">3. Would you order again?</legend>
              <Choice label="Would you order again" options={REORDER} value={reorder} onChange={setReorder} />
            </fieldset>

            <div>
              <label htmlFor="fb-comment" className="field-label">Anything else? <span className="text-ink-mute font-normal">(optional)</span></label>
              <textarea id="fb-comment" rows="3" maxLength={600} value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Mithaas, crunch, packing… kuch bhi" className="input-field" />
            </div>

            <div>
              <p className="field-label">Photos <span className="text-ink-mute font-normal">(optional, up to {MAX_PHOTOS})</span></p>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={p.url} className="relative w-20 h-20">
                    <img src={p.url} alt={`Photo ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-line" />
                    <button type="button" aria-label={`Remove photo ${i + 1}`}
                      onClick={() => { URL.revokeObjectURL(p.url); setPhotos((all) => all.filter((x) => x !== p)); }}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="w-20 h-20 rounded-lg border border-dashed border-ink-soft flex flex-col items-center justify-center text-xs text-ink-soft cursor-pointer">
                    <Camera className="w-6 h-6 mb-1" /> Add photo
                    <input type="file" accept="image/*" multiple onChange={addPhotos} className="sr-only" />
                  </label>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={sending} className="btn-primary w-full">{sending ? 'Sending…' : 'Send feedback'}</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Feedback;

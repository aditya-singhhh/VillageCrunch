import { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star } from 'lucide-react';
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

/**
 * /feedback — three taps (stars, condition, would reorder) + an optional line.
 * One link for everyone (villagecrunch.in/feedback). Logged in: we pick their latest order.
 * Otherwise an optional mobile number lets the server link the order placed with it.
 * (?o=<order number> still works if a link carries it.)
 */
const Feedback = () => {
  const { user } = useContext(AuthContext);
  const [params] = useSearchParams();
  const [order, setOrder] = useState(params.get('o') || '');
  const [rating, setRating] = useState(0);
  const [condition, setCondition] = useState('');
  const [reorder, setReorder] = useState('');
  const [comment, setComment] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || order) return;
    getMyOrders().then((list) => {
      const arr = Array.isArray(list) ? list : list?.orders || [];
      const latest = arr.find((o) => ['delivered', 'shipped'].includes(o.status)) || arr[0];
      if (latest?.orderNumber) setOrder(latest.orderNumber);
    }).catch(() => {});
  }, [user, order]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please tap the stars first'); return; }
    setSending(true); setError('');
    try {
      await sendFeedback({ rating, condition, reorder, comment, order, name: user?.name, phone: order ? undefined : phone });
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send. Please try again.');
    } finally { setSending(false); }
  };

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
              <p className="mt-5 text-sm text-ink-soft">
                Sorry it wasn&apos;t perfect. Message us on{' '}
                <a className="text-action underline" href={`https://wa.me/916203009518?text=${encodeURIComponent(`Hi VillageCrunch, about my order ${order || ''}: `)}`} target="_blank" rel="noreferrer">WhatsApp</a>{' '}
                and we&apos;ll make it right.
              </p>
            )}
            <Link to="/thekua" className="btn-primary w-full mt-6">Order again</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="panel p-5 sm:p-6 space-y-6">
            <div>
              <h1 className="font-display text-2xl text-ink">Kaisa laga thekua?</h1>
              <p className="text-ink-soft text-sm mt-1">3 taps, 20 seconds. It helps a small Bihar kitchen a lot.</p>
            </div>

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

            {!order && (
              <div>
                <label htmlFor="fb-phone" className="field-label">Mobile number used for the order <span className="text-ink-mute font-normal">(optional)</span></label>
                <input id="fb-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} value={phone}
                  onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" className="input-field" />
                <p className="text-xs text-ink-mute mt-1">So we know which order this is about.</p>
              </div>
            )}

            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={sending} className="btn-primary w-full">{sending ? 'Sending…' : 'Send feedback'}</button>
            {order && <p className="text-xs text-ink-mute text-center">Order {order}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default Feedback;

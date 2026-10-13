import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Gift, Share2, Sun, Check, Loader2 } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { useAuth } from '../context/AuthContext';
import { claimGhar, getGharStatus, getMyGhar, postChitthi } from '../utils/api';
import { imgSrc } from '../utils/img';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';

/* ------------------------------------------------------------------ */
/* Chhath "Ghar" campaign — villagecrunch.in/ghar                       */
/* Free boxes from Bihar to people who can't go home this Chhath, and   */
/* a wall of letters to home (with Instagram video links).              */
/* ------------------------------------------------------------------ */

const SITE = 'https://villagecrunch.in';
// Put the real ghat recording at public/ghar/ghat-awaaz.mp3 and set this to true.
const GHAT_AUDIO = false;
const REASONS = [
  { id: 'ticket', label: 'Ticket waiting mein', icon: '🚆' },
  { id: 'flight', label: 'Flight bahut mehngi', icon: '✈️' },
  { id: 'leave', label: 'Chhutti nahi mili', icon: '💼' },
  { id: 'exams', label: 'Exams / padhai', icon: '📚' },
  { id: 'abroad', label: 'Desh se bahar hoon', icon: '🌍' },
  { id: 'other', label: 'Kuch aur', icon: '✍️' },
];
const reasonOf = (id) => REASONS.find((r) => r.id === id) || REASONS.at(-1);

const fmtTime = (ms) => {
  if (ms <= 0) return 'abhi';
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return h > 0 ? `${h} ghante ${m} min` : `${m} min`;
};
const dayName = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** Hand-drawn style dusk over the river: sun, water, ghat steps, floating diyas. */
const Dusk = ({ className = '' }) => (
  <svg viewBox="0 0 800 420" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
    <defs>
      <linearGradient id="gh-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2B1B33" />
        <stop offset=".45" stopColor="#7A2E2A" />
        <stop offset=".75" stopColor="#D8702E" />
        <stop offset="1" stopColor="#F2B45A" />
      </linearGradient>
      <linearGradient id="gh-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#E59A45" />
        <stop offset="1" stopColor="#5A2A26" />
      </linearGradient>
      <radialGradient id="gh-glow" cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor="#FFE3A3" stopOpacity=".9" />
        <stop offset="1" stopColor="#FFE3A3" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="800" height="420" fill="url(#gh-sky)" />
    <circle cx="560" cy="268" r="120" fill="url(#gh-glow)" />
    <circle cx="560" cy="268" r="58" fill="#FFD27A" />
    {/* far bank with trees */}
    <path d="M0 262 C60 250 90 256 130 248 C170 240 200 252 250 246 C300 240 330 250 380 247 C430 244 470 252 520 255 L800 258 L800 276 L0 276Z" fill="#3B1D1A" opacity=".85" />
    <rect y="274" width="800" height="146" fill="url(#gh-water)" />
    {/* sun's path on the water */}
    {Array.from({ length: 9 }, (_, i) => (
      <rect key={i} x={560 - (40 - i * 3)} y={286 + i * 13} width={(40 - i * 3) * 2} height="3" rx="1.5" fill="#FFD27A" opacity={0.75 - i * 0.07} />
    ))}
    {[[60, 300, 120], [210, 330, 160], [120, 372, 140], [330, 300, 90], [690, 320, 100], [650, 380, 120]].map(([x, y, w]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width={w} height="2" rx="1" fill="#FCE3B8" opacity=".35" />
    ))}
    {/* ghat steps */}
    <path d="M0 330 L170 330 L170 346 L0 346Z M0 346 L210 346 L210 362 L0 362Z M0 362 L250 362 L250 380 L0 380Z M0 380 L290 380 L290 420 L0 420Z" fill="#2E1712" opacity=".9" />
    {/* bamboo poles of the ghat */}
    <rect x="96" y="214" width="5" height="118" fill="#2E1712" />
    <rect x="150" y="226" width="5" height="106" fill="#2E1712" />
    {/* floating diyas */}
    {[[380, 342], [430, 368], [470, 336], [520, 390], [610, 356], [700, 384]].map(([x, y]) => (
      <g key={`${x}-${y}`}>
        <ellipse cx={x} cy={y + 4} rx="11" ry="4" fill="#5A2A1A" />
        <path d={`M${x} ${y - 10} c4 4 4 9 0 12 c-4 -3 -4 -8 0 -12z`} fill="#FFC94D" />
        <circle cx={x} cy={y - 2} r="12" fill="#FFC94D" opacity=".18" />
      </g>
    ))}
  </svg>
);

const Stat = ({ status }) => {
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (!status) return null;
  const b = status.box;
  let line;
  if (b.closed) line = 'Is Chhath ke saare dabbe ghar se nikal chuke hain. Shukriya. 🙏';
  else if (!b.started) line = `Pehle dabbe ${dayName(b.startsAt)} ko shaam 6 baje, suraj dhalte khulenge.`;
  else if (b.leftNow > 0) line = `Aaj ke ${b.leftNow} dabbe abhi baaki hain.`;
  else line = `Aaj ke dabbe khatam. Agle dabbe ${fmtTime(new Date(b.nextDropAt) - tick)} mein, shaam 6 baje.`;
  return (
    <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-white/10 border border-white/25 px-4 py-2 text-sm text-[#FCE9C8]">
      <span className="font-semibold text-white">{b.leftTotal} / {b.total} dabbe baaki</span>
      <span aria-hidden="true">·</span>
      <span>{line}</span>
    </div>
  );
};

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-ink mb-1">{label}</span>
    {children}
    {hint && <span className="block text-xs text-ink-mute mt-1">{hint}</span>}
  </label>
);
const inputCls = 'w-full rounded-md border border-sand bg-white px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-action/40';

const ReasonChips = ({ value, onChange, dark = false }) => (
  <div className="flex flex-wrap gap-2">
    {REASONS.map((r) => (
      <button key={r.id} type="button" onClick={() => onChange(r.id)} aria-pressed={value === r.id}
        className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${value === r.id
          ? 'bg-ink text-white border-ink'
          : dark ? 'bg-white/70 border-[#B9CBDA] text-ink hover:border-ink-mute' : 'bg-paper border-sand text-ink hover:border-ink-mute'}`}>
        <span aria-hidden="true">{r.icon}</span> {r.label}
      </button>
    ))}
  </div>
);

/** Free box claim (sign-in needed, one per person). */
function BoxForm({ status, onDone }) {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', reason: '', story: '', shareStory: true, street: '', acity: '', state: '', pincode: '' });
  useEffect(() => {
    if (!user) return;
    setF((x) => ({ ...x, name: x.name || user.name || '', phone: x.phone || (user.phone || '').replace(/\D/g, '').slice(-10) }));
  }, [user]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  if (!user) {
    const back = encodeURIComponent(`/ghar${location.search}#dabba`);
    return (
      <div className="rounded-lg bg-white border border-sand p-6 text-center">
        <p className="font-hand text-2xl text-ink">Pehle apna naam batayiye.</p>
        <p className="text-ink-soft mt-1">Ek account, ek dabba — taaki zyada logon tak ghar pahunche.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Link to={`/login?redirect=${back}`} className="btn-primary">Login</Link>
          <Link to={`/register?redirect=${back}`} className="btn-secondary">Naya account</Link>
        </div>
      </div>
    );
  }

  const blocked = status && (status.box.closed || !status.box.started || status.box.leftNow <= 0);
  const submit = async (e) => {
    e.preventDefault();
    if (!f.reason) { toast.error('Batayiye, is baar ghar kyun nahi ja paa rahe?'); return; }
    setBusy(true);
    try {
      const res = await claimGhar({
        name: f.name, phone: f.phone, city: f.acity, reason: f.reason, story: f.story, shareStory: f.shareStory,
        nominatedBy: params.get('from') || undefined,
        address: { street: f.street, city: f.acity, state: f.state, pincode: f.pincode },
      });
      onDone(res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kuch gadbad hui. Dobara koshish kijiye.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-lg bg-white border border-sand shadow-card p-5 md:p-7 space-y-5">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-cream inline-flex items-center justify-center"><Gift className="w-5 h-5 text-action" aria-hidden="true" /></span>
        <div>
          <p className="font-display font-semibold text-xl text-ink">Ghar se mera dabba</p>
          <p className="text-sm text-ink-mute">Bilkul free, delivery bhi. Bihar–Jharkhand ke bahar rehne walon ke liye.</p>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-ink mb-2">Is baar ghar kyun nahi ja paa rahe?</legend>
        <ReasonChips value={f.reason} onChange={(id) => setF((x) => ({ ...x, reason: id }))} />
      </fieldset>
      <Field label="Ek line mein, ghar ki sabse badi yaad (optional)" hint={`${f.story.length}/280`}>
        <textarea rows="2" maxLength={280} value={f.story} onChange={set('story')} className={`${inputCls} font-hand text-lg`}
          placeholder="Maa ke saath ghat pe daura uthana… teen saal ho gaye." />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Aapka naam"><input required value={f.name} onChange={set('name')} className={inputCls} autoComplete="name" /></Field>
        <Field label="Mobile number"><input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={f.phone} onChange={set('phone')} className={inputCls} autoComplete="tel-national" /></Field>
      </div>
      <Field label="Dabba kahan bhejein (poora pata)"><input required value={f.street} onChange={set('street')} className={inputCls} placeholder="Ghar/flat no., gali, area" autoComplete="street-address" /></Field>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Shehar"><input required value={f.acity} onChange={set('acity')} className={inputCls} autoComplete="address-level2" /></Field>
        <Field label="State"><input value={f.state} onChange={set('state')} className={inputCls} autoComplete="address-level1" /></Field>
        <Field label="PIN code"><input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={f.pincode} onChange={set('pincode')} className={inputCls} autoComplete="postal-code" /></Field>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink">
        <input type="checkbox" checked={f.shareStory} onChange={set('shareStory')} className="mt-1" />
        Meri yaad is page pe dikha sakte hain (sirf pehla naam aur shehar)
      </label>
      <button type="submit" disabled={busy || blocked} className="btn-primary w-full h-12 text-base disabled:opacity-60">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : 'Ghar se mera dabba bhejiye'}
      </button>
      {blocked && status && (
        <p className="text-sm text-center text-ink-mute">
          {status.box.closed ? 'Saare dabbe ja chuke hain. Neeche ghar ke naam ek chitthi likhiye.' : status.box.started ? 'Aaj ke dabbe khatam. Shaam 6 baje phir aaiye.' : 'Dabbe 19 Oct, shaam 6 baje khulenge. Tab tak ek chitthi likhiye.'}
        </p>
      )}
    </form>
  );
}

const shareText = (kind, link) => (kind === 'box'
  ? `Is Chhath ghar nahi ja paa raha/rahi, par ghar ka dabba aa raha hai 🙏 Agar tum bhi ghar se door ho, apna dabba yahan se mangwao (free hai): ${link}`
  : `Maine ghar ke naam ek chitthi likhi hai 🙏 Is Chhath ghar nahi ja paa rahe? Tum bhi likho: ${link}`);

function Done({ kind, refCode }) {
  const link = `${SITE}/ghar${refCode ? `?from=${refCode}` : ''}`;
  return (
    <div className="rounded-lg bg-white border border-sand shadow-card p-6 md:p-8 text-center">
      <span className="mx-auto w-14 h-14 rounded-full bg-leaf-tint inline-flex items-center justify-center"><Check className="w-7 h-7 text-leaf" aria-hidden="true" /></span>
      <p className="font-hand text-3xl text-ink mt-4">
        {kind === 'box' ? 'Aapka dabba ghar se nikalne wala hai.' : 'Aapki chitthi mil gayi.'}
      </p>
      <p className="text-ink-soft mt-2 max-w-md mx-auto">
        {kind === 'box'
          ? 'Hum ek-do din mein confirm karke bhej denge. Pahunchne mein 4–6 din lagenge. Dabba aaye, to 15 Nov ki shaam ka intezaar kijiye.'
          : 'Padhne ke baad hum ise is page ki deewar pe lagayenge. Kuch chitthiyan 15 Nov ki shaam hamare Instagram pe bhi aayengi.'}
      </p>
      <div className="mt-6 rounded-md bg-cream p-4">
        <p className="font-semibold text-ink">Kisi aur ko bhi ghar yaad aa raha hai?</p>
        <a className="btn-primary mt-3 inline-flex" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText(kind, link))}`}>
          <Share2 className="w-4 h-4" aria-hidden="true" /> WhatsApp pe bhejiye
        </a>
      </div>
    </div>
  );
}

/** A letter / memory for the wall (no sign-in needed, reviewed before it shows). */
function ChitthiForm({ onDone }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: '', city: '', reason: '', message: '', videoLink: '', website: '' });
  useEffect(() => { if (user?.name) setF((x) => ({ ...x, name: x.name || user.name })); }, [user]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await postChitthi(f);
      onDone(res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kuch gadbad hui. Dobara koshish kijiye.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="relative rounded-sm bg-[#DCE7F0] border border-[#B9CBDA] shadow-raised p-6 md:p-9 space-y-5">
      <span className="absolute -top-3 right-6 rotate-3 bg-[#B5402F] text-white text-[11px] tracking-widest px-2 py-1 rounded-sm">GHAR KE NAAM</span>
      <fieldset>
        <legend className="text-sm font-medium text-[#1F2E4A] mb-2">Is baar ghar kyun nahi ja paa rahe?</legend>
        <ReasonChips value={f.reason} onChange={(id) => setF((x) => ({ ...x, reason: id }))} dark />
      </fieldset>
      <label className="block">
        <span className="block text-sm font-medium text-[#1F2E4A] mb-1">Aapki chitthi</span>
        <textarea rows="7" maxLength={1200} value={f.message} onChange={set('message')}
          className="w-full rounded-sm border border-[#B9CBDA] px-4 py-3 font-hand text-[20px] leading-[34px] text-[#1F2E4A] focus:outline-none focus:ring-2 focus:ring-[#1F2E4A]/30"
          style={{ backgroundColor: '#EEF3F8', backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 33px, rgba(70,100,130,.18) 33px 34px)', backgroundAttachment: 'local' }}
          placeholder={'Maa,\nis baar nahi aa paya. Kharna ki kheer ki khushboo yahan tak aati hai…'} />
        <span className="block text-xs text-[#1F2E4A]/70 mt-1">{f.message.length}/1200 · Ghar ki koi yaad, Maa–Papa ke liye do shabd, ya Chhath ka koi pal.</span>
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-[#1F2E4A] mb-1">Apna video bhi hai? (optional)</span>
        <input type="url" value={f.videoLink} onChange={set('videoLink')} className={inputCls} placeholder="Instagram reel ya YouTube ka link — https://" />
        <span className="block text-xs text-[#1F2E4A]/70 mt-1">Instagram pe #EkSurajEkArghya ke saath post kijiye aur link yahan daaliye.</span>
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block"><span className="block text-sm font-medium text-[#1F2E4A] mb-1">Aapka naam</span><input required value={f.name} onChange={set('name')} className={inputCls} autoComplete="name" /></label>
        <label className="block"><span className="block text-sm font-medium text-[#1F2E4A] mb-1">Abhi kahan hain? (shehar)</span><input value={f.city} onChange={set('city')} className={inputCls} placeholder="Pune, Dubai, Bengaluru…" /></label>
      </div>
      {/* hidden from people; bots fill it */}
      <input type="text" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} className="hidden" aria-hidden="true" />
      <p className="text-xs text-[#1F2E4A]/70">Chitthi padhne ke baad is page pe lagegi — sirf aapka pehla naam aur shehar dikhega.</p>
      <button type="submit" disabled={busy} className="btn-primary w-full h-12 text-base disabled:opacity-60">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : 'Chitthi bhejiye'}
      </button>
    </form>
  );
}

const videoLabel = (url = '') => (/instagram/i.test(url) ? 'Instagram pe video dekhiye' : /youtu/i.test(url) ? 'YouTube pe video dekhiye' : 'Video dekhiye');

const LetterCard = ({ l, i }) => (
  <figure className={`break-inside-avoid rounded-sm bg-[#DCE7F0] border border-[#B9CBDA] p-5 shadow-card ${i % 3 === 0 ? 'rotate-[-0.8deg]' : i % 3 === 1 ? 'rotate-[0.6deg]' : ''}`}
    style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 29px, rgba(70,100,130,.16) 29px 30px)' }}>
    {l.message && <blockquote className="font-hand text-[19px] leading-[30px] text-[#1F2E4A] whitespace-pre-line">{l.message}</blockquote>}
    {l.videoLink && (
      <a href={l.videoLink} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-action underline underline-offset-2">
        ▶ {videoLabel(l.videoLink)}
      </a>
    )}
    <figcaption className="mt-3 text-sm text-[#1F2E4A]/75">— {l.name}{l.city ? `, ${l.city}` : ''} · {reasonOf(l.reason).icon} {reasonOf(l.reason).label}</figcaption>
  </figure>
);

const Ghar = () => {
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [letterDone, setLetterDone] = useState(null);
  const [mine, setMine] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    let alive = true;
    const load = () => getGharStatus().then((s) => alive && setStatus(s)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  useEffect(() => { if (user) getMyGhar().then(setMine).catch(() => {}); }, [user, result]);
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 300);
  }, []);

  const stories = useMemo(() => status?.stories || [], [status]);
  const letters = useMemo(() => status?.letters || [], [status]);

  return (
    <div className="bg-[#F7EFDF]">
      <SEOHead
        title="Ghar se door, is Chhath | Ek Suraj, Ek Arghya"
        description="Is Chhath ghar nahi ja paa rahe? Bihar se ghar ka ek dabba aapke paas — free, 300 dabbe, har shaam 6 baje. Aur ghar ke naam ek chitthi likhiye."
        keywords="Chhath 2026, ghar se door Chhath, Bihari away from home, thekua, Ek Suraj Ek Arghya"
        url="/ghar"
        type="website"
      />

      {/* 1. Dusk */}
      <section className="relative overflow-hidden text-white">
        <Dusk className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E1226]/70 via-[#1E1226]/30 to-transparent" aria-hidden="true" />
        <div className="relative container-page pt-14 pb-44 md:pt-20 md:pb-60">
          <p className="text-[13px] tracking-[0.25em] uppercase text-[#F7C98B]">Chhath 2026 · 13–16 November</p>
          <h1 className="font-display font-semibold text-[34px] leading-[1.1] md:text-[56px] max-w-3xl mt-4">
            Is baar ghat pe aapki jagah khali rahegi.
          </h1>
          <p className="mt-5 text-[17px] md:text-lg leading-relaxed max-w-2xl text-[#FCE9C8]">
            Ticket waiting mein reh gaya. Chhutti nahi mili. Ya ghar bas bahut door hai.
            Hum jaante hain ye kaisa lagta hai. Isliye is Chhath, <b className="text-white">ghar ka ek hissa hum aap tak bhejenge.</b>
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#dabba" className="btn-primary h-12 px-6 text-base">Ghar se dabba mangwaiye</a>
            <a href="#chitthi" className="inline-flex items-center justify-center h-12 px-6 rounded-md border border-white/60 text-white font-semibold hover:bg-white/10">Ghar ke naam chitthi likhiye</a>
          </div>
          <div className="mt-6"><Stat status={status} /></div>
        </div>
      </section>

      {/* 2. The letter */}
      <section className="container-page py-14 md:py-20">
        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-sm bg-[#DCE7F0] p-7 md:p-10 shadow-raised rotate-[-0.6deg] border border-[#B9CBDA]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 33px, rgba(70,100,130,.18) 33px 34px)' }}>
            <span className="absolute -top-3 right-6 rotate-3 bg-[#B5402F] text-white text-[11px] tracking-widest px-2 py-1 rounded-sm">GHAR SE</span>
            <div className="font-hand text-[21px] md:text-[23px] leading-[34px] text-[#1F2E4A]">
              <p>Beta,</p>
              <p className="mt-[34px]">Is baar bhi tum nahi aa paoge, pata hai. Koi baat nahi.</p>
              <p>Kharna ki kheer mein tumhare hisse ka gud alag rakh diya hai.</p>
              <p>Ghat pe tumhari jagah, main ek diya zyada jala dungi.</p>
              <p className="mt-[34px]">Sandhya arghya ke waqt, jahan bhi ho, ek baar suraj ki taraf dekh lena.</p>
              <p>Wahi suraj hai. Hum wahin milenge.</p>
              <p className="mt-[34px] text-right">— Maa</p>
            </div>
          </div>
          <p className="text-center text-sm text-ink-mute mt-6">Har us maa ki taraf se, jiska bachcha is Chhath ghar nahi aa paa raha.</p>
        </div>
      </section>

      {/* 3. Two bridges */}
      <section className="container-page pb-6 md:pb-10">
        <h2 className="font-display font-semibold text-[28px] md:text-[38px] text-ink text-center">Ghar aur aapke beech, ek pul</h2>
        <div className="grid md:grid-cols-2 gap-5 md:gap-7 mt-8">
          <article className="rounded-lg bg-white border border-sand overflow-hidden shadow-card">
            <img src={imgSrc('/packaging/real-thekua-mould.jpg', 800)} alt="Saanche mein bane thekua, tokri mein" width="800" height="800" loading="lazy" className="w-full aspect-[16/10] object-cover" />
            <div className="p-6">
              <p className="text-[13px] tracking-[0.2em] uppercase text-action font-semibold">Ghar se aapke paas</p>
              <h3 className="font-display font-semibold text-2xl text-ink mt-1">Ek dabba, Bihar se</h3>
              <ul className="mt-4 space-y-3 text-ink-soft">
                <li><b className="text-ink">Saanche wala thekua</b> — Khagaria mein, gud aur desi ghee se, haath se.</li>
                <li><b className="text-ink">Ek postcard</b> — Maa ko likhiye, jo phone pe nahi keh paate. Stamp lagaiye, daal dijiye.</li>
                <li><b className="text-ink">Ghat ki awaaz</b> — QR scan kijiye, aankhen band kijiye. Paani, ghanti, geet.</li>
                <li><b className="text-ink">Genda ke beej</b> — ghar ki mitti ki yaad, aapki balcony mein ugegi.</li>
              </ul>
              <p className="mt-4 text-sm text-ink-mute">Bilkul free, delivery bhi. Bihar–Jharkhand ke bahar rehne walon ke liye. Ek vyakti, ek dabba.</p>
            </div>
          </article>
          <article className="rounded-lg bg-white border border-sand overflow-hidden shadow-card">
            <div className="aspect-[16/10] bg-[#2B1B33] relative overflow-hidden">
              <Dusk className="absolute inset-0 w-full h-full opacity-90" />
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <p className="font-hand text-white text-[26px] md:text-[30px] leading-snug text-center drop-shadow">“Maa, is baar nahi aa paya.<br />Ghat pe mera diya jala dena.”</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-[13px] tracking-[0.2em] uppercase text-leaf font-semibold">Ghar ke naam</p>
              <h3 className="font-display font-semibold text-2xl text-ink mt-1">Ek chitthi likhiye</h3>
              <ul className="mt-4 space-y-3 text-ink-soft">
                <li><b className="text-ink">Jo Maa se phone pe nahi keh paate,</b> yahan likhiye. Ghar ki koi yaad, Chhath ka koi pal.</li>
                <li><b className="text-ink">Video banaya hai?</b> Instagram pe <b className="text-ink">#EkSurajEkArghya</b> ke saath daaliye, aur link yahan chhodiye.</li>
                <li>Chitthiyan is page ki <b className="text-ink">deewar pe</b> lagengi — ghar se door har Bihari padh sake ki woh akela nahi hai.</li>
              </ul>
              <p className="mt-4 text-sm text-ink-mute">Sabke liye khula hai, login ki zaroorat nahi. {status?.chitthi?.written ? `${status.chitthi.written} chitthiyan likhi ja chuki hain.` : ''}</p>
            </div>
          </article>
        </div>
      </section>

      {/* 4. How */}
      <section className="container-page py-10 md:py-14">
        <ol className="grid md:grid-cols-3 gap-4 md:gap-6">
          {[
            ['Batayiye', 'Is baar ghar kyun nahi ja paa rahe, aur ghar ki ek yaad.'],
            ['Suraj dhalne ka intezaar', 'Har shaam 6 baje naye dabbe khulte hain. 300 dabbe, 19 Oct se 6 Nov tak.'],
            ['Ghar aa jayega', '4–6 din mein dabba aap tak, Chhath se pehle. Saath mein Maa ke liye ek postcard.'],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-lg bg-paper border border-sand p-5">
              <span className="font-hand text-3xl text-action">{i + 1}</span>
              <p className="font-semibold text-ink mt-1">{t}</p>
              <p className="text-ink-soft text-[15px] mt-1">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. Claim */}
      <section id="dabba" className="container-page pb-14 md:pb-20 scroll-mt-24">
        <div className="max-w-2xl mx-auto">
          {mine.some((m) => m.type === 'box') && !result && (
            <p className="mb-4 rounded-md bg-leaf-tint text-leaf px-4 py-3 text-sm">
              Aapka dabba pehle hi book ho chuka hai. Shukriya 🙏 Ab ghar ke naam ek chitthi likhiye, ya kisi apne ko yeh page bhejiye.
            </p>
          )}
          {result ? <Done kind="box" refCode={result.refCode} /> : <BoxForm status={status} onDone={setResult} />}
        </div>
      </section>

      {/* 6. Write a letter */}
      <section id="chitthi" className="container-page pb-14 md:pb-20 scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-semibold text-[28px] md:text-[36px] text-ink text-center">Ghar ke naam ek chitthi</h2>
          <p className="text-center text-ink-soft mt-2 mb-8">Dabba mile ya na mile, chitthi har koi likh sakta hai.</p>
          {letterDone ? <Done kind="chitthi" /> : <ChitthiForm onDone={setLetterDone} />}
        </div>
      </section>

      {/* 7. The wall */}
      {(letters.length > 0 || stories.length > 0) && (
        <section className="bg-[#2B1B33] py-14 md:py-20">
          <div className="container-page">
            <h2 className="font-display font-semibold text-[28px] md:text-[38px] text-center text-white">Ghar se door, dil ghar pe</h2>
            <p className="text-center text-white/70 mt-2">Chitthiyan, ghar se door rehne walon ki.</p>
            {letters.length > 0 && (
              <div className="mt-8 columns-1 sm:columns-2 lg:columns-3 gap-5 [&>*]:mb-5">
                {letters.map((l, i) => <LetterCard key={l.id || i} l={l} i={i} />)}
              </div>
            )}
            {stories.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {stories.map((s, i) => (
                  <span key={i} className="rounded-full bg-white/[0.08] border border-white/15 px-4 py-2 text-sm text-[#FCE9C8]">
                    <span className="font-hand text-base">“{s.story}”</span> <span className="text-white/60">— {s.name}{s.city ? `, ${s.city}` : ''}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6b. Sound of the ghat (the QR on the box card opens this) */}
      <section id="awaaz" className="container-page py-14 md:py-16 scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[13px] tracking-[0.2em] uppercase text-action font-semibold">Ghat ki awaaz</p>
          <h2 className="font-display font-semibold text-[28px] md:text-[34px] text-ink mt-1">Aankhen band kijiye.</h2>
          <p className="text-ink-soft mt-3">Paani ki halki lehrein, door se aati ghanti, ghat pe log. Khagaria ke ek ghat se, aapke liye.</p>
          {GHAT_AUDIO ? (
            <audio controls preload="none" className="mx-auto mt-6 w-full max-w-md" src="/ghar/ghat-awaaz.mp3">
              Aapka browser audio nahi chala pa raha.
            </audio>
          ) : (
            <p className="font-hand text-xl text-ink mt-6">Ghat ki asli awaaz yahan 12 November se. 🙏</p>
          )}
        </div>
      </section>

      {/* 7. 15 Nov */}
      <section className="relative overflow-hidden text-white">
        <Dusk className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-[#1E1226]/55" aria-hidden="true" />
        <div className="relative container-page py-16 md:py-24 text-center">
          <Sun className="w-10 h-10 mx-auto text-[#FFD27A]" aria-hidden="true" />
          <p className="text-[13px] tracking-[0.25em] uppercase text-[#F7C98B] mt-3">15 November · Sandhya Arghya</p>
          <h2 className="font-display font-semibold text-[34px] md:text-[52px] mt-2">Ek Suraj. Ek Arghya.</h2>
          <p className="max-w-2xl mx-auto mt-4 text-[17px] leading-relaxed text-[#FCE9C8]">
            Us shaam, jahan bhi hon — terrace, balcony, office ki chhat, ya samundar kinare — suraj dhalte waqt uski taraf mudiye.
            Ek photo ya chhota video lijiye aur <b className="text-white">#EkSurajEkArghya</b> ke saath share kijiye.
            Us shaam laakhon Bihari, alag alag shehron se, ek hi suraj ko arghya denge.
          </p>
          <p className="font-hand text-2xl mt-6 text-[#FFD27A]">Ghar nahi pahunch paaye. Par suraj wahi tha.</p>
        </div>
      </section>

      {/* 8. FAQ */}
      <section className="container-page py-14 md:py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-semibold text-2xl md:text-3xl text-ink">Kuch sawaal</h2>
          {[
            ['Kya sach mein free hai?', 'Haan. Dabba aur delivery dono free hain. Koi payment nahi. Bas ek vyakti, ek dabba.'],
            ['Bihar mein rehne wale kyun nahi?', 'Dabbe un logon ke liye hain jo is Chhath ghar se door hain. Chitthi har koi likh sakta hai.'],
            ['Dabba kab aayega?', 'Har din ke dabbe hum 1–2 din mein confirm karke bhejte hain. Pahunchne mein 4–6 din. Aakhri dabbe 6 Nov tak, taaki Chhath se pehle pahunch jayein.'],
            ['Chitthi kahan dikhegi?', 'Padhne ke baad is page ki deewar pe, sirf aapke pehle naam aur shehar ke saath. Kuch chitthiyan 15 Nov ki shaam hamare Instagram pe bhi aayengi.'],
            ['Meri jaankari ka kya hoga?', 'Sirf dabba bhejne ke liye. Page pe sirf aapka pehla naam aur shehar dikh sakta hai, woh bhi aapki ijazat se.'],
          ].map(([q, a]) => (
            <details key={q} className="border-b border-sand py-4 group">
              <summary className="cursor-pointer font-semibold text-ink list-none flex justify-between gap-4">{q}<span className="text-action group-open:rotate-45 transition-transform" aria-hidden="true">+</span></summary>
              <p className="text-ink-soft mt-2">{a}</p>
            </details>
          ))}
          <p className="text-sm text-ink-mute mt-8">VillageCrunch, Khagaria, Bihar. Sawaal ho to <Link to="/contact" className="underline">humse baat kijiye</Link>.</p>
        </div>
      </section>
    </div>
  );
};

export default Ghar;

import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Share2, Check, Loader2 } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { useAuth } from '../context/AuthContext';
import { claimGhar, getGharStatus, getMyGhar } from '../utils/api';
import { imgSrc } from '../utils/img';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';

/* ------------------------------------------------------------------ */
/* Chhath "Ghar" campaign — villagecrunch.in/ghar                       */
/* Four quiet screens: dusk · Maa's letter · the box · take yours.      */
/* One feeling (you are not alone), one action (take a box from home). */
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
const fmtTime = (ms) => {
  if (ms <= 0) return 'abhi';
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return h > 0 ? `${h} ghante ${m} min` : `${m} min`;
};
const dayName = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

const Dusk = ({ className = '', viewBox = '0 0 800 420' }) => {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
  <svg viewBox={viewBox} className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
    <defs>
      <linearGradient id={`sky${u}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2B1B33" />
        <stop offset=".45" stopColor="#7A2E2A" />
        <stop offset=".75" stopColor="#D8702E" />
        <stop offset="1" stopColor="#F2B45A" />
      </linearGradient>
      <linearGradient id={`water${u}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#E59A45" />
        <stop offset="1" stopColor="#5A2A26" />
      </linearGradient>
      <radialGradient id={`glow${u}`} cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor="#FFE3A3" stopOpacity=".9" />
        <stop offset="1" stopColor="#FFE3A3" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="800" height="420" fill={`url(#sky${u})`} />
    <circle cx="560" cy="268" r="120" fill={`url(#glow${u})`} />
    <circle cx="560" cy="268" r="58" fill="#FFD27A" />
    {/* far bank with trees */}
    <path d="M0 262 C60 250 90 256 130 248 C170 240 200 252 250 246 C300 240 330 250 380 247 C430 244 470 252 520 255 L800 258 L800 276 L0 276Z" fill="#3B1D1A" opacity=".85" />
    <rect y="274" width="800" height="146" fill={`url(#water${u})`} />
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
};

/** Quiet one-line status under the button. */
const Counter = ({ status }) => {
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (!status) return null;
  const b = status.box;
  let line;
  if (b.closed) line = 'Is Chhath ke saare dabbe ghar se nikal chuke hain 🙏';
  else if (!b.started) line = `${b.total} dabbe · ${dayName(b.startsAt)}, shaam 6 baje se`;
  else if (b.leftNow > 0) line = `${b.leftTotal} dabbe baaki · aaj ke ${b.leftNow} abhi khule hain`;
  else line = `${b.leftTotal} dabbe baaki · agle ${fmtTime(new Date(b.nextDropAt) - tick)} mein, shaam 6 baje`;
  return <p className="text-sm text-[#FCE9C8]/85 tracking-wide">{line}</p>;
};

const inputCls = 'w-full rounded-md border border-sand bg-white px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-action/40';
const Field = ({ label, children }) => (
  <label className="block"><span className="block text-sm text-ink-soft mb-1">{label}</span>{children}</label>
);

function BoxForm({ status, onDone }) {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ reason: '', story: '', name: '', phone: '', street: '', city: '', state: '', pincode: '' });
  useEffect(() => {
    if (!user) return;
    setF((x) => ({ ...x, name: x.name || user.name || '', phone: x.phone || (user.phone || '').replace(/\D/g, '').slice(-10) }));
  }, [user]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  if (!user) {
    const back = encodeURIComponent(`/ghar${location.search}#dabba`);
    return (
      <div className="text-center">
        <p className="text-ink-soft">Ek account, ek dabba — taaki zyada logon tak ghar pahunche.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link to={`/login?redirect=${back}`} className="btn-primary h-12 px-7">Login karke lijiye</Link>
          <Link to={`/register?redirect=${back}`} className="btn-secondary h-12 px-6">Naya account</Link>
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
        name: f.name, phone: f.phone, city: f.city, reason: f.reason, story: f.story, shareStory: true,
        nominatedBy: params.get('from') || undefined,
        address: { street: f.street, city: f.city, state: f.state, pincode: f.pincode },
      });
      onDone(res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kuch gadbad hui. Dobara koshish kijiye.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 text-left">
      <fieldset>
        <legend className="text-sm text-ink-soft mb-2">Is baar ghar kyun nahi ja paa rahe?</legend>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button key={r.id} type="button" onClick={() => setF((x) => ({ ...x, reason: r.id }))} aria-pressed={f.reason === r.id}
              className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${f.reason === r.id ? 'bg-ink text-white border-ink' : 'bg-white border-sand text-ink hover:border-ink-mute'}`}>
              <span aria-hidden="true">{r.icon}</span> {r.label}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Ghar ki ek yaad, ek line mein (optional)">
        <input maxLength={140} value={f.story} onChange={set('story')} className={`${inputCls} font-hand text-lg`} placeholder="Maa ke saath ghat pe daura uthana…" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Naam"><input required value={f.name} onChange={set('name')} className={inputCls} autoComplete="name" /></Field>
        <Field label="Mobile"><input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={f.phone} onChange={set('phone')} className={inputCls} autoComplete="tel-national" /></Field>
      </div>
      <Field label="Pata"><input required value={f.street} onChange={set('street')} className={inputCls} placeholder="Ghar/flat no., gali, area" autoComplete="street-address" /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Shehar"><input required value={f.city} onChange={set('city')} className={inputCls} autoComplete="address-level2" /></Field>
        <Field label="State"><input value={f.state} onChange={set('state')} className={inputCls} autoComplete="address-level1" /></Field>
        <Field label="PIN"><input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={f.pincode} onChange={set('pincode')} className={inputCls} autoComplete="postal-code" /></Field>
      </div>
      <button type="submit" disabled={busy || blocked} className="btn-primary w-full h-12 text-base disabled:opacity-60">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : 'Ghar se mera dabba bhejiye'}
      </button>
      <p className="text-xs text-center text-ink-mute">
        {blocked && status
          ? status.box.closed ? 'Saare dabbe ja chuke hain.' : status.box.started ? 'Aaj ke dabbe khatam — shaam 6 baje phir aaiye.' : 'Dabbe 19 Oct, shaam 6 baje khulenge.'
          : 'Free, delivery bhi · Bihar–Jharkhand ke bahar ke pate · ek vyakti, ek dabba'}
      </p>
    </form>
  );
}

function Done({ refCode }) {
  const link = `${SITE}/ghar?from=${refCode}`;
  const text = `Is Chhath ghar nahi ja paa raha/rahi, par ghar ka ek dabba aa raha hai 🙏 Agar tum bhi ghar se door ho, apna yahan se mangwao — free hai: ${link}`;
  return (
    <div className="text-center">
      <span className="mx-auto w-14 h-14 rounded-full bg-leaf-tint inline-flex items-center justify-center"><Check className="w-7 h-7 text-leaf" aria-hidden="true" /></span>
      <p className="font-hand text-3xl text-ink mt-4">Aapka dabba ghar se nikalne wala hai.</p>
      <p className="text-ink-soft mt-2">4–6 din mein pahunchega. 15 Nov ki shaam, suraj dhalte, ek baar uski taraf dekhiyega.</p>
      <p className="font-medium text-ink mt-8">Kisi aur ko bhi ghar yaad aa raha hai?</p>
      <a className="btn-primary mt-3 inline-flex" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>
        <Share2 className="w-4 h-4" aria-hidden="true" /> Unhe bhejiye
      </a>
    </div>
  );
}

/** Other people's one-line memories drifting by. */
const Memories = ({ stories }) => {
  if (stories.length < 3) return null;
  const row = [...stories, ...stories];
  return (
    <div className="relative overflow-hidden mt-14 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]" aria-label="Ghar se door logon ki yaadein">
      <div className="flex gap-10 w-max animate-[gharDrift_70s_linear_infinite] motion-reduce:animate-none">
        {row.map((s, i) => (
          <p key={i} className="whitespace-nowrap text-ink-soft">
            <span className="font-hand text-[19px] text-ink">“{s.story}”</span>
            <span className="text-sm"> — {s.name}{s.city ? `, ${s.city}` : ''}</span>
          </p>
        ))}
      </div>
      <style>{'@keyframes gharDrift{from{transform:translateX(0)}to{transform:translateX(-50%)}}'}</style>
    </div>
  );
};

const Ghar = () => {
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
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
  const stories = useMemo(() => (status?.stories || []).filter((s) => s.story), [status]);
  const already = mine.find((m) => m.type === 'box');

  return (
    <div className="bg-[#F7EFDF]">
      <SEOHead
        title="Ghar se door, is Chhath | Ek Suraj, Ek Arghya"
        description="Is Chhath ghar nahi ja paa rahe? Ghar ka ek hissa, aapke paas — Bihar se ek dabba, free. 300 dabbe, har shaam 6 baje."
        keywords="Chhath 2026, ghar se door Chhath, Bihari away from home, thekua, Ek Suraj Ek Arghya"
        url="/ghar"
        type="website"
      />

      {/* 1. Dusk */}
      <section className="relative overflow-hidden text-white min-h-[86vh] flex items-end">
        <Dusk className="absolute inset-0 w-full h-full hidden md:block" />
        <Dusk className="absolute inset-0 w-full h-full md:hidden" viewBox="330 0 400 420" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E1226]/75 via-[#1E1226]/25 to-[#1E1226]/10" aria-hidden="true" />
        <div className="relative container-page pb-[38vh] md:pb-[34vh] pt-24">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[#F7C98B]">Chhath · 13–16 November</p>
          <h1 className="font-display font-semibold text-[36px] leading-[1.1] md:text-[60px] max-w-3xl mt-4">Is baar ghat pe aapki jagah khali rahegi.</h1>
          <p className="font-hand text-[22px] md:text-[26px] text-[#FFE3A3] mt-4">Ghar ka ek hissa, aapke paas. Free.</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#dabba" className="btn-primary h-12 px-7 text-base">Ghar se dabba mangwaiye</a>
            <Counter status={status} />
          </div>
        </div>
      </section>

      {/* 2. Maa's letter */}
      <section className="container-page py-24 md:py-32">
        <div className="max-w-xl mx-auto relative rounded-sm bg-[#DCE7F0] p-8 md:p-11 shadow-raised rotate-[-0.6deg] border border-[#B9CBDA]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 33px, rgba(70,100,130,.18) 33px 34px)' }}>
          <div className="font-hand text-[22px] md:text-[24px] leading-[34px] text-[#1F2E4A]">
            <p>Beta,</p>
            <p className="mt-[34px]">Pata hai, is baar bhi nahi aa paoge. Koi baat nahi.</p>
            <p>Ghat pe tumhari jagah, ek diya zyada jala dungi.</p>
            <p>Sandhya arghya pe, jahan bhi ho, suraj ki taraf dekh lena.</p>
            <p>Wahi suraj hai. Hum wahin milenge.</p>
            <p className="mt-[34px] text-right">— Maa</p>
          </div>
        </div>
      </section>

      {/* 3. The box */}
      <section className="container-page pb-24 md:pb-32">
        <figure className="max-w-3xl mx-auto">
          <img src={imgSrc('/packaging/ghar-box.jpg', 1200)} alt="Ghar ka dabba: thekua, Maa ke liye postcard, genda ke beej aur ghat ki awaaz ka QR"
            width="1200" height="800" loading="lazy" decoding="async" className="w-full rounded-lg shadow-card" />
          <figcaption className="text-center mt-6 font-hand text-[22px] md:text-[26px] text-ink">
            Khagaria se saanche wala thekua, Maa ke liye ek postcard, aur ghat ki awaaz.
          </figcaption>
        </figure>
      </section>

      {/* 4. Take yours */}
      <section id="dabba" className="container-page pb-24 md:pb-28 scroll-mt-20">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display font-semibold text-[30px] md:text-[38px] text-ink text-center mb-8">Apna dabba lijiye</h2>
          {result || already ? <Done refCode={(result || already).refCode} /> : <BoxForm status={status} onDone={setResult} />}
        </div>
        <Memories stories={stories} />
      </section>

      {/* quiet footer: the 15 Nov ending + the ghat sound the box QR opens */}
      <section id="awaaz" className="border-t border-sand/70 py-12 scroll-mt-20">
        <div className="container-page max-w-2xl text-center">
          <p className="text-ink-soft">
            <b className="text-ink">15 November, suraj dhalte waqt</b> — jahan bhi hon, ek baar suraj ki taraf mudiye.
            Wahi suraj, wahi arghya. <span className="whitespace-nowrap">#EkSurajEkArghya</span>
          </p>
          {GHAT_AUDIO ? (
            <audio controls preload="none" className="mx-auto mt-6 w-full max-w-md" src="/ghar/ghat-awaaz.mp3">Ghat ki awaaz</audio>
          ) : (
            <p className="text-sm text-ink-mute mt-3">Ghat ki awaaz yahan 12 November se. Khagaria, Bihar se. 🙏</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Ghar;

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Gift, Loader2, Truck } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import ProductCard from '../components/ProductCard';
import { getProducts, submitContactForm } from '../utils/api';
import { imgSrc } from '../utils/img';

/* Diwali gifting: personal gift boxes + office/bulk enquiries. */
const LAST_ORDER = '3 November';
const TIERS = [
  ['25 – 49 boxes', 'Heritage ₹899 · Healthy ₹799'],
  ['50 – 99 boxes', 'Heritage ₹849 · Healthy ₹749'],
  ['100+ boxes', 'Heritage ₹799 · Healthy ₹699'],
];

export default function Diwali() {
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({ name: '', company: '', email: '', phone: '', qty: '', city: '', note: '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    getProducts().then((d) => setProducts(Array.isArray(d) ? d : d.products || [])).catch(() => {});
  }, []);
  const boxes = useMemo(() => {
    const gifts = products.filter((p) => p.category === 'gifts').sort((a, b) => (a.packOrder || 0) - (b.packOrder || 0));
    const thekuaBox = products.find((p) => p.category === 'thekua' && /gift box/i.test(p.name));
    return [...gifts, ...(thekuaBox ? [thekuaBox] : [])];
  }, [products]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitContactForm({
        name: f.name,
        email: f.email,
        phone: f.phone,
        subject: `Corporate Diwali gifting: ${f.company || f.name} (${f.qty || '?'} boxes)`,
        message: `Company: ${f.company}\nBoxes: ${f.qty}\nDeliver to: ${f.city}\n\n${f.note}`,
      });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send. Please WhatsApp us instead.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full rounded-md border border-sand bg-white px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-action/40';

  return (
    <div className="bg-paper">
      <SEOHead
        title="Diwali Gift Boxes from Bihar"
        description="Diwali gift boxes with thekua, makhana and a clay diya in a Madhubani-style keepsake box. Personal gifts and office gifting from 25 boxes. Order by 3 November."
        keywords="Diwali gift box, corporate Diwali gifts, healthy Diwali gift, makhana gift box, thekua gift, Madhubani gift box"
        url="/diwali"
        type="website"
      />

      <section className="bg-[#5C1A1B] text-white">
        <div className="container-page py-10 md:py-14 grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div>
            <p className="text-[13px] tracking-[0.25em] uppercase text-[#E9C77F]">Diwali 2026 · 8 November</p>
            <h1 className="font-display font-semibold text-[34px] md:text-[50px] leading-[1.08] mt-3">Is baar kaju katli nahi.<br />Bihar ka tohfa dijiye.</h1>
            <p className="mt-4 text-[17px] text-white/85 max-w-xl">
              Thekua, makhana aur ek mitti ka diya — Madhubani-style art wale ek dabbe mein jo log sambhaal kar rakhte hain.
              Apna sandesh likhiye, hum card pe chhaap kar seedha unke ghar bhejenge.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#boxes" className="btn-primary h-12 px-6 text-base">Gift box chuniye</a>
              <a href="#office" className="inline-flex items-center justify-center h-12 px-6 rounded-md border border-white/60 font-semibold hover:bg-white/10">Office ke liye (25+)</a>
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-[#E9C77F]"><Truck className="w-4 h-4" aria-hidden="true" /> Diwali se pehle delivery ke liye {LAST_ORDER} tak order kijiye</p>
          </div>
          <img src={imgSrc('/packaging/gift-heritage.jpg', 1200)} alt="Bihar Heritage Gift Box with thekua, makhana, a clay diya and a card"
            width="1200" height="1200" className="w-full rounded-lg shadow-raised" />
        </div>
      </section>

      <section id="boxes" className="container-page py-10 md:py-14 scroll-mt-20">
        <h2 className="font-display font-semibold text-[26px] md:text-[34px] text-ink">Gift boxes</h2>
        <p className="text-ink-soft mt-1">Checkout pe “Yeh ek tohfa hai” chuniye aur apna sandesh likhiye. Dabbe mein price nahi hota.</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 max-w-5xl">
          {boxes.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
        <ul className="mt-8 grid sm:grid-cols-3 gap-4 max-w-5xl">
          {[
            ['Madhubani-style art', 'Bihar ki lok-kala se prerit, hamara apna design — dabba baad mein bhi kaam aata hai.'],
            ['Ek mitti ka diya', 'Har dabbe mein, Diwali ki shaam jalane ke liye.'],
            ['Aapka sandesh', 'Card pe chhaap kar, seedha unke ghar tak.'],
          ].map(([t, d]) => (
            <li key={t} className="rounded-lg bg-white border border-sand p-4">
              <p className="font-semibold text-ink flex items-center gap-2"><Gift className="w-4 h-4 text-action" aria-hidden="true" /> {t}</p>
              <p className="text-sm text-ink-soft mt-1">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="office" className="bg-cream py-10 md:py-14 scroll-mt-20">
        <div className="container-page grid md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <p className="text-[13px] tracking-[0.2em] uppercase text-action font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" aria-hidden="true" /> Office &amp; bulk gifting</p>
            <h2 className="font-display font-semibold text-[26px] md:text-[34px] text-ink mt-2">Dry fruit ke dabbon se alag, yaad rehne wala tohfa</h2>
            <p className="text-ink-soft mt-3">
              Team, clients ya partners ke liye. Har dabbe mein aapki company ka naam aur sandesh, ek card pe.
              Hum har pate pe alag-alag bhi bhej sakte hain.
            </p>
            <table className="mt-6 w-full text-left text-[15px]">
              <thead><tr className="border-b border-sand text-ink-mute text-sm"><th className="py-2 font-medium">Quantity</th><th className="py-2 font-medium">Price per box</th></tr></thead>
              <tbody>
                {TIERS.map(([q, p]) => (
                  <tr key={q} className="border-b border-sand/70"><td className="py-2.5 text-ink font-medium">{q}</td><td className="py-2.5 text-ink-soft">{p}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-ink-mute mt-3">Prices include the company card. Delivery is quoted separately for many addresses. Confirm orders by 25 Oct for Diwali delivery.</p>
          </div>
          <div className="rounded-lg bg-white border border-sand p-5 md:p-7 shadow-card">
            {sent ? (
              <div className="text-center py-8">
                <p className="font-display text-2xl text-ink">Shukriya! 🙏</p>
                <p className="text-ink-soft mt-2">Hum 24 ghante mein aapse sampark karenge, sample aur quote ke saath.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <p className="font-semibold text-ink">Quote aur free sample ke liye</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input required placeholder="Aapka naam" value={f.name} onChange={set('name')} className={input} autoComplete="name" />
                  <input required placeholder="Company" value={f.company} onChange={set('company')} className={input} autoComplete="organization" />
                  <input required type="email" placeholder="Email" value={f.email} onChange={set('email')} className={input} autoComplete="email" />
                  <input required inputMode="numeric" maxLength={10} placeholder="Mobile" value={f.phone} onChange={set('phone')} className={input} autoComplete="tel-national" />
                  <input required inputMode="numeric" placeholder="Kitne dabbe? (approx.)" value={f.qty} onChange={set('qty')} className={input} />
                  <input placeholder="Delivery city / cities" value={f.city} onChange={set('city')} className={input} />
                </div>
                <textarea rows="3" placeholder="Kuch aur? (Heritage ya Healthy, delivery date, card message…)" value={f.note} onChange={set('note')} className={input} />
                <button type="submit" disabled={busy} className="btn-primary w-full h-12 disabled:opacity-60">
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : 'Quote mangwaiye'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

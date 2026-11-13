import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { getProducts } from '../utils/api';

/*
 * /thekua: the page we want to rank for "buy thekua online", "desi ghee thekua", "bihari thekua".
 * Plain, honest content about what thekua is and how ours is made, live prices from the
 * product list, and an FAQ marked up for Google.
 */
const FAQ = [
  {
    q: 'What is thekua?',
    a: 'Thekua is a traditional sweet from Bihar and Jharkhand, made from whole-wheat atta and gud (jaggery) or sugar, shaped in a wooden mould and fried. It is best known as the main offering of Chhath Puja, and families in Bihar make it all year as a crunchy, long-lasting snack.',
  },
  {
    q: 'What is the difference between Shuddh Desi Ghee and Regular thekua?',
    a: 'Shuddh Desi Ghee thekua has desi ghee in the dough and is fried only in desi ghee, with no oil. Regular thekua also has desi ghee in the dough but is fried in refined vegetable oil, which keeps the price lower.',
  },
  {
    q: 'Gud or cheeni: which should I choose?',
    a: 'Gud (jaggery) thekua is the traditional Chhath style, with a deeper caramel taste and darker colour. Cheeni (sugar) thekua is lighter in colour and taste. Both use the same quantity of sweetener.',
  },
  {
    q: 'What goes into your thekua?',
    a: 'Whole-wheat atta, gud or cheeni, desi ghee, suji, dry coconut, saunf and elaichi. No maida and no preservatives. The Regular version is fried in refined vegetable oil.',
  },
  {
    q: 'Where is it made?',
    a: 'In our kitchen in Munger, Bihar, in small batches, and packed in airtight pouches.',
  },
  {
    q: 'Do you deliver thekua across India?',
    a: 'Yes. We ship through Delhivery to most PIN codes in India, including Mumbai, Bangalore, Delhi, Pune, Hyderabad and Kolkata. Enter your PIN on any product page to see the expected delivery dates.',
  },
  {
    q: 'How long does thekua stay fresh?',
    a: 'Thekua has very little moisture, so it keeps well. Store it in an airtight jar away from humidity and eat it before the best-before date printed on the pack.',
  },
];

const VERSIONS = [
  { name: 'Shuddh Desi Ghee · Gud', note: 'Fried in pure desi ghee, no oil. Traditional jaggery taste.', variant: 'shuddh', sweet: 'gud' },
  { name: 'Shuddh Desi Ghee · Cheeni', note: 'Fried in pure desi ghee, sweetened with sugar.', variant: 'shuddh', sweet: 'cheeni' },
  { name: 'Regular · Gud', note: 'Desi ghee in the dough, fried in oil. Lighter on the pocket.', variant: 'regular', sweet: 'gud' },
  { name: 'Regular · Cheeni', note: 'Desi ghee in the dough, fried in oil, with sugar.', variant: 'regular', sweet: 'cheeni' },
];

const isRegular = (p) => !!p.oilFried || /regular/i.test(p.variant || p.name || '');
const isSugar = (p) => /cheeni|sugar/i.test(p.sweetener || p.name || '');

const Thekua = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let live = true;
    getProducts({ category: 'thekua' })
      .then((res) => { if (live) setItems((Array.isArray(res) ? res : res?.products || []).filter((p) => p.packGroup === 'thekua' && p.isActive !== false && !p.isBundle)); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // Cheapest 400 g pack for each version, so the cards show a real price and link.
  const pick = (v) => {
    const list = items.filter((p) => (v.variant === 'regular') === isRegular(p) && (v.sweet === 'cheeni') === isSugar(p));
    return list.find((p) => /400/.test(p.weight || p.name)) || list[0];
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <div className="bg-paper">
      <SEOHead
        title="Buy Bihari Thekua Online – Desi Ghee & Gud Thekua from Munger"
        description="Order authentic Bihari thekua online, made in Munger, Bihar with whole-wheat atta, gud and desi ghee. No maida, no preservatives. Shuddh desi ghee and regular versions, delivered across India."
        keywords="buy thekua online, thekua online, bihari thekua, desi ghee thekua, gud thekua, jaggery thekua, thekua price, chhath thekua online, thekua delivery"
        url="/thekua"
        canonical="https://villagecrunch.in/thekua"
        breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'Thekua', url: '/thekua' }]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>

      <section className="bg-brand text-white py-10 md:py-16">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <h1 className="text-[32px] leading-[38px] md:text-[46px] md:leading-[52px] font-display font-bold">
            Bihari Thekua, made in Munger
          </h1>
          <p className="mt-4 text-lg max-w-2xl opacity-90">
            Whole-wheat atta, gud and desi ghee, shaped in a sancha and fried slowly on a low flame in small batches,
            the way it is made at home in Bihar. Delivered across India.
          </p>
          <Link to="/products?category=thekua" className="mt-6 inline-flex items-center h-12 px-6 rounded-md bg-white text-brand font-semibold">
            Shop thekua
          </Link>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <h2 className="text-2xl md:text-[30px] font-display font-semibold text-desi-brown">Choose your thekua</h2>
          <p className="mt-2 text-ink-soft">Two recipes, each with gud (jaggery) or cheeni (sugar).</p>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {VERSIONS.map((v) => {
              const p = pick(v);
              return (
                <div key={v.name} className="rounded-lg border border-line bg-white p-5">
                  <h3 className="text-lg font-semibold text-ink">{v.name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{v.note}</p>
                  {p && (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-ink"><b>₹{p.price}</b> <span className="text-sm text-ink-mute">· {p.weight || '400 g'}</span></span>
                      <Link to={`/product/${p._id}`} className="inline-flex items-center h-10 px-4 rounded-md bg-action text-white text-sm font-semibold">View</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl md:text-[30px] font-display font-semibold text-desi-brown">How we make it</h2>
            <ol className="mt-4 space-y-3 text-ink-soft list-decimal pl-5">
              <li>Gud (or cheeni) is mixed into whole-wheat atta with suji, dry coconut, saunf and elaichi.</li>
              <li>Desi ghee is rubbed into the dough, which is kneaded by hand until firm.</li>
              <li>Each piece is pressed in a sancha (mould) to get the traditional pattern.</li>
              <li>The pieces are fried slowly on a low flame until crisp and golden: in desi ghee for Shuddh, in oil for Regular.</li>
              <li>Once fully cool, they are packed in airtight pouches and shipped from Munger.</li>
            </ol>
          </div>
          <div>
            <h2 className="text-2xl md:text-[30px] font-display font-semibold text-desi-brown">What you get</h2>
            <ul className="mt-4 space-y-2 text-ink-soft">
              {['Whole-wheat atta, no maida', 'No preservatives, no artificial colours or flavours', 'Made in small batches in Munger, Bihar', 'Airtight packing for the journey', 'Delivered by Delhivery across India'].map((t) => (
                <li key={t} className="flex gap-2"><Check className="w-5 h-5 text-leaf flex-shrink-0 mt-0.5" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <h2 className="text-2xl md:text-[30px] font-display font-semibold text-desi-brown">Thekua: questions people ask</h2>
          <div className="mt-6 divide-y divide-line rounded-lg border border-line bg-white">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer font-semibold text-ink list-none flex justify-between gap-4">
                  {f.q}<span className="text-ink-mute group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-ink-soft leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/products?category=thekua" className="inline-flex items-center h-12 px-6 rounded-md bg-action text-white font-semibold">Order thekua</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Thekua;

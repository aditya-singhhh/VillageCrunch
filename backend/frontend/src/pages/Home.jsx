import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Banknote, Leaf, RefreshCw, Gift, BadgePercent, LayoutGrid } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SEOHead from '../components/SEOHead';
import HeroCarousel from '../components/HeroCarousel';
import useStoreSettings from '../hooks/useStoreSettings';
import { getProducts } from '../utils/api.js';
import { formatINR, discountPercent } from '../utils/format';

const CATEGORIES = [
  { to: '/products?category=makhana', label: 'Makhana', img: '/packaging/makhana-card.jpg' },
  { to: '/products?category=thekua', label: 'Thekua', img: '/packaging/thekua-card.jpg' },
  { to: '/products?category=sattu', label: 'Sattu', img: '/packaging/sattu-card.jpg' },
  { to: '/products?sort=discount', label: 'Offers', icon: BadgePercent },
  { to: '/products', label: 'Shop all', icon: LayoutGrid },
];

// Desktop column classes spelled out so Tailwind keeps them
const COLS = { 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' };

// cols = cards per desktop line; max = how many cards to show on desktop (full lines only)
const Row = ({ title, to, products, cols = 4, max = cols }) => {
  if (!products.length) return null;
  const shown = products.slice(0, max);
  return (
    <section className="container-page py-5 md:py-8">
      <div className="flex items-center justify-between gap-4 mb-3 md:mb-5">
        <h2 className="font-display font-semibold text-xl md:text-[28px] text-ink">{title}</h2>
        <Link to={to} className="inline-flex items-center gap-1 h-11 text-sm font-semibold text-action hover:underline underline-offset-4">
          View all <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
      <div className={`flex gap-3 overflow-x-auto snap-x scroll-pl-4 scrollbar-none -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:grid ${COLS[cols]} md:gap-5 md:overflow-visible`}>
        {shown.map((product) => (
          <div key={product._id} className="flex-none w-[44%] sm:w-[30%] snap-start md:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
        {/* Mobile-only: scroll further for the rest */}
        {products.length > max && products.slice(max, max + 4).map((product) => (
          <div key={product._id} className="flex-none w-[44%] sm:w-[30%] snap-start md:hidden">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const { settings, freeShippingThreshold } = useStoreSettings();
  // Wait for settings (or give up after 2s) so slides are not inserted after first paint
  const [settingsWait, setSettingsWait] = useState(true);
  useEffect(() => { const t = setTimeout(() => setSettingsWait(false), 2000); return () => clearTimeout(t); }, []);

  useEffect(() => {
    let alive = true;
    getProducts()
      .then((data) => { if (alive) setProducts(Array.isArray(data) ? data : data.products || []); })
      .catch((error) => console.error('Error fetching products:', error))
      .finally(() => alive && setLoaded(true));
    return () => { alive = false; };
  }, []);

  const byOrder = (a, b) => (a.packOrder || 0) - (b.packOrder || 0);
  const byCat = (c) => products.filter((p) => p.category === c).sort(byOrder);
  const thekua = useMemo(() => byCat('thekua'), [products]);
  const makhanaSattu = useMemo(() => [...byCat('makhana'), ...byCat('sattu')], [products]);
  // Best sellers: one hero pack from each line (thekua 400 g, then makhana and sattu), topped up with featured items
  const bestSellers = useMemo(() => {
    const hero = thekua.find((p) => !p.isBundle && /400/.test(p.weight || p.name)) || thekua[0];
    const picks = [hero, ...makhanaSattu].filter(Boolean);
    for (const p of products) if (picks.length < 4 && p.featured && !picks.includes(p)) picks.push(p);
    return picks.slice(0, 4);
  }, [products, thekua, makhanaSattu]);

  const trust = [
    { icon: Truck, text: freeShippingThreshold ? `Free delivery ${formatINR(freeShippingThreshold)}+` : 'Delivery across India' },
    { icon: Leaf, text: 'Natural · no preservatives' },
    { icon: Banknote, text: 'Cash on delivery' },
    { icon: RefreshCw, text: 'Easy returns' },
  ];

  return (
    <div>
      <SEOHead
        title="Thekua, Makhana & Sattu from Bihar"
        description="Traditional Bihari thekua made with jaggery and desi ghee, phool makhana and sattu. Natural, no preservatives, delivered direct to your home across India."
        keywords="thekua online, Bihari thekua, makhana online, phool makhana, roasted makhana, sattu online, Chhath prasad, natural snacks, no preservatives"
        url="/"
        type="website"
      />
      <h1 className="sr-only">VillageCrunch: thekua, makhana and sattu</h1>

      <HeroCarousel products={products} freeShippingThreshold={freeShippingThreshold} ready={loaded && (!!settings || !settingsWait)} />

      {/* Category circles */}
      <nav aria-label="Shop by category" className="bg-white border-b border-line">
        <ul className="container-page py-4 md:py-6 flex gap-4 sm:gap-8 overflow-x-auto scrollbar-none md:justify-center">
          {CATEGORIES.map(({ to, label, img, icon: Icon }) => (
            <li key={label} className="flex-none">
              <Link to={to} className="group flex flex-col items-center gap-2 w-[72px] md:w-[104px]">
                <span className="w-[68px] h-[68px] md:w-24 md:h-24 rounded-full overflow-hidden bg-cream border-2 border-line group-hover:border-action transition-colors inline-flex items-center justify-center">
                  {img ? (
                    <img src={img} alt="" width="96" height="96" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-7 h-7 md:w-9 md:h-9 text-action" strokeWidth={1.5} aria-hidden="true" />
                  )}
                </span>
                <span className="text-[13px] md:text-sm font-medium text-ink text-center leading-tight">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!loaded ? (
        <div className="container-page py-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5" aria-busy="true">
          {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] skeleton" />)}
        </div>
      ) : (
        <>
          <Row title="Best sellers" to="/products" products={bestSellers} />

          {/* Gifting strip */}
          <section className="container-page py-3">
            <Link
              to="/products?category=thekua"
              className="flex items-center gap-3 rounded-lg bg-cream border border-sand/60 px-4 py-3 md:px-6 md:py-4 hover:bg-[#EFE2CC] transition-colors"
            >
              <span className="w-11 h-11 rounded-full bg-white inline-flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-action" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="font-display font-semibold text-lg md:text-xl text-ink flex-1">Gifting made easy</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-action">Shop gifts <ArrowRight className="w-4 h-4" aria-hidden="true" /></span>
            </Link>
          </section>

          <Row title="Thekua · sizes & gift packs" to="/products?category=thekua" products={thekua} cols={3} max={6} />
          <Row title="Makhana & Sattu" to="/products" products={makhanaSattu} cols={3} max={3} />

          {/* Packaging showcase */}
          <section aria-labelledby="pack-title" className="container-page py-6 md:py-10">
            <div className="rounded-xl bg-paper border border-sand/60 overflow-hidden md:grid md:grid-cols-[1.1fr_1fr] md:items-center">
              <img
                src="/packaging/thekua-sizes.jpg"
                alt="VillageCrunch Thekua pouches in 200 g, 400 g and 800 g"
                width="2000" height="1500" loading="lazy" decoding="async"
                className="w-full h-auto"
              />
              <div className="p-5 md:p-10">
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-brand">Jaggery &amp; desi ghee · no maida</p>
                <h2 id="pack-title" className="font-display font-semibold text-2xl md:text-4xl text-ink mt-2">Gaon ka swad, shehar ke liye</h2>
                <p className="text-ink/75 mt-3 max-w-md">Bihar&apos;s Chhath prasad, made with whole wheat atta, jaggery and desi ghee. Natural ingredients, no preservatives, direct to your home.</p>
                <ul className="mt-5 grid grid-cols-3 gap-3 max-w-md">
                  {[['200 g', 'thekua-200', '697a51ed6d805b30e09a52e1', '₹219'], ['400 g', 'thekua-400', '697a51ed6d805b30e09a52dc', '₹399'], ['800 g', 'thekua-800', '697a51ed6d805b30e09a52e2', '₹749']].map(([n, k, id, pr]) => (
                    <li key={k}>
                      <Link to={`/product/${id}`} className="block text-center group">
                        <img src={`/packaging/${k}-front.webp`} alt="" width="300" height="400" loading="lazy" decoding="async" className="w-full h-auto drop-shadow-md group-hover:-translate-y-1 transition-transform" />
                        <span className="mt-2 block text-sm font-semibold text-ink">{n}</span>
                        <span className="block text-sm text-ink-soft">{pr}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Trust strip: icons and a few words only */}
      <section aria-label="Our promises" className="mt-6 bg-white border-y border-line">
        <ul className="container-page py-5 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-3">
          {trust.map(({ icon: Icon, text }) => (
            <li key={text} className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 text-center text-sm font-medium text-ink">
              <span className="w-11 h-11 rounded-full bg-cream inline-flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-brand" strokeWidth={1.75} aria-hidden="true" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Home;

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Banknote, ShieldCheck, RefreshCw, Gift, BadgePercent, LayoutGrid } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SEOHead from '../components/SEOHead';
import HeroCarousel from '../components/HeroCarousel';
import useStoreSettings from '../hooks/useStoreSettings';
import { getProducts } from '../utils/api.js';
import { formatINR, discountPercent } from '../utils/format';

const CATEGORIES = [
  { to: '/products?category=dry-fruits', label: 'Dry fruits', img: '/Product_Images/MixDry.jpg' },
  { to: '/products?category=makhana', label: 'Makhana', img: '/Product_Images/Makhana.jpg' },
  { to: '/products?category=thekua', label: 'Thekua', img: '/packaging/thekua-premium-card.jpg' },
  { to: '/products?sort=discount', label: 'Offers', icon: BadgePercent },
  { to: '/products', label: 'Shop all', icon: LayoutGrid },
];

const Row = ({ title, to, products }) => {
  if (!products.length) return null;
  return (
    <section className="container-page py-5 md:py-8">
      <div className="flex items-center justify-between gap-4 mb-3 md:mb-5">
        <h2 className="font-display font-semibold text-xl md:text-[28px] text-ink">{title}</h2>
        <Link to={to} className="inline-flex items-center gap-1 h-11 text-sm font-semibold text-action hover:underline underline-offset-4">
          View all <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x scroll-pl-4 scrollbar-none -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible">
        {products.slice(0, 4).map((product) => (
          <div key={product._id} className="flex-none w-[44%] sm:w-[30%] snap-start md:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
        {/* Mobile-only: scroll further for the rest */}
        {products.length > 4 && products.slice(4, 8).map((product) => (
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

  const bestSellers = useMemo(() => {
    const featured = products.filter((p) => p.featured);
    return (featured.length ? featured : products).slice(0, 8);
  }, [products]);
  const byCat = (c) => products.filter((p) => p.category === c);
  const dryFruits = useMemo(() => byCat('dry-fruits'), [products]);
  const makhana = useMemo(() => byCat('makhana'), [products]);
  const thekua = useMemo(() => byCat('thekua'), [products]);

  const trust = [
    { icon: Truck, text: freeShippingThreshold ? `Free delivery ${formatINR(freeShippingThreshold)}+` : 'Delivery across India' },
    { icon: Banknote, text: 'Cash on delivery' },
    { icon: ShieldCheck, text: 'Secure payment' },
    { icon: RefreshCw, text: 'Easy returns' },
  ];

  return (
    <div>
      <SEOHead
        title="Premium Dry Fruits & Makhana Online"
        description="Shop the finest quality dry fruits, roasted makhana, and traditional Bihari thekua at VillageCrunch. 100% natural products with fast delivery across India. Order now!"
        keywords="buy dry fruits online, premium almonds, cashews, pistachios, walnuts, makhana online, thekua Bihar, natural dry fruits, healthy snacks"
        url="/"
        type="website"
      />
      <h1 className="sr-only">VillageCrunch: dry fruits, makhana and thekua</h1>

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
          <Row title="Dry fruits" to="/products?category=dry-fruits" products={dryFruits} />

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

          <Row title="Makhana" to="/products?category=makhana" products={makhana} />
          <Row title="Thekua" to="/products?category=thekua" products={thekua} />

          {/* Packaging showcase */}
          <section aria-labelledby="pack-title" className="container-page py-6 md:py-10">
            <div className="rounded-xl bg-paper border border-sand/60 overflow-hidden md:grid md:grid-cols-[1.1fr_1fr] md:items-center">
              <img
                src="/packaging/thekua-range.jpg"
                alt="VillageCrunch Thekua in three kraft pouches: Jaggery, Premium and Classic"
                width="2400" height="1100" loading="lazy" decoding="async"
                className="w-full h-auto"
              />
              <div className="p-5 md:p-10">
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-brand">New packaging</p>
                <h2 id="pack-title" className="font-display font-semibold text-2xl md:text-4xl text-ink mt-2">Gaon ka swad, shehar ke liye</h2>
                <p className="text-ink/75 mt-3 max-w-md">Three thekuas in 400 g pouches, with a Chhath Puja sunrise design. Pick your favourite.</p>
                <ul className="mt-5 grid grid-cols-3 gap-3 max-w-md">
                  {[['Jaggery', 'jaggery', '#C2680C'], ['Premium', 'premium', '#6B3A1E'], ['Classic', 'classic', '#2F6B2F']].map(([n, k, c]) => (
                    <li key={k}>
                      <Link to="/products?category=thekua" className="block text-center group">
                        <img src={`/packaging/${k}-front.webp`} alt="" width="300" height="400" loading="lazy" decoding="async" className="w-full h-auto drop-shadow-md group-hover:-translate-y-1 transition-transform" />
                        <span className="mt-2 inline-block text-sm font-semibold" style={{ color: c }}>{n}</span>
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

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Banknote, Leaf, RefreshCw, Gift, BadgePercent, LayoutGrid } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SEOHead from '../components/SEOHead';
import HeroCarousel from '../components/HeroCarousel';
import useStoreSettings from '../hooks/useStoreSettings';
import { getProducts } from '../utils/api.js';
import { formatINR, discountPercent } from '../utils/format';
import { imgSrc, imgProps } from '../utils/img';

const CATEGORIES = [
  { to: '/products?category=makhana', label: 'Makhana', img: '/packaging/makhana-card.jpg' },
  { to: '/products?category=thekua', label: 'Thekua', img: '/packaging/real-thekua-basket.jpg' },
  { to: '/products?category=sattu', label: 'Sattu', img: '/packaging/sattu-card.jpg' },
  { to: '/products?sort=discount', label: 'Offers', icon: BadgePercent },
  { to: '/products', label: 'Shop all', icon: LayoutGrid },
];

// Every row uses the same card size (4 across on desktop). A row with fewer
// than 4 products is centred instead of stretching or leaving a gap.
const Row = ({ title, to, products }) => {
  if (!products.length) return null;
  const shown = products.slice(0, 4);
  return (
    <section className="container-page py-5 md:py-8">
      <div className="flex items-center justify-between gap-4 mb-3 md:mb-5">
        <h2 className="font-display font-semibold text-xl md:text-[28px] text-ink">{title}</h2>
        <Link to={to} className="inline-flex items-center gap-1 h-11 text-sm font-semibold text-action hover:underline underline-offset-4">
          View all <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x scroll-pl-4 scrollbar-none -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:gap-5 md:overflow-visible md:justify-center">
        {shown.map((product) => (
          <div key={product._id} className="flex-none w-[44%] sm:w-[30%] snap-start md:w-[calc((100%-3.75rem)/4)]">
            <ProductCard product={product} />
          </div>
        ))}
        {/* Mobile-only: scroll further for the rest */}
        {products.slice(4, 8).map((product) => (
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
  const thekua = useMemo(() => products.filter((p) => p.category === 'thekua').sort(byOrder), [products]);
  // Row 1: the three thekua sizes + the best-value pack
  const thekuaRow = useMemo(() => {
    const sizes = thekua.filter((p) => !p.isBundle);
    const packs = thekua.filter((p) => p.isBundle && !/makhana/i.test(p.name) && !/gift/i.test(p.name));
    return [...sizes, ...packs, ...thekua.filter((p) => p.isBundle)].filter((p, i, a) => a.indexOf(p) === i).slice(0, 4);
  }, [thekua]);
  // Row 2: makhana and sattu, topped up with the thekua + makhana combo
  const pantryRow = useMemo(() => {
    const items = products.filter((p) => p.category === 'makhana' || p.category === 'sattu');
    const combo = thekua.find((p) => p.isBundle && /makhana/i.test(p.name));
    return [...items, ...(combo ? [combo] : [])].slice(0, 4);
  }, [products, thekua]);
  const giftBox = useMemo(() => thekua.find((p) => /gift/i.test(p.name)), [thekua]);
  const giftRow = useMemo(
    () => [...products.filter((p) => p.category === 'gifts').sort(byOrder), ...(giftBox ? [giftBox] : [])],
    [products, giftBox]
  );

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
                    <img src={imgSrc(img, 400)} alt="" width="96" height="96" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
          <Row title="Thekua" to="/products?category=thekua" products={thekuaRow} />

          {/* Why our thekua */}
          <section aria-labelledby="story-title" className="container-page py-4 md:py-8">
            <div className="rounded-xl bg-paper border border-sand/60 overflow-hidden md:grid md:grid-cols-[1.1fr_1fr] md:items-center">
              <img
                {...imgProps('/packaging/real-thekua-mould.jpg', '(min-width: 768px) 55vw, 100vw')}
                alt="Thekua in a basket with the carved wooden saancha it is pressed in"
                width="1200" height="1200" loading="lazy" decoding="async"
                className="w-full h-64 md:h-full object-cover"
              />
              <div className="p-5 md:p-10">
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-brand">Bihar ka Chhath prasad</p>
                <h2 id="story-title" className="font-display font-semibold text-2xl md:text-4xl text-ink mt-2">Gaon ka swad, shehar ke liye</h2>
                <ul className="mt-5 space-y-3 text-ink">
                  {[
                    ['Desi ghee mein tala', 'Wahi khushboo jo ghar ki rasoi mein aati thi'],
                    ['Gud ki mithaas', 'Jaggery, no maida, no preservatives'],
                    ['Order pe taaza', 'Aapka order aata hai, tab banta hai · 1–2 din mein dispatch'],
                  ].map(([t, d]) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-2 w-2 h-2 rounded-full bg-brand flex-shrink-0" aria-hidden="true" />
                      <span><span className="font-semibold">{t}</span><span className="block text-sm text-ink-soft">{d}</span></span>
                    </li>
                  ))}
                </ul>
                <Link to="/product/697a51ed6d805b30e09a52dc" className="btn-primary mt-6 inline-flex">
                  Thekua dekhiye <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          {/* Chhath campaign strip */}
          <section className="container-page py-3">
            <Link
              to="/ghar"
              className="flex items-center gap-3 rounded-lg bg-[#2B1B33] text-white px-4 py-3 md:px-6 md:py-4 hover:bg-[#3A2545] transition-colors"
            >
              <span className="w-11 h-11 rounded-full bg-[#FFD27A] inline-flex items-center justify-center flex-shrink-0 text-xl" aria-hidden="true">🌅</span>
              <span className="flex-1">
                <span className="block font-display font-semibold text-lg md:text-xl">Ghat door hai, suraj wahi hai.</span>
                <span className="block text-sm text-white/75">Is Chhath ghar nahi ja paa rahe? Bihar se aapke liye ek dabba — hamari taraf se.</span>
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFD27A]">Dekhiye <ArrowRight className="w-4 h-4" aria-hidden="true" /></span>
            </Link>
          </section>

          <Row title="Diwali gift boxes" to="/diwali" products={giftRow} />

          <Row title="Makhana & Sattu" to="/products" products={pantryRow} />

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

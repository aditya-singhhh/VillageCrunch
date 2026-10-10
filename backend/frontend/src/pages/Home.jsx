import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, RefreshCw, ShieldCheck, CreditCard, Check } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SEOHead from '../components/SEOHead';
import AIProductRecommendations from '../components/AIProductRecommendations';
import { getProducts } from '../utils/api.js';

const CATEGORIES = [
  { to: '/products?category=dry-fruits', label: 'Dry fruits', sub: 'Almonds, cashews, walnuts', img: '/Product_Images/MixDry.jpg' },
  { to: '/products?category=makhana', label: 'Makhana', sub: 'Light and crunchy fox nuts', img: '/Product_Images/Makhana.jpg' },
  { to: '/products?category=thekua', label: 'Thekua', sub: 'Traditional Bihari sweet', img: '/thekua.jpg' },
  { to: '/products', label: 'Shop all', sub: 'See the full range', img: '/Product_Images/Raisins.jpg' },
];

const TRUST = [
  { icon: Truck, text: 'Delivery across India' },
  { icon: RefreshCw, text: '7-day returns' },
  { icon: ShieldCheck, text: 'Secure online payments' },
  { icon: CreditCard, text: 'UPI, card or COD' },
];

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const data = await getProducts({ featured: true });
        setFeaturedProducts(data.slice(0, 8));
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoaded(true);
      }
    };
    fetchFeaturedProducts();
  }, []);

  return (
    <div>
      <SEOHead
        title="Premium Dry Fruits & Makhana Online"
        description="Shop the finest quality dry fruits, roasted makhana, and traditional Bihari thekua at VillageCrunch. 100% natural products with fast delivery across India. Order now!"
        keywords="buy dry fruits online, premium almonds, cashews, pistachios, walnuts, makhana online, thekua Bihar, natural dry fruits, healthy snacks"
        url="/"
        type="website"
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-paper to-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-0 md:min-h-[520px] grid md:grid-cols-12 gap-6 md:gap-12 items-center">
          <div className="md:col-span-7 md:order-2">
            <div className="aspect-[4/3] md:aspect-[5/4] rounded-lg overflow-hidden bg-cream shadow-card">
              <img
                src="/thekua.jpg"
                alt="Traditional Bihari thekua"
                width="800"
                height="640"
                fetchpriority="high"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="md:col-span-5 md:order-1 md:py-16">
            <p className="eyebrow">Straight from Bihar</p>
            <h1 className="mt-2 font-display font-bold text-[34px] leading-[38px] md:text-[48px] md:leading-[54px] lg:text-[54px] lg:leading-[58px] text-ink">
              Dry fruits, makhana &amp; thekua, packed fresh.
            </h1>
            <p className="mt-4 text-ink-soft text-base md:text-lg md:max-w-md">
              Hand-picked dry fruits, crunchy makhana and traditional Bihari thekua, delivered to your door.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link to="/products" className="btn-primary w-full sm:w-auto">
                Shop now <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link to="/products?category=thekua" className="btn-ghost justify-center">Try the thekua</Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Why shop with us">
              {['Hand-picked', 'Packed in Bihar', 'COD available'].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-line text-[13px] font-medium text-ink-soft">
                  <Check className="w-3.5 h-3.5 text-leaf" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="Our promises" className="bg-white border-y border-line">
        <ul className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
          {TRUST.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm font-medium text-ink">
              <span className="w-10 h-10 rounded-full bg-cream inline-flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-brand" strokeWidth={1.75} aria-hidden="true" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* Shop by category */}
      <section className="container-page section-y !pb-6 md:!pb-10">
        <h2 className="section-title">Shop by category</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {CATEGORIES.map((c) => (
            <Link key={c.label} to={c.to} className="group relative block aspect-square rounded-lg overflow-hidden bg-cream zoom-on-hover">
              <img
                src={c.img}
                alt=""
                width="400" height="400" loading="lazy" decoding="async"
                className="zoom-img w-full h-full object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" aria-hidden="true" />
              <span className="absolute left-3 right-3 bottom-3 text-white">
                <span className="block font-display font-semibold text-lg leading-6">{c.label}</span>
                <span className="hidden sm:block text-sm text-white/90">{c.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-page section-y">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="section-title !mb-0">Our favourites</h2>
          <Link to="/products" className="btn-ghost -mr-3 h-11">View all <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
        </div>
        {!loaded ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5" aria-busy="true">
            {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] skeleton" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto snap-x scroll-pl-4 scrollbar-none -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible">
            {featuredProducts.map((product) => (
              <div key={product._id} className="flex-none w-[46%] sm:w-[34%] snap-start md:w-auto">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gifting */}
      <section className="container-page pb-10 md:pb-[72px]">
        <div className="rounded-lg bg-cream border border-sand/60 px-6 py-8 md:px-12 md:py-12 md:flex md:items-center md:justify-between gap-8">
          <div className="max-w-xl">
            <p className="eyebrow">Gifting</p>
            <h2 className="mt-1 font-display font-semibold text-2xl md:text-[32px] md:leading-[38px] text-ink">Something sweet to share</h2>
            <p className="mt-3 text-ink-soft">
              Thekua and premium dry fruits make a thoughtful gift for festivals, family visits and special occasions.
            </p>
          </div>
          <div className="mt-5 md:mt-0 flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link to="/products?category=thekua" className="btn-primary">Shop thekua</Link>
            <Link to="/products?category=dry-fruits" className="btn-secondary">Shop dry fruits</Link>
          </div>
        </div>
      </section>

      {/* Why VillageCrunch */}
      <section className="bg-white border-y border-line">
        <div className="container-page section-y">
          <h2 className="section-title">Why VillageCrunch</h2>
          <div className="grid md:grid-cols-3 gap-6 md:gap-10">
            {[
              { t: 'Hand-picked', d: 'We select each product ourselves and pack it fresh before it ships.' },
              { t: 'Rooted in Bihar', d: 'Makhana and thekua made the traditional way, from the region they come from.' },
              { t: 'Simple ordering', d: 'Pay by UPI, card or net banking, or choose cash on delivery.' },
            ].map((x) => (
              <div key={x.t}>
                <h3 className="font-display font-semibold text-lg text-ink">{x.t}</h3>
                <p className="mt-1 text-ink-soft">{x.d}</p>
              </div>
            ))}
          </div>
          <Link to="/about" className="btn-ghost mt-4 -ml-3">Read our story <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
        </div>
      </section>

      {/* AI-Powered Recommendations */}
      <AIProductRecommendations limit={4} />
    </div>
  );
};

export default Home;

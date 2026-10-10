import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { OFFER_SLIDES } from '../config/offers';
import { ChhathScene, FolkBorder } from './ChhathArt';
import { formatINR, discountPercent } from '../utils/format';

const AUTOPLAY_MS = 5000;

const fill = (text, vars) =>
  text.replace('{threshold}', vars.threshold ? formatINR(vars.threshold) : '').replace('{maxOff}', vars.maxOff || '');

/**
 * Swipeable, auto-playing offer banner (CSS scroll-snap, no library).
 * Slides come from src/config/offers.js. Values like "up to X% off" are computed from `products`.
 */
const HeroCarousel = ({ products = [], freeShippingThreshold = 0, ready = true }) => {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [focusIn, setFocusIn] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);

  const maxOff = useMemo(
    () => products.reduce((m, p) => Math.max(m, discountPercent(p.price, p.originalPrice)), 0),
    [products],
  );

  const slides = useMemo(() => {
    const have = { threshold: freeShippingThreshold > 0, discount: maxOff > 0 };
    const now = Date.now();
    const inWindow = (s) => (!s.from || now >= Date.parse(s.from)) && (!s.until || now <= Date.parse(`${s.until}T23:59:59+05:30`));
    return OFFER_SLIDES.filter((s) => inWindow(s) && (s.needs || []).every((n) => have[n])).map((s) => {
      const match = s.product && products.find((p) => p.name?.toLowerCase().includes(s.product.toLowerCase()));
      const vars = { threshold: freeShippingThreshold, maxOff };
      return {
        ...s,
        headline: fill(s.headline, vars),
        sub: fill(s.sub, vars),
        href: match?._id ? `/product/${match._id}` : s.to,
      };
    });
  }, [freeShippingThreshold, maxOff, products]);

  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = (e) => setReduced(e.matches);
    mq.addEventListener('change', on);
    const vis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => { mq.removeEventListener('change', on); document.removeEventListener('visibilitychange', vis); };
  }, []);

  const goTo = useCallback((i) => {
    const el = trackRef.current;
    if (!el || !count) return;
    const n = ((i % count) + count) % count;
    el.scrollTo({ left: n * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    setIndex(n);
  }, [count, reduced]);

  // Keep the dot in sync while the user swipes
  const raf = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = trackRef.current;
      if (!el || !el.clientWidth) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex((cur) => (cur === i ? cur : i));
    });
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Keep the current slide aligned if the viewport is resized
  useEffect(() => {
    const on = () => { const el = trackRef.current; if (el) el.scrollTo({ left: index * el.clientWidth, behavior: 'auto' }); };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [index]);

  const playing = ready && !userPaused && !hover && !focusIn && !reduced && !hidden && count > 1;
  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => goTo(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, index, goTo]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  };

  // Reserve the final height before data arrives: no layout shift
  const frame = 'h-[204px] sm:h-[240px] md:h-[300px] lg:h-[360px]';
  if (!ready || !count) return <div className="container-page pt-3 md:pt-5"><div className={`${frame} rounded-xl bg-cream`} aria-hidden="true" /></div>;

  const arrow = 'hidden md:inline-flex absolute top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-raised hover:bg-white';

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers"
      className="container-page pt-3 md:pt-5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocusIn(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusIn(false); }}
      onKeyDown={onKeyDown}
    >
     <div className="relative group rounded-xl overflow-hidden">
      <div
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        aria-live={playing ? 'off' : 'polite'}
        aria-label="Offer slides. Use left and right arrow keys to change slide."
        className={`flex overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain ${frame}`}
      >
        {slides.map((s, i) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            className={`relative flex-none w-full h-full snap-center overflow-hidden ${s.dark ? 'text-white' : 'text-ink'}`}
            style={{ background: s.bg }}
          >
            {s.art === 'chhath' ? (
              <>
                <ChhathScene
                  className="absolute right-0 top-0 h-full w-[56%] md:w-[52%]"
                  style={{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 38%)', maskImage: 'linear-gradient(to right, transparent 0%, #000 38%)' }}
                />
                <FolkBorder className="absolute bottom-0 left-0 opacity-70" />
              </>
            ) : s.art === 'packs' ? (
              <div className="absolute right-0 top-0 h-full w-[46%] md:w-[48%] flex items-center justify-center" aria-hidden="true">
                <span className="absolute w-[78%] aspect-square max-h-[92%] rounded-full bg-white/10 ring-1 ring-white/25" />
                <span className="absolute w-[56%] aspect-square max-h-[68%] rounded-full bg-white/10" />
                {s.packs.length === 1 ? (
                  <img src={`/packaging/${s.packs[0]}-front.webp`} alt="" width="300" height="400" loading="lazy" decoding="async" draggable="false"
                    className="relative h-[84%] w-auto rotate-[5deg] drop-shadow-[0_14px_18px_rgba(0,0,0,.45)]" />
                ) : (
                  <div className="relative h-[78%] sm:h-[70%] sm:mr-6 md:mr-10 flex items-end justify-center">
                    {s.packs.map((k, n) => (
                      <img key={k} src={`/packaging/${k}-front.webp`} alt="" width="300" height="400" loading="lazy" decoding="async" draggable="false"
                        className={`h-full w-auto drop-shadow-[0_12px_16px_rgba(0,0,0,.45)] ${n === 0 ? 'hidden sm:block -rotate-6 translate-x-3 md:translate-x-5' : n === 1 ? 'z-10 sm:scale-110 sm:-mx-3 md:-mx-4' : 'hidden sm:block rotate-6 -translate-x-3 md:-translate-x-5'}`} />
                    ))}
                  </div>
                )}
              </div>
            ) : s.art === 'arch' ? (
              <>
                <FolkBorder className="absolute top-0 left-0 opacity-40 rotate-180" />
                <div className="absolute right-2 sm:right-4 md:right-14 bottom-0 h-[74%] sm:h-[86%] aspect-[4/5] rounded-t-[999px] overflow-hidden border-[3px] border-white/80 shadow-xl" aria-hidden="true">
                  <img src={s.image} alt="" width="480" height="600" loading="lazy" decoding="async" draggable="false" className="w-full h-full object-cover" />
                </div>
              </>
            ) : (
            <img
              src={s.image}
              alt=""
              width="640"
              height="640"
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchpriority={i === 0 ? 'high' : undefined}
              decoding="async"
              draggable="false"
              className="absolute right-0 top-0 h-full w-[52%] md:w-[48%] object-cover"
              style={{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 45%)', maskImage: 'linear-gradient(to right, transparent 0%, #000 45%)' }}
            />
            )}
            <div className="relative z-10 h-full px-5 sm:px-8 md:pl-20 md:pr-12 flex flex-col justify-center">
              <div className="max-w-[62%] sm:max-w-[52%] md:max-w-[46%]">
                {s.badge && (
                  <span className="inline-block mb-2 px-3 py-1 rounded-full bg-white/15 border border-white/40 text-[11px] sm:text-xs font-semibold uppercase tracking-widest">
                    {s.badge}
                  </span>
                )}
                <h2 className="font-display font-bold text-[22px] leading-[26px] sm:text-3xl sm:leading-9 lg:text-[40px] lg:leading-[46px]">
                  {s.headline}
                </h2>
                <p className={`mt-1 md:mt-2 text-xs sm:text-sm md:text-base ${s.dark ? 'text-white/90' : 'text-ink-soft'}`}>{s.sub}</p>
                <Link
                  to={s.href}
                  tabIndex={i === index ? 0 : -1}
                  className={`mt-3 md:mt-5 inline-flex items-center justify-center h-10 md:h-11 px-5 rounded-md font-semibold text-base transition-colors ${
                    s.dark ? 'bg-white text-brand hover:bg-cream' : 'bg-action text-white hover:bg-action-dark'
                  }`}
                >
                  {s.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous slide" className={`${arrow} left-4`}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button type="button" onClick={() => goTo(index + 1)} aria-label="Next slide" className={`${arrow} right-4`}>
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-2 left-0 right-0 z-20 flex items-center justify-center gap-1">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className="h-6 px-1 inline-flex items-center"
              >
                <span className={`block h-2 rounded-full transition-all ${i === index ? (slides[index]?.dark === false ? 'w-6 bg-ink shadow' : 'w-6 bg-white shadow') : (slides[index]?.dark === false ? 'w-2 bg-ink/35' : 'w-2 bg-white/60')}`} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUserPaused((v) => !v)}
              aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
              className="ml-2 w-6 h-6 rounded-full bg-black/35 text-white hidden md:inline-flex items-center justify-center"
            >
              {userPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
          </div>
        </>
      )}
     </div>
    </section>
  );
};

export default HeroCarousel;

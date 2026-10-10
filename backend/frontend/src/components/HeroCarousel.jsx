import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { OFFER_SLIDES } from '../config/offers';
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
    return OFFER_SLIDES.filter((s) => (s.needs || []).every((n) => have[n])).map((s) => {
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
  const frame = 'h-[300px] sm:h-[340px] md:h-[400px] lg:h-[440px]';
  if (!ready || !count) return <div className={`${frame} bg-cream`} aria-hidden="true" />;

  const arrow = 'hidden md:inline-flex absolute top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-raised hover:bg-white';

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers"
      className="relative group"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocusIn(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusIn(false); }}
      onKeyDown={onKeyDown}
    >
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
            <div className="relative z-10 h-full max-w-6xl mx-auto px-5 sm:px-8 flex flex-col justify-center">
              <div className="max-w-[62%] sm:max-w-[52%] md:max-w-[46%]">
                <h2 className="font-display font-bold text-[28px] leading-[32px] sm:text-4xl sm:leading-[42px] lg:text-[52px] lg:leading-[58px]">
                  {s.headline}
                </h2>
                <p className={`mt-2 md:mt-3 text-sm md:text-lg ${s.dark ? 'text-white/90' : 'text-ink-soft'}`}>{s.sub}</p>
                <Link
                  to={s.href}
                  tabIndex={i === index ? 0 : -1}
                  className={`mt-4 md:mt-6 inline-flex items-center justify-center h-11 md:h-12 px-6 rounded-md font-semibold text-base transition-colors ${
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

          <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-1">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className="h-6 px-1 inline-flex items-center"
              >
                <span className={`block h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white shadow' : 'w-2 bg-white/60'}`} />
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
    </section>
  );
};

export default HeroCarousel;

// Fast images: every /packaging/*.jpg also exists as -400/-800/-1200 .webp
// (made by scripts/make-webp.py). Use these helpers instead of the raw jpg.
const SIZED = /^\/packaging\/([\w-]+)\.jpg$/;

/** Smallest WebP at least `w` px wide, or the original src if none exists. */
export const imgSrc = (src, w = 800) => {
  const m = typeof src === 'string' && src.match(SIZED);
  if (!m) return src;
  const size = w <= 400 ? 400 : w <= 800 ? 800 : 1200;
  return `/packaging/${m[1]}-${size}.webp`;
};

/** Props for <img>: src + srcSet + sizes, so the browser picks the right file. */
export const imgProps = (src, sizes = '(min-width: 768px) 25vw, 45vw') => {
  const m = typeof src === 'string' && src.match(SIZED);
  if (!m) return { src };
  const b = `/packaging/${m[1]}`;
  return { src: `${b}-800.webp`, srcSet: `${b}-400.webp 400w, ${b}-800.webp 800w, ${b}-1200.webp 1200w`, sizes };
};

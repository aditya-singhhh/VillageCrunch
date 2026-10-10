/**
 * HOME PAGE OFFER CAROUSEL  -  owner-editable
 * ------------------------------------------------------------------------------------
 * Each object below is one slide of the big banner at the top of the home page.
 * Edit text, links, colours and photos here; no other file needs to change.
 *
 *   id        any unique word
 *   headline  keep it to 6 words or fewer
 *   sub       one short line. You can use these live values, they are filled in for you:
 *               {threshold}  free-delivery minimum from Admin > Settings (e.g. ₹500)
 *               {maxOff}     biggest discount % found on your real products (price vs original price)
 *   cta       button text
 *   to        where the button goes (e.g. '/products?category=thekua')
 *   product   OPTIONAL: part of a product name. If a product with that text in its name exists,
 *             the button opens that product page instead of `to`
 *   image     a photo from /public (for example '/Product_Images/MixDry.jpg')
 *   bg        background CSS gradient (any valid CSS background value)
 *   dark      true  = light text on a dark background, false = dark text on a light background
 *   badge     OPTIONAL: small label above the headline, e.g. 'Coming soon'
 *   art       OPTIONAL: 'chhath' draws the built-in Chhath illustration instead of a photo
 *   from      OPTIONAL: first day this slide shows, as 'YYYY-MM-DD'
 *   until     OPTIONAL: last day this slide shows (it disappears by itself afterwards)
 *   needs     OPTIONAL: slide is hidden unless these are available.
 *               'threshold' = a free-delivery minimum is set in Settings
 *               'discount'  = at least one product has an original price higher than its price
 *
 * Only put offers here that are really true on the store: a slide that needs a value which
 * is not available is hidden automatically, so a number is never shown that is not real.
 * Slides appear in this order. Keep 3 to 5 slides.
 */
export const OFFER_SLIDES = [
  {
    id: 'chhath',
    headline: 'Chhath Puja ki Shubhkamnayein',
    sub: 'Festive snacks from Bihar, to your door',
    cta: 'Shop festive offers',
    to: '/products?sort=discount',
    art: 'chhath',
    bg: 'linear-gradient(110deg,#5E1409 0%,#9A2F10 55%,#C2410C 100%)',
    dark: true,
    from: '2026-10-10',
    until: '2026-11-17',
  },
  {
    id: 'roots',
    badge: 'Coming soon',
    headline: 'Jadon se judiye',
    sub: 'Ghar ka swaad, ghar se door bhi',
    cta: 'Shop thekua',
    to: '/products?category=thekua',
    art: 'chhath',
    bg: 'linear-gradient(110deg,#4A1208 0%,#7C1D12 55%,#A8330F 100%)',
    dark: true,
    from: '2026-10-10',
    until: '2026-11-17',
  },
  {
    id: 'free-thekua',
    badge: 'Coming soon',
    headline: 'Free thekua gift',
    sub: 'With your order. Delivery & packing extra.',
    cta: 'Shop thekua',
    to: '/products?category=thekua',
    art: 'chhath',
    bg: 'linear-gradient(110deg,#5A2E00 0%,#9A4A08 55%,#C2680C 100%)',
    dark: true,
    from: '2026-10-10',
    until: '2026-11-12',
  },
  {
    id: 'chhath-gift',
    headline: 'Send love home this Chhath',
    sub: 'Thekua and dry fruits for family',
    cta: 'Shop thekua',
    to: '/products?category=thekua',
    art: 'chhath',
    bg: 'linear-gradient(110deg,#7C1D12 0%,#B4380F 60%,#D9561A 100%)',
    dark: true,
    from: '2026-10-10',
    until: '2026-11-12',
  },
  {
    id: 'free-delivery',
    headline: 'Free delivery above {threshold}',
    sub: 'Straight to your door',
    cta: 'Shop now',
    to: '/products',
    image: '/Product_Images/MixDry.jpg',
    bg: 'linear-gradient(110deg,#3A1E0F 0%,#6B3A1E 60%,#8A4A25 100%)',
    dark: true,
    needs: ['threshold'],
  },
  {
    id: 'up-to-off',
    headline: 'Up to {maxOff}% off',
    sub: 'On dry fruits, makhana and thekua',
    cta: 'Shop the sale',
    to: '/products?sort=discount',
    image: '/Product_Images/cashew.jpg',
    bg: 'linear-gradient(110deg,#9A3412 0%,#C2410C 65%,#D9561A 100%)',
    dark: true,
    needs: ['discount'],
  },
  {
    id: 'thekua-box',
    headline: 'Thekua festival box',
    sub: 'Traditional Bihari sweet, fresh-made',
    cta: 'Shop thekua',
    to: '/products?category=thekua',
    image: '/Product_Images/Festival_thekua.jpg',
    bg: 'linear-gradient(110deg,#FDEBDD 0%,#F6D3AE 70%,#EFC08A 100%)',
    dark: false,
  },
  {
    id: 'gift-packs',
    headline: 'Gift-ready dry fruits',
    sub: 'Premium packs for every occasion',
    cta: 'Shop gifts',
    product: 'Mixed Dry Fruits',
    to: '/products?category=dry-fruits',
    image: '/Product_Images/almond.jpg',
    bg: 'linear-gradient(110deg,#2F5D3A 0%,#3F7A4D 70%,#4C8C5A 100%)',
    dark: true,
  },
  {
    id: 'cod',
    headline: 'Cash on delivery available',
    sub: 'Pay when it reaches your door',
    cta: 'Shop makhana',
    to: '/products?category=makhana',
    image: '/Product_Images/Roasted_makhana.jpg',
    bg: 'linear-gradient(110deg,#F3E9D8 0%,#E6D6BD 70%,#DCC6A3 100%)',
    dark: false,
  },
];

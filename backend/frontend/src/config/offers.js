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
 *   image     a photo from /public (for example '/packaging/villagecrunch-range.jpg')
 *   bg        background CSS gradient (any valid CSS background value)
 *   dark      true  = light text on a dark background, false = dark text on a light background
 *   badge     OPTIONAL: small label above the headline, e.g. 'Coming soon'
 *   art       OPTIONAL: 'chhath' = built-in Chhath illustration; 'packs' = our pouches (set packs: ['thekua-200','thekua-400','thekua-800']);
 *             'arch' = the photo in an arched frame
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
    sub: 'Gud aur desi ghee wala thekua, ghar tak',
    cta: 'Shop thekua',
    to: '/products?category=thekua',
    art: 'chhath',
    bg: 'linear-gradient(110deg,#5E1409 0%,#9A2F10 55%,#C2410C 100%)',
    dark: true,
    from: '2026-10-10',
    until: '2026-11-16',
  },
  {
    id: 'ghar',
    badge: 'Ghar se door?',
    headline: 'Ghat door hai, suraj wahi hai',
    sub: 'Ghar nahi ja paa rahe? Bihar se ek dabba, hamari taraf se',
    cta: 'Dekhiye',
    to: '/ghar',
    art: 'arch',
    image: '/packaging/real-thekua-mould.jpg',
    bg: 'linear-gradient(110deg,#1E1226 0%,#4A2433 55%,#8E3B2A 100%)',
    dark: true,
    until: '2026-11-16',
  },
  {
    id: 'gift-box',
    badge: 'Diwali & Chhath',
    headline: 'Kaju katli nahi, thekua dijiye',
    sub: 'Festive Gift Box · 2 × 400 g',
    cta: 'Send a gift',
    to: '/diwali',
    image: '/packaging/gift-box.jpg',
    bg: 'linear-gradient(110deg,#FFF6E8 0%,#F7E3C2 70%,#EFCF9C 100%)',
    dark: false,
    until: '2026-11-12',
  },
  {
    id: 'makhana',
    headline: 'Chips nahi, makhana',
    sub: 'Chai ke saath · from ₹149 · Cash on delivery',
    cta: 'Shop makhana',
    to: '/products?category=makhana',
    image: '/packaging/makhana-range.jpg',
    bg: 'linear-gradient(110deg,#16302B 0%,#21453E 60%,#2E6A5F 100%)',
    dark: true,
  },
  {
    id: 'sattu',
    headline: 'Nana ji wala sattu',
    sub: 'Bas bhuna chana, kuch aur nahi · 500 g ₹149',
    cta: 'Shop sattu',
    to: '/products?category=sattu',
    image: '/packaging/sattu-500.jpg',
    bg: 'linear-gradient(110deg,#2C2912 0%,#423E1C 60%,#5F5A2C 100%)',
    dark: true,
  },
];

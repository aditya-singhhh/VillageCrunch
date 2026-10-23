// After `vite build`: write a copy of index.html per product and key page with its own
// <title>, description, canonical, social preview and Product structured data, so Google
// and WhatsApp/Facebook previews see real content without running JavaScript.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '..', 'dist');
const SITE = 'https://villagecrunch.in';
const base = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
// The product list lives in backend/scripts. It isn't present in every build (e.g. the
// server's Docker build only copies the frontend), so skip product pages when it's missing.
const seedFile = [path.join(here, '..', '..', 'scripts', 'seedProducts.json')].find((f) => fs.existsSync(f));
const products = seedFile
  ? JSON.parse(fs.readFileSync(seedFile, 'utf8')).filter((p) => p.isActive !== false)
  : [];
if (!seedFile) console.log('prerender-meta: product list not found, writing key pages only');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n = 158) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s; };
const abs = (u) => (!u ? `${SITE}/images/villagecrunch-logo.png` : u.startsWith('http') ? u : `${SITE}${u}`);

const render = ({ urlPath, title, description, image, type = 'website', jsonLd }) => {
  let h = base;
  const set = (re, val) => { h = re.test(h) ? h.replace(re, val) : h.replace('</head>', `    ${val}\n  </head>`); };
  set(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  set(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`);
  set(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${SITE}${urlPath}" />`);
  set(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${type}" />`);
  set(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`);
  set(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}" />`);
  set(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(image)}" />`);
  set(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${SITE}${urlPath}" />`);
  set(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`);
  set(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(description)}" />`);
  set(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(image)}" />`);
  if (jsonLd) h = h.replace('</head>', `    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n  </head>`);
  return h;
};

const write = (urlPath, html) => {
  const file = path.join(dist, `${urlPath.replace(/^\//, '')}.html`); // cleanUrls: /x -> x.html
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
};

let n = 0;
for (const p of products) {
  const urlPath = `/product/${p._id}`;
  const title = `${p.name} | Buy online · VillageCrunch`;
  const description = clip(`₹${p.price} · ${p.description || p.name}`);
  const image = abs(p.image);
  const inStock = (p.stock ?? 1) > 0;
  write(urlPath, render({
    urlPath, title, description, image, type: 'product',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Product',
      name: p.name, description: clip(p.description || p.name, 500), image: [image, ...(p.images || []).map(abs)].slice(0, 5),
      sku: String(p._id), brand: { '@type': 'Brand', name: 'VillageCrunch' }, category: p.category,
      offers: {
        '@type': 'Offer', url: `${SITE}${urlPath}`, priceCurrency: 'INR', price: String(p.price),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', name: 'VillageCrunch' },
      },
    },
  }));
  n++;
}

const pages = [
  ['/products', 'Shop thekua, makhana & sattu from Bihar | VillageCrunch', 'Thekua made with jaggery and desi ghee, phool makhana and sattu. Fresh from Bihar, delivered across India. Free delivery above ₹500.', '/packaging/thekua-sizes.jpg'],
  ['/diwali', 'Diwali gift boxes from Bihar | VillageCrunch', 'Is baar kaju katli nahi. Madhubani-style gift boxes with thekua and makhana, for family and corporate gifting. Order by 3 November.', '/packaging/gift-heritage-box.jpg'],
  ['/ghar', 'Ghat door hai, suraj wahi hai · Chhath 2026 | VillageCrunch', 'Is Chhath ghar nahi ja paa rahe? Bihar se aapke liye ek dabba, hamari taraf se.', '/packaging/ghar-box.jpg'],
  ['/about', 'About VillageCrunch | Thekua and makhana from Bihar', 'VillageCrunch brings Bihar ka swad to your home: thekua, makhana and sattu, natural and made fresh.', '/packaging/real-thekua-basket.jpg'],
  ['/contact', 'Contact VillageCrunch', 'Questions about your order, bulk or corporate gifting? Call or write to VillageCrunch.', null],
];
for (const [urlPath, title, description, img] of pages) {
  write(urlPath, render({ urlPath, title, description, image: abs(img) }));
  n++;
}
console.log(`prerender-meta: wrote ${n} pages`);

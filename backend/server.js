require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');
const connectDB = require('./config/db');
const DEFAULT_PUBLIC_SITE_URL = 'https://villagecrunch.in';

const isPrivateHost = (hostname) => {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.endsWith('.local')
    || /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
};

const getPublicSiteUrl = () => {
  const configuredUrl = process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.FRONTEND_URL || DEFAULT_PUBLIC_SITE_URL;

  try {
    const parsedUrl = new URL(configuredUrl);
    if (isPrivateHost(parsedUrl.hostname)) {
      return DEFAULT_PUBLIC_SITE_URL;
    }

    return parsedUrl.origin;
  } catch (error) {
    return DEFAULT_PUBLIC_SITE_URL;
  }
};
const { UPLOAD_ROOT, dirs: uploadDirs } = require('./config/uploads');
const { apiRateLimit, authRateLimit, publicFormRateLimit } = require('./middleware/security');

const isProd = process.env.NODE_ENV === 'production';

// --- Fail fast on unsafe configuration -------------------------------------------
if (!process.env.JWT_SECRET || (isProd && process.env.JWT_SECRET.length < 32)) {
  console.error('❌ JWT_SECRET must be set (and at least 32 characters in production). Refusing to start.');
  process.exit(1);
}
if (isProd && !process.env.FIRESTORE_EMULATOR_HOST && !process.env.K_SERVICE &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_CLOUD_PROJECT) {
  console.error('❌ No Firestore target: run on Cloud Run, or set GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS, or FIRESTORE_EMULATOR_HOST.');
  process.exit(1);
}

// Initialize app
const app = express();

// Behind Nginx/Caddy/load balancer: needed so rate limiting sees the real client IP
app.set('trust proxy', parseInt(process.env.TRUST_PROXY || '1', 10));
app.disable('x-powered-by');

// Connect to Firestore
connectDB();

// --- Middleware ---
// Use helmet but customize Content Security Policy to allow Razorpay script.
// Analytics (GA4 / Facebook Pixel) is blocked by default; set CSP_ALLOW_ANALYTICS=true on the
// public production site to allow them. Their bootstrap snippets are injected inline, which
// is why 'unsafe-inline' is required for scripts in that mode - keep it off for internal hosting.
const allowAnalytics = process.env.CSP_ALLOW_ANALYTICS === 'true';
const analyticsScripts = allowAnalytics
  ? ["'unsafe-inline'", 'https://www.googletagmanager.com', 'https://connect.facebook.net']
  : [];
const analyticsConnect = allowAnalytics
  ? [
      'https://www.google-analytics.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://www.googletagmanager.com',
      'https://www.facebook.com',
      'https://connect.facebook.net',
    ]
  : [];

app.use(
  helmet({
    // Keep default protections, but override CSP
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://checkout.razorpay.com', ...analyticsScripts],
        scriptSrcElem: ["'self'", 'https://checkout.razorpay.com', ...analyticsScripts],
        connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com', ...analyticsConnect],
        frameSrc: ["'self'", 'https://checkout.razorpay.com', 'https://api.razorpay.com'],
        imgSrc: ["'self'", 'data:', 'https://*'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // product images are embedded cross-origin
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
// Strip query operators ({"$gt": ""}) from user input and block HTTP parameter pollution
app.use(mongoSanitize());
app.use(hpp());

// --- CORS Configuration ---
// Origins come from the environment; localhost is only allowed outside production.
const allowedOrigins = [
  ...(process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()),
  process.env.FRONTEND_URL,
  // Public addresses of the live site (custom domain + Firebase defaults)
  'https://villagecrunch.in',
  'https://www.villagecrunch.in',
  'https://villagecrunch.web.app',
  'https://villagecrunch.firebaseapp.com',
  ...(isProd ? [] : ['http://localhost:5173', 'http://localhost:8080']),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin / server-to-server requests have no Origin header
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true
  })
);

// --- Serve uploaded files (persistent volume, see config/uploads.js) ---
app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '7d' }));
app.use('/Product_Images', express.static(uploadDirs.products, { maxAge: '7d', fallthrough: true }));
app.use('/Review_Images', express.static(uploadDirs.reviews, { maxAge: '7d', fallthrough: true }));

// --- Rate limiting ---
app.use('/api', apiRateLimit);
app.use(
  [
    '/api/auth/login',
    '/api/auth/admin/login',
    '/api/auth/register',
    '/api/auth/phone',
    '/api/auth/forgot-password',
    '/api/auth/verify-otp',
    '/api/auth/reset-password',
  ],
  authRateLimit
);
app.use(['/api/contact', '/api/promocodes/validate'], (req, res, next) =>
  req.method === 'POST' ? publicFormRateLimit(req, res, next) : next()
);

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/live-orders', require('./routes/liveOrders'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/promocodes', require('./routes/promocodes'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/seo', require('./routes/seo'));
app.use('/api/support', require('./routes/support'));
app.use('/api/ghar', require('./routes/ghar'));

// --- Health Check ---
let healthCache = { at: 0, ok: false };
app.get('/api/health', async (req, res) => {
  // Probe Firestore at most every 10s so health checks stay cheap
  if (Date.now() - healthCache.at > 10000) {
    try {
      await db.ping();
      healthCache = { at: Date.now(), ok: true };
    } catch (_) {
      healthCache = { at: Date.now(), ok: false };
    }
  }
  res.status(healthCache.ok ? 200 : 503).json({
    status: healthCache.ok ? 'OK' : 'DEGRADED',
    database: healthCache.ok ? 'connected' : 'unreachable',
    uptime: Math.round(process.uptime()),
  });
});

// --- SEO Routes (at root level for better crawling) ---
// Direct implementation to avoid routing issues
app.get('/sitemap.xml', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const baseUrl = getPublicSiteUrl();
    
    // Static pages
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: '/about', priority: '0.8', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/products', priority: '0.9', changefreq: 'daily' },
      { url: '/diwali', priority: '0.9', changefreq: 'weekly' },
      { url: '/ghar', priority: '0.8', changefreq: 'weekly' },
      { url: '/products?category=thekua', priority: '0.8', changefreq: 'weekly' },
      { url: '/shipping-policy', priority: '0.5', changefreq: 'yearly' },
      { url: '/returns-policy', priority: '0.5', changefreq: 'yearly' },
    ];

    // Get all products
    const products = await Product.find({ isActive: { $ne: false } }, '_id name updatedAt').lean();

    // Generate XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add static pages
    staticPages.forEach(page => {
      sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    // Add product pages
    products.forEach(product => {
      const lastmod = product.updatedAt ? 
        new Date(product.updatedAt).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      
      sitemap += `
  <url>
    <loc>${baseUrl}/product/${product._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).set('Content-Type', 'application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://villagecrunch.in</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  }
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = getPublicSiteUrl();
  
  const robotsTxt = `User-agent: *
Allow: /

# Disallow admin and user-specific pages
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /profile
Disallow: /orders
Disallow: /wishlist
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password

# Allow important pages
Allow: /
Allow: /products
Allow: /product/
Allow: /about
Allow: /contact
Allow: /shipping-policy
Allow: /returns-policy

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (optional)
Crawl-delay: 1`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

// --- Serve React Frontend (build output lives in backend/frontend/dist) ---
const distDir = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(distDir));

// Catch-all handler: send back React's index.html file (but exclude API and SEO routes)
app.get('*', (req, res) => {
  // Don't serve React app for API or SEO routes
  if (req.path.startsWith('/api/') || req.path === '/sitemap.xml' || req.path === '/robots.txt') {
    return res.status(404).json({ error: 'Route not found' });
  }
  res.sendFile(path.join(distDir, 'index.html'));
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Upload validation problems (file type/size) are the client's fault
  if (err.name === 'MulterError' || /Only (image|JPEG)/.test(err.message || '')) {
    return res.status(400).json({ message: err.message });
  }
  res.status(err.status || 500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

// Graceful shutdown (docker stop / systemd restart)
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => db.disconnect().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
};
['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));

module.exports = app;

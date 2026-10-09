# E-commerce enhancement roadmap

Grounded in what the code does today. Effort: S ≈ days, M ≈ 1–2 weeks, L ≈ a month.

## P0 — protect revenue (do first)
| Item | Why | Effort |
|---|---|---|
| **Razorpay webhook** (`payment.captured`) creating/confirming the order server-side | Today the order is created by the browser *after* payment. If the tab closes, the customer is charged with no order (a paid `LiveOrder` is orphaned). | S–M |
| **Refunds & cancellations** (customer cancel before shipping, admin refund via Razorpay API, stock restored) | No refund/return flow exists; returns policy is static text. | M |
| **Real Shiprocket integration** (rate check, create shipment, AWB, tracking webhook → order status) | Docs claim it is complete but all Shiprocket files were empty stubs. | M |
| **Pincode serviceability + COD eligibility** at checkout | Avoids undeliverable orders and COD abuse. | S |

## P1 — conversion & retention
- Abandoned-cart recovery (carts are already persisted server-side) via email/WhatsApp.
- Order status notifications on every transition (confirmed → shipped → delivered) incl. WhatsApp.
- Product **variants** (250 g / 500 g / 1 kg) instead of separate products; bundles and festival gift hampers (thekua).
- Search & discovery: text index, filters (category, price, rating), sort, pagination (API currently returns all products).
- Back-in-stock alerts; "only N left" urgency from real stock (now accurate since stock is decremented).
- Guest checkout and phone-OTP login (India-first); UPI-first payment ordering.
- First-order and referral coupons using the existing promocode engine; loyalty points.
- Verified-purchase badge on reviews (orders ↔ reviews link already available).
- Subscriptions for repeat buys (makhana, dry fruits).

## P2 — India compliance & trust
- GST invoice PDF per order (GSTIN, HSN, tax split CGST/SGST/IGST) emailed automatically.
- FSSAI licence number, net weight/MRP/best-before displayed per legal-metrology rules for packaged food.
- Cookie/consent banner before enabling analytics; privacy policy and terms pages.

## P3 — performance & SEO
- Bundle is 557 kB: route-level code splitting (`React.lazy`) and splitting the 2.2k-line `Admin.jsx`.
- ~9 MB of images: convert to WebP/AVIF, responsive `srcset`, lazy loading.
- SEO is a stated goal but the site is a client-rendered SPA: add pre-rendering/SSR for product and category pages and `Product` JSON-LD with price/availability.
- Mongo indexes (Product text/category, Order by user/createdAt) and caching of public settings/product lists.

## P4 — engineering health
- Replace `console.log` security banners (they log full request bodies with PII) with structured logging (pino) and redaction.
- Use `express-validator` (installed but unused) for request validation on every route.
- Integration tests against MongoDB in CI; extend `backend/tests/`.
- Error tracking (Sentry) and uptime monitoring; staging environment with Razorpay test keys.
- Move to a single shared `Order`/`LiveOrder` lifecycle (they overlap today).

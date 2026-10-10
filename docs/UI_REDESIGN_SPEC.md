# VillageCrunch UI Redesign Spec

Scope: restyle and restructure the existing React + Vite + Tailwind 3 frontend (`backend/frontend`). No backend changes, no new routes, all existing behaviour (guest cart, server cart, Razorpay/COD, promocodes, admin) must keep working.

Screenshots (captured against the real frontend with the 13 seed products, 390x844 mobile and 1440x900 desktop; tall pages are cropped and the desktop shots downscaled to 960 px wide to keep the folder small) are in `docs/ui-audit/`: `home-m.png`, `home-d.png`, `products-*`, `product-*`, `cart-*`, `checkout-*`, `login-*`, `register-m`, `orders-*`, `admin-*`. Referred to below as `[home-m]` etc.

---

## 1. Audit: what is wrong today

Stack facts: Tailwind with 5 custom colours (`desi-brown #8B4513`, `desi-gold #D4AF37`, `desi-cream #F5E6D3`, `desi-terracotta #E07A5F`, `desi-green #3D5A40`), Poppins loaded from Google Fonts for everything, global component classes `.btn-primary`, `.btn-secondary`, `.card`, `.input-field` in `src/index.css`. 127 usages of `text-gray-400/500`, 66 of `bg-desi-gold`.

### Defects (ranked by customer impact)

| # | Defect | Where | Evidence |
|---|---|---|---|
| 1 | **Gold is used for everything and fails contrast.** White text on `#D4AF37` is about 2.1:1 (needs 4.5:1). Every primary button, "Add to Cart", "Pay", the active filter, link text ("Continue Shopping", "Sign up", "Forgot password?") and footer headings are low-contrast gold. | `index.css` `.btn-primary`, `.btn-secondary` (hover `yellow-600/800` is off-palette), all pages | [cart-d], [login-m], [products-m] |
| 2 | **Mobile product grid is one column** with 256 px tall images, so 12 products = 7,600 px of scrolling; no 2-up browsing, no sort, no price filter. Home "Recommended" is also 1 column. | `pages/Products.jsx:204,222` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), `Home.jsx` | [products-m], [home-m] |
| 3 | **Product page has no sticky buy bar on mobile**; Add to Cart is below the fold after description/promo box; price block, promo box, qty stepper and weight are loosely stacked; the title wraps to three huge lines. Benefits/ingredients (the persuasion content) are buried under the empty reviews section. | `pages/ProductDetail.jsx` | [product-m] |
| 4 | **Contradictory/empty social proof.** Product header says "(No ratings yet)" while the reviews panel shows "4.8" with 0 reviews; Home claims "10k+ Happy Customers" and "24/7 Support" (hard-coded, `Home.jsx:201,205`), a "Real Reviews from Real Customers" block that contains no reviews, "Thousands of satisfied customers". This damages trust. | `Home.jsx`, `ProductDetail.jsx`, `ReviewList.jsx` | [home-m], [product-m] |
| 5 | **Checkout has friction and weak hierarchy.** Delivery Address card is a heading with nothing in it, followed by a second "Contact Information" card (double headings); City/State are free text with no PIN-first autofill order; the primary CTA says "Pay ₹2474.46" while Online is preselected, so COD users (a large share in India) must notice the second radio; trust cues (Razorpay/UPI logos, COD note, returns) are absent; order summary is below the form on mobile. Cart page on mobile also places the Order Summary *above* the items. | `pages/Checkout.jsx`, `pages/Cart.jsx:366` | [checkout-m], [cart-m] |
| 6 | **Price display is inconsistent and noisy.** Prices render as `₹1198.00` / `₹2097.00` (decimals on whole rupees, no thousands separator), a 18% GST line is added on top at the end (total jumps from 2097 to 2474.46 on the cart page, a surprise to shoppers), "FREE" shipping is shown in green with no free-shipping threshold nudge. | `Cart.jsx`, `Checkout.jsx`, `Orders.jsx`, `ProductCard.jsx` | [cart-d] |
| 7 | **Admin is not responsive**: page scrolls horizontally on mobile (document is 619 px wide at a 390 px viewport), tab strip is cut off ("Products Management", "Promocodes", "Settings" overflow), table columns are clipped (email truncated, order table shows only 2 columns). 3,193-line single file. | `pages/Admin.jsx` | [admin-m] |
| 8 | **Floating chatbot collides with content** on every page: a gold 56 px circle with a red "Villy" badge sits over product titles, forms, the first hero image and the cart controls on mobile; the open panel is `w-96` (384 px) on a 390 px screen. | `components/AIChatbot.jsx:557,572` | [product-m], [login-m], [orders-m] |
| 9 | **Brand feel is generic, not premium/earthy.** One font (Poppins 700 for every heading), flat gold + brown blocks, strong 2xl shadows, `hover:scale-[1.02]`/`scale-110` effects, emoji used as icons (💡 🎉 ✨ 🔒 ❤️), a tiny low-res logo on a beige square that does not match the white navbar, big pale-striped `pattern-bg` background. No gift-led merchandising despite gifting being the core use case. | `index.css`, `Navbar.jsx`, `Home.jsx` | [home-d], [home-m] |
| 10 | **Navbar/mobile ergonomics.** Header is 80 px tall on mobile (too heavy); cart, account and hamburger icons are ~24 px glyphs with no padding (tap target under 44 px); no search in header; desktop "Login" is a gold button with white text (fails contrast); no bottom nav or sticky cart bar. | `components/Navbar.jsx:21-60` | [home-m] |
| 11 | **Scroll-reveal hides content.** `useScrollReveal` starts elements at opacity 0 until an IntersectionObserver fires; in full-page captures large areas (home carousel, hero tail, features) were blank, and anything that fails to intersect (print, reader mode, slow devices, `prefers-reduced-motion`) stays invisible. Home mobile has ~1,100 px of empty beige before the carousel. | `hooks/useScrollReveal.js`, `Home.jsx`, `index.css` animations | [home-d] blank band under features |
| 12 | **Product cards are weak**: images use mixed backgrounds/crops (black, white, wooden), no consistent aspect ratio or background; discount shown as terracotta "33% OFF" pill that looks like an error; no rating, no "Bestseller"/"Gift" tag, no unit price (₹/100g), title wraps unpredictably, hover scale effect has no touch equivalent. Category slug leaks into UI ("dry-fruits" badge). | `components/ProductCard.jsx`, `ProductDetail.jsx` | [products-m], [product-m] |
| 13 | **Forms**: `.input-field` uses `border-2 border-gray-300` and removes the outline with only a border colour change (gold on white = weak focus indicator); placeholders clipped ("Enter your email or phone numb"); helper text 12 px grey; no `inputMode`/`autocomplete`/`type="tel"` hints evident; "Remember me" checkbox is tiny. | `index.css .input-field`, `Login.jsx`, `Register.jsx`, `Checkout.jsx` | [login-m] |
| 14 | **Dead vertical space and background seams.** A white gap appears between `<main>` and the footer on cart/login/orders (page bg `bg-gray-50` stops short of the footer), cold grey page background clashes with warm cream/gold. | `App.jsx` (`flex-grow` wrapper), each page's own `bg-*` | [cart-d], [login-m] |
| 15 | **Overflow bugs**: "Apply" promocode button overflows the Order Summary card on desktop (right edge sticks out); orders list item titles wrap one word per line next to a right-aligned price. | `Cart.jsx` promo row, `Orders.jsx` | [cart-d], [orders-m] |
| 16 | **Footer** is a flat brown slab with gold headings (low contrast on `#8B4513`), copyright text in grey on brown (about 3:1), "Masala & Spices" link although masala is "coming soon" (blocked in `CartContext`), Twitter icon, no payment/trust row, phone number not tappable context (`tel:` check). | `components/Footer.jsx` | [cart-d] |
| 17 | **Accessibility/perf basics.** Only 1 `focus:` style in `Login.jsx`; icon-only buttons (delete, qty, carousel arrows) need `aria-label`; carousel dots are tiny; 66 gold backgrounds with white text; `loading="lazy"` appears only twice; `public/Product_Images` is 3.9 MB of unresized JPEG/PNG/WEBP (some >500 KB) served raw at card sizes; Poppins 5 weights render-blocking; no `width/height` on images (layout shift). | repo-wide | n/a |

---

## 2. Design direction

**"Bihari pantry meets modern gifting."** Warm paper-cream backgrounds, deep roasted-brown text and chrome, a single saffron-orange action colour (replacing mustard gold) that passes contrast, and a serif display face for headlines to give a premium, heritage tone, paired with a clean humanist sans for UI and prices. Product photography sits on a consistent warm tile; spacing is generous but mobile pages are compact and thumb-first (2-up grid, sticky buy bars, 48 px controls). Decoration is minimal: thin rules, small rounded corners, soft low shadows, no scale-hover gimmicks.

---

## 3. Design tokens

Implement in `tailwind.config.js` (`theme.extend`) and as CSS variables in `index.css :root`. Keep the old `desi-*` names mapped to the new values during migration so nothing breaks, then delete them.

### 3.1 Colour

| Token (Tailwind name) | Hex | Use |
|---|---|---|
| `paper` | `#FBF6EE` | page background |
| `cream` | `#F3E9D8` | alternate sections, image tile bg, chips |
| `sand` | `#E6D6BD` | borders/dividers on cream |
| `line` | `#E9DFCF` | 1 px borders on white |
| `surface` | `#FFFFFF` | cards, inputs, sheets |
| `ink` | `#2B1D14` | body and headings (contrast 15:1 on paper) |
| `ink-soft` | `#5E4A3C` | secondary text (7:1) |
| `ink-mute` | `#7A6759` | captions, placeholders (4.8:1 on paper; never lighter) |
| `brand` (roasted brown) | `#6B3A1E` | logo, headings accents, footer bg, secondary button |
| `brand-dark` | `#4A2713` | footer bottom bar, pressed state |
| `action` (saffron) | `#C2410C` | primary buttons, links, active states (white on it 5.2:1) |
| `action-dark` | `#9A3412` | primary hover/pressed |
| `action-tint` | `#FDEBDD` | selected chip bg, focus halos |
| `gold` | `#B8860B` | decoration only (stars, rules, icons); never text on white smaller than 18 px |
| `leaf` | `#2F5D3A` | success, "In stock", veg/natural badges (7:1) |
| `leaf-tint` | `#E6F0E4` | success bg |
| `berry` | `#B42318` | errors, sale price, remove (6:1) |
| `berry-tint` | `#FDECEA` | error bg |
| `focus` | `#1D4ED8` | 2 px keyboard focus ring, offset 2 px (all interactive elements) |

Rules: one primary action per screen uses `action`; gold is never a fill behind white text; sale price in `berry`, MRP struck in `ink-mute`; discount badge is `leaf` background with white text ("Save 25%") rather than terracotta.

### 3.2 Typography

Fonts (Google Fonts, replace the current Poppins link in `index.html:60`, add `display=swap`, drop unused weights):

- Display: **Fraunces** (variable, opsz 9..144) weights 600/700, headings H1-H3 and the wordmark.
  `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap`
- UI/body: **Inter** 400/500/600 (best rendering of the rupee glyph "₹" and numerals; tabular nums available).
- Tailwind: `fontFamily: { display: ['Fraunces','Georgia','serif'], sans: ['Inter','system-ui','-apple-system','Segoe UI','Roboto','sans-serif'] }`.
- Fallback if Google Fonts must be avoided: Georgia for display, system-ui for body.
- Prices: `font-sans font-semibold tabular-nums`.

Scale (mobile / >=768 px), line-height in parentheses:

| Role | Mobile | Desktop | Font/weight |
|---|---|---|---|
| Display (hero H1) | 34/38 | 56/60 | Fraunces 700 |
| H1 page title | 28/34 | 40/46 | Fraunces 700 |
| H2 section | 24/30 | 32/38 | Fraunces 600 |
| H3 card/section sub | 18/24 | 20/28 | Fraunces 600 or Inter 600 |
| Body | 16/24 | 16/26 | Inter 400 |
| Small | 14/20 | 14/20 | Inter 400/500 |
| Caption / legal | 12/16 | 12/16 | Inter 400 (never below 12, never lighter than `ink-mute`) |
| Button | 16/20 | 16/20 | Inter 600 |
| Price large | 28/32 | 32/36 | Inter 600 |

Body text minimum 16 px on mobile (also prevents iOS input zoom). Max line length 65ch for prose.

### 3.3 Spacing, radius, shadow, motion

- Spacing base 4 px; use 4/8/12/16/24/32/48/64. Page gutter 16 px mobile, 24 px tablet, 32 px desktop; container `max-w-6xl` (1152) for content, `max-w-7xl` only for the header. Section vertical rhythm 40 px mobile, 72 px desktop.
- Radius: `sm 6px` (chips, badges), `md 10px` (inputs, buttons), `lg 16px` (cards, sheets), `full` (pills, icon buttons). Replace `rounded-xl/2xl/3xl` ad hoc usage.
- Shadow: `card: 0 1px 2px rgba(43,29,20,.06), 0 2px 8px rgba(43,29,20,.05)`; `raised: 0 8px 24px rgba(43,29,20,.12)` (drawers, sticky bars, dropdowns only). Remove `shadow-lg/xl/2xl` from cards.
- Motion: 150 ms ease-out for hover/press; drawers 250 ms. No `scale` hover on cards or buttons; use `active:scale-[.98]` on buttons only. Respect `prefers-reduced-motion` (disable all animations/reveal).
- Tap targets: minimum 44x44 px (buttons 48 px tall on mobile). Icon buttons are 44 px with a 24 px icon.

---

## 4. Component specs

Implement as updated Tailwind classes in `index.css @layer components`, replacing the existing ones (same class names where they exist so pages keep working).

### 4.1 Buttons
- `.btn` base: `inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md font-semibold text-base transition focus-visible:outline-2 outline-offset-2 outline-focus disabled:opacity-50 disabled:cursor-not-allowed`.
- `.btn-primary` (rename of existing): bg `action`, text white, hover `action-dark`. `.btn-secondary`: bg white, 1.5 px border `brand`, text `brand`, hover bg `cream`. `.btn-ghost`: text `action`, underline on hover. `.btn-danger`: text `berry`, border `berry`. `.btn-sm`: h-10 px-4 text-sm (desktop tables only). Full width on mobile in forms and cards (`w-full sm:w-auto`).
- Loading state: spinner replaces label, keep width, `aria-busy`.

### 4.2 Forms
- `.input-field`: h-12, `bg-white border border-[#CDBBA4] rounded-md px-4 text-base text-ink placeholder:text-ink-mute`, focus: `border-action ring-2 ring-action/25` plus visible outline in forced-colours. Error: `border-berry`, message below in `berry` 14 px with an icon, linked by `aria-describedby`.
- Label above field, 14 px/500 `ink`, required marked with "(required)" text not just `*`; helper text 14 px `ink-soft`.
- Set `type`, `inputMode`, `autoComplete`: phone `type="tel" inputMode="numeric" autoComplete="tel-national" maxLength=10`, PIN `inputMode="numeric" maxLength=6 autoComplete="postal-code"`, email `type="email" autoComplete="email"`, name `autoComplete="name"`, street `autoComplete="address-line1"`.
- Checkbox/radio: 24 px visual with 44 px row hit area; radio cards (payment, address) = bordered `rounded-lg` row, selected state `border-action bg-action-tint`.

### 4.3 Header / navigation
- Mobile (<768): height 56 px, white-on-paper (`bg-paper/95 backdrop-blur`), left: hamburger (44 px), centre: wordmark (Fraunces 700, 22 px, `brand`, "Village" + "Crunch" with "Crunch" in `action`), right: search icon (opens a full-width search row below the header) and cart icon with count badge (`bg-action text-white`, 18 px circle). Account moves into the drawer.
- Hamburger opens a left drawer (width 85 %, `max-w-xs`): links Shop All, Dry Fruits, Makhana, Thekua, Gift Boxes (links to `/products?category=` existing categories only), About, Contact, then My Orders / Wishlist / Profile / Login or Logout, then WhatsApp/phone. Close on route change, focus trap, `aria-modal`, ESC.
- Add a **mobile bottom tab bar** (fixed, 56 px + safe-area): Home, Shop, Cart (badge), Account. Hidden on checkout and admin. This replaces most header icons' tap-target problem; add `pb-[calc(56px+env(safe-area-inset-bottom))]` to `<main>` on mobile.
- Desktop: 72 px; logo left, nav centre (Shop, Dry Fruits, Makhana, Thekua, About, Contact; 15 px/500, active has 2 px `action` underline), search input (expands, 260 px) and icons right; Login is a `btn-ghost`, not a gold fill.
- Top announcement bar (36 px, `brand` bg, 13 px cream text, dismissible, only shows content already true on the site, e.g. "Free delivery on orders above ₹X" using the existing shipping rule; read the threshold from the existing shipping logic, do not invent one).
- Logo: replace the beige-boxed raster with an SVG/transparent wordmark (`public/images/villagecrunch-logo.png` has the asset; export a transparent version or render text).

### 4.4 Hero (Home)
- Mobile: image first (4:3, `rounded-lg`, bg `cream`, thekua/makhana composition), then eyebrow "Straight from Bihar" (12 px caps, `gold`), H1 "Dry fruits, makhana & thekua, packed fresh." (Display), one sentence of body (max 2 lines), primary CTA "Shop bestsellers" (full width) and a text link "Gift boxes". Replace the three fake stats with three factual chips that are true and static ("Hand-picked", "Packed in Bihar", "COD available"), no "10k+" or "24/7".
- Desktop: two columns (copy 5/12, image 7/12), min-height 520 px, `paper` to `cream` vertical gradient, no pattern background.
- Remove the floating "Premium Quality" badge overlay or make it a static caption under the image.

### 4.5 Product card (`ProductCard.jsx`, `RatableProductCard.jsx`)
- Layout: image tile (aspect-square, bg `cream`, `object-cover`, `loading="lazy"`, explicit `width/height`), badge top-left, wishlist heart top-right (44 px hit area), body: category label (12 px caps `ink-mute`, human text e.g. "Dry fruits" via a `formatCategory` helper mapping slugs), title (16/22 Inter 600, `line-clamp-2`, min-height 2 lines), weight chip, rating (only if `reviews.length > 0`: star + avg + count; else nothing), price row (sale price 18 px 600 `ink`, MRP struck `ink-mute`, "Save 25%" `leaf` text), unit price caption (`₹X / 100 g`, only when weight parses as g/kg), then full-width "Add to cart" button (`btn-primary`, 44 px on card, `btn-sm` text 14).
- Grid: `grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4`. Cards: `bg-white rounded-lg border border-line shadow-card`, no hover scale; hover raises border to `sand` and image zooms 1.03 (desktop only, `@media (hover:hover)`).
- Out of stock: dimmed image, disabled button "Notify via WhatsApp/Contact" text "Out of stock".
- Badges (max one): "Bestseller" (`brand` bg), "Save N%" (`leaf` bg), "New". Text white, 12 px 600, `rounded-sm`.
- Cart add feedback: button briefly shows "Added" with check (1.5 s) and the existing toast is moved to bottom-centre above the tab bar.

### 4.6 Listing page filters (`Products.jsx`)
- Replace the large left-card "Categories + Search" with: sticky chip row under the header (horizontal scroll, `snap-x`, chips 40 px: All, Dry Fruits, Makhana, Thekua; selected chip `bg-brand text-white`, others white with `line` border), search field above the chips (always visible, 48 px, magnifier inside, no separate Search button, debounce 300 ms), and a "Sort" select (Featured, Price low to high, Price high to low; client-side sort of loaded products) at the right of the result count.
- Desktop: keep chips, add a 240 px left rail only if more filters get added later; otherwise full-width grid.
- Replace the full-width gradient "Our Products" banner with a compact H1 + one-line description (48 px tall block on mobile).
- Empty state: illustration-free text, "No products match 'x'", button "Clear search".

### 4.7 Product page (`ProductDetail.jsx`)
Order on mobile: back/breadcrumb (Home / Category / Name, 14 px) → gallery (square, swipeable with dots; thumbnails hidden on mobile; `object-contain` on `cream`) → title (H1 24/30 Fraunces) → rating line (real data only; hide when 0 reviews; fix the 4.8 vs "No ratings yet" mismatch by deriving both from the same `reviews` array) → price block (sale price 28, MRP, "Save ₹200 (25%)" in `leaf`, "Inclusive of all taxes" caption if true, unit price) → weight selector (chip, read-only if single) → short description (3 lines + "Read more") → trust strip (3 items, 2 lines each: "Packed fresh", "Easy returns" linking to `/returns-policy`, "Pay by UPI, card or COD") → collapsible accordions "Benefits", "Ingredients", "Shipping & returns" (use `<details>`; Benefits open by default) → Reviews (summary only when count > 0; otherwise a single line "Be the first to review after you order") → Related products (horizontal scroll row, card width 160 px).
- Remove the "Promotional Offers Available" box; replace by a one-line link "Have a promo code? Apply it in your cart" only when promocodes exist (otherwise nothing).
- **Sticky buy bar (mobile)**: fixed bottom (above tab bar hidden here), `bg-white shadow-raised`, padding 12 px: stepper (44 px buttons) + "Add to cart · ₹599" `btn-primary` flex-1. Secondary "Buy now" is a text link above the bar's CTA only if existing logic supports it (do not add behaviour).
- Desktop: two columns (gallery 55 %, buy box 45 % sticky `top-24`), thumbnails vertical left of main image.
- Qty stepper: 44 px buttons, min 1, max min(stock, 10), `aria-label` "Decrease quantity", disabled state obvious (grey `sand` icon).

### 4.8 Cart (`Cart.jsx`) and cart drawer
- Add a **mini-cart drawer** opened by the header cart icon on desktop and after "Add to cart" on desktop (right-hand 420 px panel, `raised` shadow, line items with qty stepper, subtotal, "Checkout" `btn-primary`, "View cart" ghost). On mobile the cart icon / tab goes to `/cart` as today. Implementation: new `components/CartDrawer.jsx` reading `useCart()` (no API change).
- Cart page mobile order: items first, then promo, then summary, then fixed bottom bar showing total and "Checkout" (`btn-primary`). Desktop: items left (8/12), summary right (4/12, sticky).
- Line item: 80 px image tile, title (2 lines), weight, unit price, stepper left and remove ("Remove" text link, `berry`, 44 px hit) right, line total right-aligned. No red trash icon alone.
- Money format helper `formatINR(n)`: `new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits: Number.isInteger(n)?0:2}).format(n)` -> `₹1,198`, `₹2,474.46`. Use everywhere (cart, checkout, orders, cards, admin).
- Summary rows: Subtotal, Discount (leaf, only if > 0), Shipping ("Free" in `leaf`, or amount), GST line shown as "Includes GST ₹X" only if prices are GST-inclusive; otherwise label "GST (18%)" and also show it already on the product page as "+ GST" — whichever matches the actual pricing logic in `priceCart`, but the **total must be foreshadowed before checkout** (add caption under product price). Total row 20 px 600.
- Promo field: input + Apply button in a flex row with `min-w-0` on the input (fixes overflow), applied code shown as removable chip.
- Free-shipping nudge: progress bar "Add ₹X more for free delivery" only if a threshold exists in the existing shipping rules.

### 4.9 Checkout (`Checkout.jsx`)
- Single page, sections as numbered cards in one column on mobile (max-w-xl), two columns on desktop (form 7/12, sticky summary 5/12). Mobile: collapsible summary at top ("Order summary (3 items) ₹2,474 v") and compact final summary above the pay button.
- Section 1 **Contact** (name, phone, optional email if already collected). Section 2 **Delivery address**: saved-address radio cards first (if the user has some), then the form: Pincode first (6 digits), City and State next, then Flat/House + Street, landmark optional. Merge the two stacked headings ("Delivery Address" / "Shipping Information" / "Contact Information") into one heading per card. "Save this address" is a plain checkbox row, not a highlighted box.
- Section 3 **Payment**: two radio cards. Order and default as they are in logic, but labels: "UPI / Cards / Net banking (Razorpay)" with small method icons and "Secure payment by Razorpay", and "Cash on delivery" with note "Pay when the parcel arrives" (and COD fee/limit text only if the existing logic has one). The CTA label changes with the choice: "Pay ₹2,474" for online, "Place order · ₹2,474" for COD.
- CTA: sticky bottom bar on mobile with total + button; below it a one-line reassurance (lock icon, "Secure checkout", "Easy returns", link to policies). Disable and show inline errors; scroll to first error.
- Trust row under the form: Razorpay secured, 7-day return link (text must match `ReturnsPolicy`), support phone link `tel:`.
- Keep all existing validation, Razorpay flow and `navigate('/order/:id')`.

### 4.10 Auth pages (Login, Register, Forgot/Reset)
- Centered card `max-w-md`, on `paper` background (no gradients), wordmark above, H1 "Welcome back" (Fraunces 28), 48 px inputs, show/hide password toggle (44 px), "Forgot password?" right-aligned `btn-ghost`, primary full-width button, divider, secondary "Create an account" `btn-secondary` full width (instead of tiny gold "Sign up" link). "Remember me" 24 px checkbox with 44 px row.
- Register: group Name/Phone/Email/Password, show password rules inline, single column.
- Remove the stray "Your information is secure with us" padlock emoji; use an SVG icon + same text, 14 px `ink-soft`.

### 4.11 Orders / account (`Orders.jsx`, `OrderDetail.jsx`, `Profile.jsx`, `Wishlist.jsx`)
- Order card: header row (order number 14 px mono-ish, date, status pill) then items as 56 px thumbs with title one per line (`line-clamp-2`, `min-w-0`) and `Qty 2 · 500 g`, total at the bottom, buttons "View details" (`btn-secondary`) and "Rate products" when delivered. Status pills use semantic tints: placed/confirmed `action-tint`, shipped `cream`+brown, delivered `leaf-tint`, cancelled `berry-tint`; text + icon (not colour alone).
- Move "Rate Your Products" from a gold page-level button to a text link in the page header.
- Order detail: vertical status timeline (Placed → Confirmed → Shipped → Delivered), address, payment mode, price breakdown, "Need help?" link to `/support`.
- Profile: two tabs (Details, Addresses) as the existing sections, 48 px inputs, address cards with Edit/Delete as text buttons.

### 4.12 Footer
- Background `brand-dark #4A2713`, text cream `#F3E9D8` (11:1), headings Fraunces 600 cream (not gold), links 15 px with 44 px row height on mobile; accordion sections on mobile (Shop, Help, Contact) to cut 900 px of footer to about 300 px; bottom row 13 px `#D9C7AE` on `#3A1E0F`.
- Content: wordmark + one-line promise, Shop (All, Dry Fruits, Makhana, Thekua), Help (Shipping Policy, Returns & Refunds, Contact, About, Support), Contact (`tel:`, `mailto:`, WhatsApp link if the number is WhatsApp-enabled), social icons (Instagram, Facebook; remove Twitter unless the account exists), payment line "UPI · Visa · Mastercard · RuPay · COD" as text/SVG chips. Remove "Masala & Spices" link until the category is purchasable. Update copyright year dynamically (`new Date().getFullYear()`).

### 4.13 Chatbot launcher (`AIChatbot.jsx`)
- Mobile: move the launcher into the header as a 44 px "Help" icon or lift it above the bottom tab bar and shrink to 48 px, `bottom: calc(72px + env(safe-area-inset-bottom))`, right 16 px, no pulsing "Villy" badge; hide on product pages (sticky buy bar), cart and checkout. Open panel: full-screen sheet on mobile (`inset-0`), `w-96 h-[600px]` only from `md`. Panel header uses `brand` bg.

### 4.14 Admin (`Admin.jsx`)
Keep functionality; restyle and make usable on small screens (P1/P2):
- Wrap everything in `max-w-full overflow-x-hidden`, fix the 619 px overflow source (tab strip and tables).
- Tabs: horizontal scroll with `overflow-x-auto snap-x` and a fade edge; active tab underline `action`.
- Stats: 2-column grid on mobile (`grid-cols-2`), no 5 stacked full-width cards; use compact `StatCard` (label 12 px, value 24 px).
- Tables: on `<md` render rows as stacked cards (order #, customer, total, status select, "View") instead of clipped columns; on `>=md` keep tables with sticky header and `text-sm`.
- Use same tokens/buttons as storefront; admin pages do not show bottom tab bar, chatbot or announcement bar.
- Split `Admin.jsx` (3,193 lines) into per-tab components (`admin/OrdersTab.jsx`, `ContactsTab.jsx`, `ProductsTab.jsx`, `PromocodesTab.jsx`, `SettingsTab.jsx`) as a mechanical extraction (P2).

### 4.15 Misc shared
- Toasts (`App.jsx`): `position="bottom-center"` on mobile, `top-right` on desktop; style `background: ink; color: #fff; border-radius: 10px;` success icon `leaf`. Offset above tab bar.
- Skeletons: card-shaped `bg-cream animate-pulse` skeletons for product grids and product page instead of spinners.
- Empty states: icon (SVG, `ink-mute`), H3, one line, one `btn-primary`.
- Icons: keep `lucide-react`, stroke 1.75, 20/24 px; remove emoji used as UI icons.
- Images: add `width`/`height` + `loading="lazy"` + `decoding="async"` to all `<img>` except hero; hero image `fetchpriority="high"`.

---

## 5. Page-by-page layout changes

**Home** (`Home.jsx`, 444 lines): announcement bar → hero (4.4) → trust strip of 4 factual items (icon + 2 words; currently 4 columns of grey 12 px text) → "Shop by category" as a 2x2 grid on mobile (square tiles, 3 categories + "Gift boxes"/"All" tile; text overlay on gradient scrim `from-black/55`, white 18 px Fraunces) → "Bestsellers" horizontal scroll row (mobile) / 4-col grid (desktop) using the new card (replace the animated carousel with `overflow-x-auto snap-x`, no auto-advance, no blank stage) → "Gifting" banner (cream block, copy about festival/gift packs linking to existing thekua/dry-fruit items; only existing products) → "Why VillageCrunch" 3 short factual points + founders snippet (`FoundersSection` restyled, collapsed to 1 column) → real reviews strip rendered only if real review data exists, otherwise omit the whole section (delete the "Real Reviews from Real Customers" explainer) → "Recommended for you" (keep AIProductRecommendations, 2-up grid) → footer. Remove `useScrollReveal` gating on above-the-fold sections.

**Products**: compact title, search + chip row + sort (4.6), 2-up grid, load all (12-ish items; add "Load more" only if list exceeds 24).

**Product detail**: per 4.7.

**Cart**: per 4.8; items before summary on mobile (change DOM order with `order-` utilities or reorder JSX), sticky checkout bar.

**Checkout**: per 4.9.

**Login/Register**: per 4.10. **Forgot/Reset**: same shell.

**Orders / Order detail / Profile / Wishlist / RateProducts**: per 4.11; wishlist uses the same 2-up card grid.

**About / Contact / Shipping / Returns / Support**: apply the typography scale and `max-w-prose` for policy text, H2 section rhythm, accordion FAQs for policies; About is currently 4,200 px tall on desktop, trim hero and use the new section style.

**Admin**: per 4.14.

Global: `body { background: var(--paper); color: var(--ink); font-family: Inter }`; `main` gets `bg-paper min-h-[60vh]` so no white seam above the footer (fixes defect 14); remove per-page `bg-gray-50`/gradient backgrounds; `html { scroll-padding-top: 72px }`; `:focus-visible { outline: 2px solid #1D4ED8; outline-offset: 2px }`; `@media (prefers-reduced-motion: reduce) { *{animation:none!important;transition:none!important} }`; `viewport` meta already correct; update `theme-color` to `#6B3A1E`.

---

## 6. Prioritised task list

Each task lists files. Do P0 in order; each is independently shippable.

### P0 - fix conversion blockers and the "junk" first impression
1. **Tokens + fonts.** Update `tailwind.config.js` (colours, fonts, radius, shadows), `index.css` (`:root` vars, base styles, focus-visible, reduced-motion), `index.html` (fonts link, `theme-color`). Keep `desi-*` aliases pointing to new values (`desi-gold`->`action`, `desi-brown`->`brand`, `desi-cream`->`cream`) so every page recolours at once. Fixes defect 1 and half of 9.
2. **Buttons and inputs** (`index.css` `.btn-primary/.btn-secondary/.input-field/.card`, new `.btn-ghost`, `.chip`) per 4.1/4.2. 48 px heights, contrast-safe, visible focus. Replace hard-coded `bg-desi-gold ... text-white` / `bg-yellow-600` usages (grep `bg-desi-gold`, `yellow-`) with the classes.
3. **`utils/format.js`**: `formatINR`, `formatCategory`, `unitPrice`; apply in `ProductCard`, `RatableProductCard`, `ProductDetail`, `Cart`, `Checkout`, `Orders`, `OrderDetail`, `Wishlist`.
4. **Product card + 2-up grids** (`ProductCard.jsx`, `RatableProductCard.jsx`, `Products.jsx:204,222`, `Home.jsx`, `Wishlist.jsx`) per 4.5; fix image tile, badges, remove hover scale.
5. **Products page filters** (`Products.jsx`): search box with debounce, chip row, sort, compact heading (4.6).
6. **Product page** (`ProductDetail.jsx`): reorder sections, sticky mobile buy bar, accordions, fix rating mismatch, remove promo box (4.7).
7. **Cart + checkout mobile flow** (`Cart.jsx`, `Checkout.jsx`): items before summary, sticky CTA bars, pincode-first address, single headings, payment cards, CTA label per method, promo overflow fix (4.8/4.9).
8. **Header + bottom tab bar + drawer** (`Navbar.jsx`, new `components/BottomNav.jsx`, `App.jsx` main padding) per 4.3; 44 px targets, aria-labels, Login as ghost.
9. **Chatbot launcher** (`AIChatbot.jsx`) repositioned/hidden per 4.13 so it never covers content or CTAs.
10. **Remove false/empty trust claims** (`Home.jsx:195-210` stats, "Real Reviews" explainer section, ProductDetail empty rating panel) and replace with factual chips (4.4).

### P1 - brand polish and trust
11. **Hero + Home restructure** (`Home.jsx`, `FoundersSection.jsx`): 4.4 + page layout section; remove scroll-reveal on first screen and fix blank bands (`hooks/useScrollReveal.js`: default to visible if IntersectionObserver unsupported or reduced motion; `Home.jsx`).
12. **Footer** (`Footer.jsx`) 4.12 with mobile accordions; remove Masala link; dynamic year; `tel:`/`mailto:`.
13. **Auth pages** (`Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`) 4.10, autocomplete/inputMode attributes.
14. **Orders/OrderDetail/Profile** restyle and status pills with icons (4.11); fix title wrapping with `min-w-0`.
15. **Cart drawer** (`components/CartDrawer.jsx`, `Navbar.jsx`) for desktop (4.8).
16. **Toasts, skeletons, empty states** (`App.jsx`, per-page loaders) 4.15.
17. **Global layout seam**: `App.jsx` main background `bg-paper`, remove per-page backgrounds; unify page `<h1>` styles.
18. **Image optimisation**: resize `public/Product_Images/*` to 800 px wide WebP (+ JPEG fallback) targeting under 80 KB each (currently 3.9 MB folder, files up to 500 KB+); add `width/height/loading/decoding` attributes; preload hero image; produce 1x/2x `srcset` where easy. Update seed `image` paths only if file names change (prefer same names, new format via `<picture>` or keep `.jpg`).

### P2 - quality and maintainability
19. **Admin responsive pass** (`Admin.jsx`): fix horizontal overflow, scrollable tabs, 2-col stats, card-rows on mobile, tokens (4.14). Then split into per-tab components.
20. **Static pages** (`About.jsx`, `ContactUs.jsx`, `ShippingPolicy.jsx`, `ReturnsPolicy.jsx`, `CustomerSupport.jsx`): type scale, prose width, accordions.
21. **Accessibility sweep**: `aria-label` on icon buttons (cart delete, qty, carousel, wishlist, drawer), `aria-live` on toasts/cart count, form error association, `alt` review (product images use product names; decorative images `alt=""`), landmark roles (`<nav aria-label>`), skip-to-content link, check 200 % zoom, run axe/Lighthouse and target >= 95 accessibility on Home, Product, Checkout.
22. **Performance budget**: Fraunces/Inter only needed weights with `display=swap`, remove unused CSS in `index.css` (the carousel-slot/float keyframes if the carousel is removed), lazy-load `AIChatbot` (`React.lazy`) and Admin route; target LCP < 2.5 s on 4G mobile.
23. **Visual regression**: re-capture the screenshots in `docs/ui-audit/` after redesign (same viewports) and compare; add a short checklist: guest cart, logged-in cart, COD order, Razorpay order, promo apply, admin order status change.

### Acceptance checklist (definition of done)
- All text/background pairs >= 4.5:1 (3:1 for 18 px+ bold); no white text on a gold fill.
- 390 px viewport: no horizontal scroll on any route including `/admin`; all tap targets >= 44 px; body >= 16 px; products shown 2-up.
- Product page: price and "Add to cart" visible without scrolling on a 390x844 screen (sticky bar).
- Checkout completable on mobile in <= 6 inputs for a returning user with a saved address (1 tap) and with keyboard types matching fields.
- Chatbot launcher never overlaps primary CTAs.
- No hard-coded unverifiable claims (10k+, 24/7, "thousands").
- Existing routes, `CartContext`, `AuthContext`, API calls and Razorpay/COD flows unchanged and verified.

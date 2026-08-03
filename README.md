# EMIVO — Premium Electronics Store

A modern, frontend-only e-commerce storefront for premium electronics, built with
**Next.js 16**, **React 19**, and **Tailwind CSS v4**.

![stack](https://img.shields.io/badge/Next.js-16-black) ![stack](https://img.shields.io/badge/React-19-blue) ![stack](https://img.shields.io/badge/Tailwind-v4-38bdf8)

---

## ✨ Features

- **Hero slider** — auto-rotating banners (iPhone 16 Pro, MacBook Air M3, Smart 4K TV) with fade-in transitions
- **Hover-swap product cards** — second image fades in on hover, quick actions + add-to-cart reveal
- **Full catalog** — 6 categories, 8 brands, 14 products, all images verified live
- **Shop page** — category, brand and price filters plus 5 sort modes
- **Product detail** — image gallery, colour picker, quantity, tabs (description / specs / reviews), related items
- **Cart** — slide-out drawer + full page, `localStorage` persistence
- **Coupons** — `EMIVO10` (10% off), `SAVE500` (₹500 off ≥ ₹3,000), `WELCOME` (₹1,000 off ≥ ₹5,000), `FREESHIP` (free shipping)
- **Checkout** — address form, payment method (card / UPI / COD), order summary, success screen
- **Trust & polish** — brand marquee, promo tiles, newsletter CTA, dark premium footer
- **Accessibility** — keyboard navigation, reduced-motion support, aria labels, semantic landmarks

## 🚀 Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build (Turbopack is the Next 16 default bundler, so the build opts into webpack):

```bash
npm run build      # next build --webpack
npm run start
```

> **Note:** this project targets Next.js 16.2.12 — not the version your training data
> knows. Route params are async Promises (`use(params)` in client components, `await params`
> in server components), and `useSearchParams` requires a `<Suspense>` boundary.

## 📁 Project structure

```
app/
  layout.tsx            # root layout — Inter font, CartProvider, Header/Footer, Toaster
  page.tsx              # homepage — hero, features, categories, promos, arrivals, marquee, trending, newsletter
  shop/page.tsx         # shop with filters + sort (client, Suspense-wrapped)
  product/[id]/page.tsx # product detail (use(params))
  cart/page.tsx         # cart with coupon support
  checkout/page.tsx     # address + payment + summary
  about | blog | contact | faq | order-tracking | account   # supporting pages
  not-found.tsx         # custom 404
components/site/
  CartProvider.tsx      # cart + coupon + address context, localStorage persistence
  Header.tsx            # announcement bar + sticky nav + mobile menu + cart drawer
  HeroSlider.tsx        # auto-rotating banner
  ProductCard.tsx       # hover-swap card with quick actions
  CartDrawer.tsx        # slide-in mini cart
  Footer.tsx
lib/
  products.ts           # typed catalog: CATEGORIES, BRANDS, PRODUCTS, HERO_SLIDES, PROMO_TILES
  blog.ts               # blog post data
```

## 🛒 Coupons

| Code       | Discount                          | Minimum |
|------------|-----------------------------------|---------|
| `EMIVO10`  | 10% off the whole order           | none    |
| `SAVE500`  | ₹500 flat off                     | ₹3,000  |
| `WELCOME`  | ₹1,000 flat off                   | ₹5,000  |
| `FREESHIP` | Free shipping                     | none    |

## 🧱 Tech notes

- **Tailwind v4** — `@import "tailwindcss"` + `@theme` (no `@tailwind base`); Inter wired via `@theme { --font-sans }`
- **Images** — served from `raw.githubusercontent.com` + `images.unsplash.com` via plain `<img>` tags (no `next/image` needed); `next.config.ts` `remotePatterns` future-proofs a switch
- **State** — React Context + hooks only (no Zustand/Redux), persisted to `localStorage` (`emivo_cart`, `emivo_coupon`, `emivo_address`)
- **Typed** — strict TypeScript, `@/*` path alias, all data models have interfaces

## 🔌 Going to production

The catalog lives in `lib/products.ts`. Swap the helpers for API calls keeping the same shape:

```ts
// before
const product = getProduct(id);
// after
const product = await fetch(`/api/products/${id}`).then(r => r.json());
```

## 📄 License

Frontend demo. All product names and brand marks belong to their respective owners.

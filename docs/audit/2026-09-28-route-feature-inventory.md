# ELEKTRIX — Route & Feature Inventory (2026-09-28)

Baseline for the Full Product Audit (brief: `docs/briefs/2026-09-28-full-audit-brief.md`).
Inventoried from the actual codebase at commit `ef05c66`.

## Storefront (Next.js, elektrix.in — Vercel)

| Route | Purpose | Auth | Notes from mobile crawl (390×844) |
|---|---|---|---|
| `/` | Home (hero, categories, deals) | public | clean |
| `/shop` | Catalog + filters/sort | public | clean |
| `/product/*` | Product detail (variants, stock, pincode checker, reviews) | public | clean (desktop-verified earlier) |
| `/compare` | Product comparison | public | clean |
| `/cart` | Cart | public | clean |
| `/checkout` | Checkout | customer | correctly gates to login when signed out |
| `/pay/[orderId]` | Embedded Easebuzz payment handoff | customer | `/pay` parent serves a Vercel file listing (defect D1) |
| `/order-tracking` | Guest order tracking | public | clean |
| `/account/*` | Profile, orders, addresses, notifications | customer | addresses page verified earlier |
| `/notifications` | Notification center | customer | proper auth gate |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth (password + email/OTP; register has email-OTP verification gate) | public | register UX + live duplicate checks verified |
| `/support` | Support center + tickets + AI chat widget | public | **no `<h1>`** (defect D3) |
| `/blog`, `/about`, `/contact`, `/faq` | Content | public | clean |
| `/privacy`, `/terms`, `/refund`, `/shipping`, `/cookie` | Policy pages | public | clean, branded |
| `/feeds/google.xml` | Google Merchant product feed | public | `/feeds` parent serves a file listing (defect D1) |

## Admin dashboard (Next.js, admin.elektrix.in — VPS)

- **(auth)**: `/login` (password only), `/register`, `/forgot-password` (email reset link — rebuilt 2026-09-28).
- **(dashboard)**: dashboard, analytics, orders, products, inventory, customers, users, businesses, coupons, bank-offers, broadcasts, abandoned-carts, support, settings, profile, health, preview.
- Auth is role-based server-side (BusinessMember roles: owner / platform_admin / staff / customer). Staff accounts bypass the customer email-verification gate.
- Authenticated dashboard audit pending: requires admin credentials (not held by the agent).

## API (FastAPI, api.elektrix.in — Azure VPS)

Router prefixes: `/api/v1/auth` (register/login/OTP/forgot/reset/availability), `/api/v1/users`, `/api/v1/store` (catalog, search, recommendations, shipping-estimate, reverse-geocode), `/api/v1/products`, `/api/v1/carts`, `/api/v1/wishlist`, `/api/v1/addresses`, `/api/v1/orders`+`/payments` (Easebuzz), `/api/v1/notifications`, `/api/v1/support` (+ guest `/support/chat`), `/api/v1/newsletter`, `/api/v1/media` (R2), `/api/v1/admin` (+ abandoned-carts, marketing, support), `/api/v1/inventory`, `/api/v1/coupons`, `/api/v1/entitlements`, `/api/v1/customers`, `/api/v1/businesses`, `/api/v1/analytics`, `/api/v1/search`.

## Infrastructure facts (verified 2026-09-28)

- **Database**: one Supabase project (ap-south-1 pooler) = production. **No staging Supabase project exists** in any env file (gap G1).
- **Test isolation**: backend suite runs in throwaway Docker Postgres+Redis with RLS; never touches production (satisfies fail-closed for CI, but is not a staging environment).
- **Payments**: `PAYMENT_PROVIDER=easebuzz` in production with merchant key configured. Easebuzz **sandbox** credentials for staging are not present (gap G2).
- **PWA**: manifest v3 + icons installed; **no service worker** → installable but no offline/cache layer (gap G3).
- **Branding**: user-facing EMIVO remnants cleared except one technical mention ("SET LOCAL ROLE emivo_app") on the admin landing page (D4); GitHub repo keeps the EMIVO name (technical, out of scope).

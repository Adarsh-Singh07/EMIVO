# ELEKTRIX — Growth & Marketing Configuration

Reference for the marketing-ready infrastructure shipped in the storefront.
Nothing here requires credentials to build; every integration is opt-in.

## 1. Analytics (opt-in, no defaults)

The storefront loads **no** third-party tracking script by default.
Set the build-time environment variables to activate a provider
(`components/site/Analytics.tsx`, `lib/analytics.ts`):

| Variable | Provider | Format |
|---|---|---|
| `NEXT_PUBLIC_GA4_ID` | Google Analytics 4 | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager | `GTM-XXXXXXX` |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta (Facebook) Pixel | numeric |

When a variable is blank, that script is not emitted at all — verified by
inspectable HTML, not assumed.

E-commerce events already wired to real app actions (they become live the
moment a provider is configured):

| GA4 event | Fired on |
|---|---|
| `view_item` | Product detail page view |
| `add_to_cart` | Successful cart add (card or PDP) |
| `begin_checkout` | Checkout page mount with a non-empty cart |
| `purchase` | COD order placed; online payment confirmed (inline or `/pay` polling) |
| `search` | Header search submit |

Notes:
- GA4 auto page-views are enabled once (`send_page_view: true`), so navigation
  is not double-counted by `dataLayer` pushes.
- Meta Pixel receives the mapped standard events (`ViewContent`, `AddToCart`,
  `InitiateCheckout`, `Purchase`, `Search`) plus its own automatic `PageView`.
- **Do not** add `NEXT_PUBLIC_GTM_ID` *and* a GA4 `gtag` container from the
  same property — pick one tag path to avoid duplicate sends.

## 2. Google Search Console (owner action)

Already shipped: `robots.txt` (disallows `/account/`, `/checkout`,
`/notifications`; references the sitemap), `/sitemap.xml` (static routes +
live product URLs), unique per-page titles/descriptions, canonical URLs on
product pages and category pages.

To connect:
1. Add the `elektrix.in` domain in Search Console.
2. Complete DNS/domain-ownership verification.
3. Submit `https://elektrix.in/sitemap.xml`.

No code changes needed for any of this.

## 3. Google Merchant Center product feed

`https://elektrix.in/feeds/google.xml` is a live XML product feed generated
from the catalog API (up to 500 products, revalidated hourly, only products
in stock or explicitly out of stock — no offline placeholder data).

Setup:
1. Merchant Center → Products → Add data source → **Content API / file feed**
   → set the URL and 1-hour fetch frequency.
2. The feed sets `identifier_exists = no` (the platform does not track
   GTIN/MPN yet). Add SKU/UPC data to the product model to improve
   Shopping tab eligibility later.
3. Add the shipping template (free over ₹999 / flat below) and return policy
   in Merchant Center UI — do not put those in the feed per-item.

## 4. Social profiles (public, footer + schema `sameAs`)

| Network | URL |
|---|---|
| X | https://x.com/elektrix_in |
| LinkedIn | https://www.linkedin.com/company/elektrix-in/ |
| Facebook | https://www.facebook.com/share/1HaVFzFU7k/ |
| Instagram | https://www.instagram.com/elektrix.in/ |

Linked in `components/site/Footer.tsx` and Organization JSON-LD
(`app/layout.tsx`). Meta Ads Manager / private campaign URLs are
intentionally **not** referenced anywhere in frontend code.

## 5. Structured data already on every relevant page

- `Organization` (contact, address, `sameAs`) — sitewide (`layout.tsx`)
- `WebSite` + `SearchAction` (sitelinks searchbox) — sitewide (`layout.tsx`)
- `Product` + `Offer` (+ `MerchantReturnPolicy`, shipping) — product pages
- `BreadcrumbList` — product pages
- Ratings: `aggregateRating` is **deliberately absent** until real reviews
  exist (search-engine structured-data policy).

## 6. What is intentionally NOT implemented

- ONDC / marketplace integration — architecture docs only
  (`internal/` notes), no code pretending it exists.
- Cookie-consent-gated analytics — the consent banner currently gates
  third-party cookies generally; wire `Analytics` in after acceptance if
  the market requires it (check `CookieConsent.tsx` storage key first).
- Fake urgency, fake reviews, invented addresses/claims — see the prior
  audit log.

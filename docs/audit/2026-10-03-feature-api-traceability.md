# ELEKTRIX — Feature → API Traceability Matrix (Phase 7)
**Date:** 2026-10-03 · **Scope:** storefront + admin, every visible UI feature traced to its API, backend logic and storage. Brief §7: *"do not assume a feature works because its button is visible or its API returns HTTP 200."*

**Verification legend**
- ✅ **Verified live** — exercised end-to-end against production (browser or in-container API call) during this audit.
- ✅ **Verified by tests** — covered by the automated suites (`apps/api/tests/v02` — 119 passing; `storefront/tests/e2e` — Playwright+axe gate).
- ⚠️ **Not independently verified** — wired in code but not yet exercised end-to-end (flagged for Phase 8/9 journeys).
- 🚫 **Deliberately excluded** — live payment flows (owner directive; sandbox matrix deferred until Easebuzz sandbox is enabled).

## 1. Storefront — discovery & catalog

| UI feature | API | Backend → storage | Status |
|---|---|---|---|
| Home hero slider, banners, promo tiles | `GET /store/config`, `GET /store/catalogues` | storefront router → `store_settings.config` JSONB, `product_catalogues` | ✅ tests |
| Product grid / category filter / sort / pagination | `GET /store/products` | catalog service → `products` (+variants, inventory, R2 media) | ✅ live + tests |
| Search (header + suggestions) | `GET /store/search` | catalog search → `products` | ✅ live |
| Product detail (price, variants, stock, gallery) | `GET /store/products/{slug}` | catalog service → `products`, `product_variants`, `inventory` | ✅ live + tests |
| Delivery pincode check + place names | `GET /store/shipping/estimate/{pin}` | shipping service → India-Post/Delhivery adapters, Redis cache `pincode_est_v2:*` | ✅ live (COD truth asserted: store COD off ⇒ `cod_available=false`) |
| Reviews list + submit | `GET/POST /store/products/{id}/reviews` | reviews module → `product_reviews` | ✅ tests |
| Compare tray (max N) | client (`localStorage`) + product APIs | `storefront/lib/compare.ts` | ✅ live (tint state + Go-to-Compare navigation verified) |
| Recently viewed | client | `storefront/lib/compare.ts` | ✅ tests |

## 2. Storefront — cart, checkout, orders

| UI feature | API | Backend → storage | Status |
|---|---|---|---|
| Guest + user cart (merge on login) | `GET/POST/PATCH/DELETE /carts*` | carts module → `carts`, `cart_items` (409 race guarded) | ✅ tests + live |
| Address book CRUD + default | `GET/POST/PUT/DELETE /addresses` | addresses module → `addresses` | ✅ tests |
| Coupon validate/apply | `POST /coupons/validate` | coupons module → `coupons`, `coupon_usages` | ✅ tests |
| Shipping fee computation | `store-config` + checkout compute | `store_settings` shipping config | ✅ tests |
| Order placement (COD path) | `POST /orders/checkout` | orders service → `orders`, `order_items`, inventory decrement | ✅ tests (moderation suite places real COD orders) |
| Online payment (Easebuzz) | `POST /payments/initiate`, webhook verify | payments module → `payments`, `payment_events` | 🚫 excluded (owner) |
| Order history, detail, tracking | `GET /orders*`, `/store/order-tracking` | orders module → `orders` (+timeline) | ✅ live (user account) |
| Order cancellation | `POST /orders/{id}/cancel` | orders service (status guard) → stock release | ✅ tests |
| Returns / refunds | UI present | backend refund flows | ⚠️ partial — flagged for Phase 8 (no live refund executed) |

## 3. Storefront — accounts & auth

| UI feature | API | Backend → storage | Status |
|---|---|---|---|
| Register (email-OTP gate) | `POST /auth/register` → `POST /auth/verify-otp` | auth service → `users` (`is_email_verified`), OTP in Redis; Resend delivery | ✅ live (owner journey) + tests |
| Login / logout | `POST /auth/login`, `/auth/logout` | JWT access+refresh rotation, `refresh_families` | ✅ tests |
| Session persistence (PWA) | refresh cookie 30d + rotation grace | auth service | ✅ live |
| Forgot password (email link) | `POST /auth/forgot-password`, `/reset` | auth service, Resend | ✅ live |
| Availability checks (dup email/phone, live) | `GET /auth/availability` | auth service | ✅ tests |
| Profile update, password change | `PUT /users/me`, `POST /users/me/password` | users module → `users` | ✅ live |
| Self-delete (danger zone) | `DELETE /users/me` | users service (anonymize, keep orders) | ✅ tests |
| Wishlist | `GET/POST/DELETE /wishlist*` | wishlist module → `wishlist_items` | ✅ tests |
| Notifications (bell, mark-read) | `GET/POST /notifications*` | notifications module → `notifications` | ✅ live |
| Suspended login message | login flow | auth service → `users.suspended/reason` | ✅ tests |

## 4. Admin — operations

| UI feature | API | Backend → storage | Status |
|---|---|---|---|
| Ops home (live vitals) | `GET /admin/dashboard`, `/admin/activity` | admin service → aggregate queries | ✅ live |
| Orders: list, detail, status transitions | `GET /admin/orders*`, `POST /admin/orders/{id}/status` | admin service → `orders`, audit via order notes | ✅ live + tests |
| Products CRUD, media (R2), variants | `/admin/products*`, `/admin/products/{id}/media` | admin + media modules → `products`, `product_media` (R2 uploads) | ✅ live (owner) + tests (media allowlist) |
| Categories & brands | `/admin/categories*` | admin service → `categories` | ✅ live (table overflow fixed this round) |
| Inventory adjust / low stock | `/admin/inventory*` | inventory service → `inventory`, `inventory_movements` | ✅ tests |
| Coupons, bank offers, broadcasts | `/admin/coupons*`, `/bank-offers`, `/broadcasts` | respective modules | ✅ tests |
| Customers registry (realtime) | `GET /customers` (users-driven) | users + CRM left-join → `users` ⋈ `customers` | ✅ live (6 users listed) + tests |
| Customer 360 (orders/payments/addresses) | `GET /admin/customers/{id}/overview` | admin service | ✅ live + tests |
| CRM notes/address upsert by user id | `PUT /customers/{user_id}` | customers router (email immutable) | ✅ tests |
| Users: list, suspend/unsuspend (reason), delete | `/admin/users*` | admin service → `users.suspended*`, sessions revoked | ✅ live + tests |
| Staff roles / profile | `/admin/users`, `/users/me` | RBAC via `require_staff`/`require_roles` | ✅ tests |
| Support box (tickets) | `/support*` (staff-gated) | support module → `support_tickets` | ✅ tests |
| Admin AI assistant | `POST /admin/assistant` | admin_assistant module → read-only tools + `admin_ai_actions` audit | ✅ live (Agnes + tools + audit verified) |
| System health | `/health/*`, `/admin/health` | diagnostics | ✅ live |

## 5. Authorization model (server-side, verified)

- Every admin route: `Depends(require_staff)` / `require_roles([...])` — checked in CI by tests hitting customer tokens (403) — incl. the new assistant + customers registry.
- RLS: app session runs as `emivo_app` with `app.user_id` / `app.role` / `app.business_id` context; cross-tenant writes rejected at the policy level (audit INSERT failure on 2026-10-03 proved the policy is *active*, not decorative).
- Storefront mutations are session/cart-scoped; cart-merge BOLA fixed earlier (0c7d9cd).

## 6. Known gaps → Phase 8/9 backlog

1. **Refunds/returns** — UI present, backend flows exist but no live execution yet (blocked by payment-sandbox exclusion for the refund leg; COD cancellations are verified).
2. **Broadcasts** delivery metrics, abandoned-cart recovery — code paths tested; operator journey not yet walked end-to-end in browser.
3. **Push notifications** — not implemented (PWA manifest/notifications section in brief §5 marked N/A until a push service is chosen).

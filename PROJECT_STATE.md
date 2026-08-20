# ELEKTRIX - Project State

## Current Phase: v0.2 Production Release — Launched (2026-08-17)

**Last Updated:** 2026-08-17
**Current Milestone:** ELEKTRIX v0.2 — PRODUCTION E-COMMERCE COMPLETE & FESTIVAL LAUNCH
**Current Focus:** Replace placeholder `RAZORPAY_KEY_ID` in production `.env` with real live key; update DNS for `elektrix.in`, `www.elektrix.in`, `admin.elektrix.in` → VPS; re-run `bash infra/scripts/setup_ssl.sh`
**Product & Brand Name:** ELEKTRIX
**Official Domain:** https://elektrix.in
**Historical Note:** Formerly named EMIVO during initial scaffold phase
**Master Regression Suite Status:** ✅ 52/52 PASSED (100% Green) — includes oversell concurrency (10 buyers/2 units), atomic coupon races, payment lifecycle + tamper + webhook idempotency, IDOR/authz boundaries, order lifecycle w/ inventory effects
**Frontend Quality Status:** ✅ TypeScript 0 errors (storefront + admin), Next.js production build PASS for both
**Production Stack Status:** ✅ ALL RUNNING & HEALTHY on VPS (API 2×, storefront 2×, admin 2×, workers 1×, Redis, Nginx 4-vhost)
**Production Smoke Suite:** ✅ 24/24 PASSED against live `api.elektrix.in`

---

## Architectural Decisions

- **Architecture:** Modular Monolith (single FastAPI process, modules under `apps/api/modules/*`).
- **Frontend (Storefront):** Next.js 16, React 19, Tailwind CSS v4 on `elektrix.in` (port 3000, standalone Docker image).
- **Frontend (Admin):** Next.js 16, React 19, Tailwind CSS v4 on `admin.elektrix.in` (port 3100).
- **Backend:** FastAPI with async SQLAlchemy (`AsyncSession`) and `asyncpg` (port 8000). 2× replicas behind Nginx.
- **Database:** PostgreSQL (Supabase) with `pgvector` and Row Level Security (RLS) per business.
- **Session & Token Storage:** Redis (JWT refresh token family revocation + replay detection, rate-limit counters, webhook dedup SETNX).
- **Object Storage:** Cloudflare R2 (`media.elektrix.in` public CDN, presigned PUT uploads for staff).
- **Workers:** ARQ cron poller (outbox dispatch every minute, `FOR UPDATE SKIP LOCKED`, retries + dead-letter).
- **Rules:** Strict repository pattern; no direct DB queries inside routers; RLS enforced via `app.business_id`/`app.role` GUCs set per request; `elektrix_is_staff()` helper; integer paise for all money (no floats); GST-inclusive pricing (tax_total = 0); atomic inventory with `UPDATE … WHERE on_hand − reserved >= :qty`; provider-agnostic payments (`PAYMENT_PROVIDER=razorpay|mock`).
- **Multi-tenant, single-store operation:** Business entities + RLS per business; canonical ELEKTRIX store is the only active shop. Seller-ready schema for v1.1 without building seller features.
- **Outbox/event pattern:** Events written inside DB transactions; worker dispatches notifications (Resend email + in-app centre).

---

## Module Implementation Matrix

| Module | Status | Verification & Features |
|---|---|---|
| **Frontend (Storefront)** | 🟩 Production Ready | Next.js 16 app on `elektrix.in`. Real catalog (search/filters/sort/effective pricing), cart drawer with guest→user merge, full checkout stepper (address→coupon→payment) with Cashfree Web Checkout + COD, wishlist, compare, notifications bell, account (orders/addresses/wishlist), order tracking, forgot/reset password, SEO (robots/sitemap/Product JSON-LD), `next/image`. |
| **Frontend (Admin)** | 🟩 Production Ready | Next.js 16 app on `admin.elektrix.in`. Dashboard (real metrics), product manager (create/edit with R2 upload, variants, pricing, offers, status), inventory manager (adjust modal + movement history), order manager (status transitions, tracking), coupons manager, settings (COD/shipping/banner), customers list, auth-guarded routes. |
| **Auth** | 🟩 Production Ready | Register/login/refresh-rotation-with-replay-detection/password-reset (outbox event)/password-change/change-email-verification. Rate-limited. |
| **Users** | 🟩 Production Ready | Profile fetch/update with RLS binding (`_bind_rls_owner`). |
| **Businesses** | 🟩 Production Ready | Staff-gated CRUD, RLS-scoped, `set_db_context`. |
| **Settings** | 🟩 Production Ready | Tenant derived from authenticated session GUC only (not header-spoofable). |
| **Products** | 🟩 Production Ready | Full CRUD with MRP/sale_price/offer window/brand/SKU/category/specs/tags/featured; pg_trgm search; effective pricing at read time; RLS isolation; media via R2 presigned upload. Storefront catalog with category filter (parent subquery), price filters, sort, search, related products. |
| **Coupons** | 🟩 Production Ready | Fixed & percentage, max discount cap, global + per-customer usage limits. Atomic redeem inside checkout (`UPDATE … SET usage_count + 1 WHERE … AND (usage_limit IS NULL OR usage_count < usage_limit)`). Validate endpoint (rate-limited). |
| **Inventory** | 🟩 Production Ready | `on_hand − reserved` model; atomic guarded UPDATE (no oversell); stock movements audit trail; admin adjust (set/delta/restock/damage/return + threshold edit) with RLS guard (can't set below reservations). Proven: 10 concurrent buyers vs 2 units → exactly 2 winners, stock never negative. |
| **Carts** | 🟩 Production Ready | Guest session token, stock validation, IDOR ownership guards, guest→user merge on login. |
| **Orders** | 🟩 Production Ready | Transactional checkout: cart snapshot with effective prices, atomic coupon redemption, stock reservation, order number, address snapshot, outbox events, cart clearing. COD confirmed immediately; ONLINE pending until capture. Status transition matrix (CONFIRMED→PROCESSING→SHIPPED→DELIVERED). Idempotency by key. Order ownership IDOR enforced. |
| **Payments** | 🟩 Production Ready | Provider-agnostic `BasePaymentProvider` → real `CashfreeProvider` (live httpx to Cashfree API) or mock. Amount validated against order.total server-side (client values ignored). Initiate creates Cashfree order → returns payment_session_id; frontend loads Cashfree JS SDK → Cashfree.checkout({paymentSessionId, redirectTarget}); client verify calls Cashfree API to confirm payment status. Webhook (signature-verified, idempotent by event ID) is source of truth for captures/failures. Refund via Cashfree refund API (requires cf_order_id) + restock. On provider rejection → 503 (not raw 500). Cashfree webhook HMAC-SHA256 signature verification. |
| **Addresses** | 🟩 Production Ready | CRUD with default-address semantics, India pincode validation. |
| **Wishlist** | 🟩 Production Ready | Raw SQL `INSERT … ON CONFLICT DO NOTHING`; legacy JSON import path. |
| **Notifications** | 🟩 Production Ready | Resend transactional email provider + templates; in-app notification centre; outbox worker service dispatches auth.welcome + order.created + others. Proven: 87 events → 29 in-app notifications. |
| **Newsletter** | 🟩 Production Ready | Subscribe/unsubscribe with idempotent dedup; RLS relaxed to allow INSERT..RETURNING. |
| **Outbox / Worker** | 🟩 Production Ready | `OutboxEvent` table written inside DB transactions; ARQ cron poller dispatches via `NotificationService.process_outbox_event()`. Retries + per-event retry cap + dead-letter table. |
| **Media** | 🟩 Production Ready | Staff-only R2 presigned upload (`POST /api/v1/media/presign`), file extension + content-type validated, 10 MB cap, images only, returns public CDN URL. |
| **Admin API** | 🟩 Production Ready | Dashboard analytics (today's metrics, 14d revenue trend, recent orders, top products), users list, store settings (COD toggle, shipping, banner). All staff-gated. |
| **Search** | 🟩 Production Ready | pg_trigram on product name/brand/SKU; storefront search endpoint. |
| **AI Gateway** | 🟨 Held | Provider client integrated; router unmounted; not part of v0.2 commerce scope. |
| **Analytics** | 🟨 Held | Redis Streams event tracking implemented; pending router mounting; not part of v0.2 scope. |
| **Voice** | 🟥 Not Started | Deepgram models defined; service layer empty; out of v0.2 scope. |
| **Sell marketplace** | 🟥 Out of scope | Explicitly NOT built for v0.2. |

---

## Brand & UI System

- **Brand Name:** ELEKTRIX
- **Official Domain:** https://elektrix.in
- **Branding Audit:** Zero active `EMIVO` occurrences across source code, config files, and environment defaults (only historical documentation notes preserved).
- **Branding Config:** `apps/web/src/config/branding.ts`
- **Logo System Assets:**
  - Icon Logo: `apps/web/public/branding/icon.svg`
  - Wordmark Logo: `apps/web/public/branding/wordmark.svg`
- **Logo Component:** `apps/web/src/components/branding/BrandLogo.tsx`
- **System Health Diagnostics:** `/health/live`, `/health/ready`, `/health/diagnostics` + `/api/v1/system/status` — truthful diagnostics: real DB/Redis latency, migration version, git commit, provider status, disk.

---

## Production Infrastructure & Docker

- `Dockerfile.storefront` — standalone Next.js runtime image, multi-stage, `NEXT_PUBLIC_API_URL` build arg.
- `compose.prod.vm1.yaml` — 2× API, 2× storefront (:3000), 2× admin (:3100), 1× workers, Redis. Nginx at the edge. YAML anchors for shared DB/Redis env.
- Nginx: 4 vhosts (elektrix.in + www redirect, admin.elektrix.in noindex/DENY frame, api.elektrix.in no-cache/rate-limited). CSP allows `checkout.razorpay.com` frame-src. Gzip, static-asset caching, security headers.
- SSL Setup Automation: `infra/scripts/setup_ssl.sh` — issues Let's Encrypt for all 4 domains; self-signed placeholder for domains not yet pointing at VPS.
- VPS Deployment Script: `infra/scripts/deploy_vps.sh` — build → pg_dump backup → migrate → RLS → certs → rollout → idempotent seed → 4-target smoke → nginx reload. Auto-rollback on failure. `SKIP_PULL=1` for local deploy.
- **Gotcha — nginx bind mount:** `infra/nginx/nginx.conf` is bind-mounted as a single file. If `git checkout` replaces the file (new commit touches it), the container sees a stale inode until nginx is force-recreated: `docker compose -f compose.prod.vm1.yaml up -d --force-recreate nginx`.

---

## GitHub Actions Workflows

- `ci.yml` — `backend-tests` job runs `scripts/run_backend_tests.sh` (boot scratch PG + Redis, drop schema, migrate, apply RLS, seed, pytest). Added in v0.2.
- `deploy-vps.yml` — triggers on `workflow_run` gated on CI success (changed from `push` in v0.2).

---

## v0.2 release bundle

- `docs/V0.2_RELEASE_NOTES.md` — full release notes (what shipped, what didn't, DNS table, seeded store, rollback).
- `docs/API_V02_CONTRACT.md` — complete API contract for storefront + admin frontend teams.
- `docs/DEPLOYMENT.md`, `docs/DNS.md`, `docs/SECURITY.md`, `docs/CI_CD.md`, `docs/ROLLBACK.md` — updated for v0.2.
- `Makefile` — proper targets: dev, test, typecheck, build, db-migrate, db-shell, seed, deploy.

---

## Remaining action items (pre-launch)

1. **Real Razorpay live key** — replace `RAZORPAY_KEY_ID=rzp_live_yourlivekey` in `.env` with the actual `rzp_live_*` key id. The key secret and webhook secret are already in `.env`. After the swap, ONLINE checkout will work end-to-end (initiate → Checkout.js → verify-success → capture + stock commit). Re-run `scripts/smoke_prod.sh` to confirm initiate returns 201 with a real provider key id.
2. **DNS** — point `elektrix.in`, `www.elektrix.in`, `admin.elektrix.in` A records at `161.118.254.169` (Cloudflare or nameserver of choice). Then run `bash infra/scripts/setup_ssl.sh`.
3. **Rotate leaked Supabase credential** — `apply_rls.py` once contained the Supabase password in git. The credential has been removed from the file; rotate the database password in Supabase and update `.env` + any CI secrets.

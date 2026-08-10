# ELEKTRIX - Project State

## Current Phase: Production Deployment Architecture & CI/CD Configured (Frozen & Ready for Release)

**Last Updated:** 2026-08-10  
**Current Milestone:** ELEKTRIX v0.1 — DEPLOYMENT ARCHITECTURE & CI/CD COMPLETE  
**Current Focus:** Verification of GitHub workflows, DNS planning, and VPS CD triggers  
**Product & Brand Name:** ELEKTRIX  
**Official Domain:** https://elektrix.in  
**Historical Note:** Formerly named EMIVO during initial scaffold phase  
**Master Regression Suite Status:** ✅ 7/7 PASSED (100% Green, 196 assertions) & Backend Regression 14/14 PASSED  
**Frontend Quality Status:** ✅ Next.js 15 App Router + React 19 + TypeCheck 0 errors (Storefront :3000 & Admin :3001) & Production Build PASS  


---

## Architectural Decisions

- **Architecture:** Modular Monolith.
- **Frontend:** Next.js 15, React 19, Tailwind CSS v4 (Storefront on port 3000, Admin Dashboard on port 3001).
- **Backend:** FastAPI with async SQLAlchemy (`AsyncSession`) and `asyncpg` (Port 8000).
- **Database:** PostgreSQL (Supabase) with `pgvector` and Row Level Security (RLS).
- **Session & Token Storage:** Redis (JWT refresh token family revocation & replay detection).
- **Object Storage:** Cloudflare R2 (S3-compatible bucket with pre-signed uploads).
- **Rules:** Strict repository pattern; no direct DB queries inside routers; RLS enforced via `SET LOCAL ROLE emivo_app`.

---

## Module Implementation Matrix

| Module | Status | Verification & Features |
|---|---|---|
| **Frontend (Storefront)** | 🟩 Production Ready | Next.js 15 app running on port 3000. Real auth flow, product catalog (42 public products), checkout, account page, JWT rotation, header state. |
| **Frontend (Admin)** | 🟩 Production Ready | Next.js app running on port 3001 (`apps/web`). 11 dashboard routes (/dashboard, /analytics, /businesses, /customers, /inventory, /orders, /products, /settings, /users, /health, /preview), login OK. |
| **Auth** | 🟩 Production Ready | JWT, Argon2 hashing, Redis token family refresh, replay attack revocation, user profile management. |
| **Users** | 🟩 Production Ready | User profile fetch/update (`/users/me`), integrated with `get_current_user`. |
| **Businesses** | 🟩 Production Ready | Multi-tenant business management, business memberships, JSONB settings configuration. |
| **Settings** | 🟩 Production Ready | Per-business JSONB settings column with RLS protection. |
| **Products** | 🟩 Production Ready | Full CRUD, variants, media URLs, `selectin` eager loading, RLS isolation (`20260809_0421_24010752e38f`). Public storefront read policy. |
| **Customers** | 🟩 Production Ready | Full CRUD, soft delete (`SoftDeleteMixin`), substring search, paginated lists, unique email per business (`20260809_0449_bf1f48d88adb`). Verified 41 assertions. |
| **Orders** | 🟩 Production Ready | Full CRUD, auto unit price resolution from variants, status transition matrix validation, idempotency key deduplication (`20260809_1842_266616b0d24c`). Verified 40 assertions. |
| **Carts** | 🟩 Production Ready | Guest session & user cart lookup, line item pricing, automatic subtotal updates, AsyncSession cache refresh (`20260809_0500_ee32a76efdd4`). Verified 30 assertions. |
| **Payments** | 🟩 Production Ready | Initiate, Razorpay provider adapter, HMAC-SHA256 signature verification, idempotency deduplication, order status auto-sync (`CONFIRMED`/`REFUNDED`), full & partial refunds (`20260809_1910_39a4b12c8e1d`). Verified 23 assertions. |
| **Coupons** | 🟩 Production Ready | Fixed & percentage discounts, subtotal threshold check, max discount cap, global & per-user usage limits (`coupon_usages`), soft delete, code uppercase normalization. Verified 30 assertions. |
| **AI Gateway** | 🟨 In Progress | Provider client integrated; router unmounted; needs auth context. |
| **Analytics** | 🟨 In Progress | Redis Streams event tracking implemented; pending router mounting. |
| **Media** | 🟨 In Progress | Cloudflare R2 S3 adapter written; requires import cleanup. |
| **Search** | 🟨 In Progress | Requires real Gemini 768-dim vector embeddings integration. |
| **Outbox** | 🟨 In Progress | ARQ worker scaffolded; placeholder sleep loop requires real event dispatcher. |
| **Admin API** | 🟨 In Progress | Platform admin API endpoints scaffolded (Admin web dashboard ready). |
| **Inventory** | 🟥 Not Started | Stock adjustment & warehouse tracking scaffolded. |
| **Notifications** | 🟥 Not Started | SES logger only; requires Resend API integration. |
| **Voice** | 🟥 Not Started | Deepgram models defined; service layer empty. |

---

- **Frontend Integration:** Full integration across Next.js Storefront (`http://localhost:3000`) and Next.js Admin Dashboard (`http://localhost:3001`). Both workspaces compile and build successfully in production mode.
- **Auth Flow:** Real login, registration with auto-login, logout with refresh token revocation, live auth context (`AuthProvider`), and reactive header state.
- **Product Catalog & Images**: Public API adapter with static fallback, skeleton loading states, public storefront RLS read policy allowing anonymous browsing of 42 products with beautiful Unsplash/GitHub raw images preserved.
- **Address & Wishlist Management:** Interactive saved address manager `/account/addresses` and wishlist screen `/account/wishlist` connected to DB JSONB attributes. Supports persistent CRUD operations with browser refresh verification.
- **Checkout & Scoped Orders:** Storefront `/checkout` page with saved address selector dropdown, "Save Address to Profile" database sync checkbox, and UUID matching. Order creation & list requests scoped dynamically.
- **Order Tracking:** Real tracking status check via `/order-tracking` connected to backend tracking endpoint.
- **UPI Simulation Mode Warning**: Clear warning alerts injected when choosing UPI payment options to prevent misleading real-payment implications.
- **Admin Dashboard Visual Uniformity:** All 11 dashboard routes running on port 3001, redesigned using the light themed ELEKTRIX design tokens (globals.css variables, cards, sidebar, topbar, stats widgets). Homepage polished.
- **Quality Gate:** TypeScript 0 errors across root and `apps/web`, `tsconfig.json` fixed to exclude `apps/`, backend regression 7/7 suites (196 assertions) 100% PASS.
- **Docker Dev Environment**: Successful verification of compose config and live services (PostgreSQL db-1 with pgvector, Redis-1 session store, FastAPI api, next.js app servers).



---

## Brand & UI System

- **Brand Name:** ELEKTRIX
- **Official Domain:** https://elektrix.in
- **Branding Audit:** Zero active `EMIVO` occurrences remaining across source code, config files, and environment defaults (only historical documentation notes preserved).
- **Branding Config:** `apps/web/src/config/branding.ts`
- **Logo System Assets:**
  - Icon Logo: `apps/web/public/branding/icon.svg`
  - Wordmark Logo: `apps/web/public/branding/wordmark.svg`
- **Logo Component:** `apps/web/src/components/branding/BrandLogo.tsx`
- **Developer Control Center:** Upgraded `/preview` displaying dynamic Git commit hash (`#7baef7c`), Alembic schema (`39a4b12c8e1d`), CPU cores, disk space, and module matrix.
- **System Health Diagnostics:** Upgraded `/health` & `/health/diagnostics` with live Supabase PostgreSQL RLS latency (1.7s), Redis ping (41ms), Alembic version, Git commit hash, and disk/CPU telemetry.
- **Production Infrastructure & Docker:**
  - `compose.dev.yaml` & `compose.prod.vm1.yaml` verified valid (`docker compose config`)
  - Nginx configuration: `infra/nginx/nginx.conf` updated to act as a reverse proxy for `api.elektrix.in` to the FastAPI backend with security headers and rate limits.
  - VPS Deployment Script: `infra/scripts/deploy_vps.sh` upgraded to perform zero-downtime container pulls, migrations, health checks, and automated rollbacks on failure.
- **GitHub Actions Workflows:**
  - `ci.yml` running validation of compilation, typechecks, tests, and compose configurations.
  - `deploy-vps.yml` running automated SSH-based deployment triggers to the Oracle ARM VPS.


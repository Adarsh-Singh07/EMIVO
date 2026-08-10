# ELEKTRIX - Master Project Status

## Executive Summary
This document provides a factual, evidence-backed status report of the ELEKTRIX platform. All architecture decisions (Modular Monolith) and tech stack components (Next.js 15, FastAPI, Supabase, Redis, Cloudflare R2) are frozen.

**Last Updated:** 2026-08-10  
**Official Product Name:** ELEKTRIX  
**Official Domain:** https://elektrix.in  
**Historical Note:** Formerly named EMIVO during initial scaffold phase  
**Current Phase:** ELEKTRIX v0.1 — DEPLOYMENT ARCHITECTURE & CI/CD CONFIGURATION COMPLETE  
**Master Regression Suite Status:** ✅ PASS (7/7 Suites Green — 100%) & Backend Regression (14/14 PASSED)  

---

## Infrastructure & Deployments
- **Vercel Deployments**: Stores the three user-facing frontends: Customer Storefront (`elektrix.in`), Operator Portal (`admin.elektrix.in`), and Business Portal (`sell.elektrix.in`).
- **Oracle ARM VPS:** Hosts backend services via Docker stack in `compose.prod.vm1.yaml` (verified valid via `docker compose config`).
- **Nginx Reverse Proxy:** Upgraded in `infra/nginx/nginx.conf` (TLS 1.2/1.3, rate limiting, security headers, reverse proxy to the backend API `api.elektrix.in`).
- **Zero-Downtime Deployment & Rollback:** Script in `infra/scripts/deploy_vps.sh` upgraded to verify live endpoints and execute fallback commands automatically.
- **Supabase PostgreSQL:** Live production database with Row Level Security (RLS) policies applied (`db/rls/*.sql`).
- **Redis:** Active; handles rolling refresh token families, rate limiting, and session caching.
- **Cloudflare R2:** S3-compatible object storage configured for product and business media (`elektrix-media`).
- **Docker Topology:** Local development uses `compose.dev.yaml` (`api:8000`, `web:3000`, `redis:6379`).
- **CI/CD Pipelines**: Automated GitHub Actions (`ci.yml` validation runner and `deploy-vps.yml` SSH CD runner).

---

## Centralized Branding System

- **Brand Name:** ELEKTRIX
- **Official Domain:** https://elektrix.in
- **Branding Audit:** Zero active `EMIVO` references remaining across source code, config files, and environment defaults (only historical documentation notes preserved).
- **Config File:** `apps/web/src/config/branding.ts`
- **SVG Logos:**
  - `public/branding/icon.svg`
  - `public/branding/wordmark.svg`
- **Logo Component:** `<BrandLogo />` (`apps/web/src/components/branding/BrandLogo.tsx`)

---

## Core Business Modules (`apps/api/modules/`)

### ✅ Complete & Production Ready (10/22)
1. **`auth`**: Full JWT lifecycle, Argon2 password hashing, Redis refresh token family revocation, replay detection.
2. **`users`**: `/users/me` endpoint, user profile updates (saved addresses & wishlists), `get_current_user` dependency.
3. **`businesses`**: Multi-tenant B2B business management, business memberships, owner/staff role assignments.
4. **`settings`**: Per-tenant JSONB configuration column with RLS isolation.
5. **`products`**: Full CRUD, variant options, media attachments, cascading deletes, `selectin` eager loading, RLS policies applied (`20260809_0421_24010752e38f`). Public storefront read policy.
6. **`customers`**: Full CRUD, soft deletion (`SoftDeleteMixin`), substring search, paginated responses, unique email per business (`20260809_0449_bf1f48d88adb`). Verified 41/41 assertions.
7. **`orders`**: Full CRUD, automatic unit price resolution from variants, status transition matrix (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`), idempotency deduplication (`20260809_1842_266616b0d24c`). Verified 40/40 assertions.
8. **`carts`**: Guest session & authenticated user carts, line-item pricing, dynamic subtotal auto-calculation, AsyncSession query cache refreshing (`populate_existing=True`) (`20260809_0500_ee32a76efdd4`). Verified 30/30 assertions.
9. **`payments`**: Initiate, Razorpay provider adapter, HMAC-SHA256 signature verification, idempotency deduplication, order status auto-sync (`CONFIRMED` on capture, `REFUNDED` on refund), full & partial refund handling (`20260809_1910_39a4b12c8e1d`). Verified 23/23 assertions.
10. **`coupons`**: Percentage & fixed-amount discounts, subtotal threshold check, max discount capping, global & per-user usage limits (`coupon_usages`), soft deletion, uppercase code normalization (`db/rls/08_coupons.sql`). Verified 30/30 assertions.

---

## Frontend Integration & Verification Results

### ✅ Complete & Production Ready (Phases 1 - 8)

1. **Phase 1 — Brand & Foundation:** Total brand transition to ELEKTRIX across UI, logos, and metadata. Implemented `lib/api-client.ts` (JWT client with cookie storage and automatic refresh token rotation), `lib/auth-context.tsx` (`AuthProvider` with login/register/logout/refreshUser), and wrapped `app/layout.tsx`.
2. **Phase 2 — Authentication:** Integrated real login (`app/login/page.tsx`) and registration (`app/register/page.tsx` with auto-login following register). Updated `Header.tsx` to render live user avatar, dropdown menu, and sign-out action. Fixed environment CORS handling (`ENV_NAME=local`, comma-separated `CORS_ORIGINS`), `/users/me` endpoint mapping, register response handling (`UserResponse`), and refresh token logout body payload.
3. **Phase 3 — Product Catalog:** Built `lib/products.ts` API adapter with static fallback. Updated `/shop` and `/product/[id]` pages with skeleton loading states. Made Products API public (no auth required for storefront GET) and updated Supabase RLS with public read policy for anonymous storefront browsing (42 products accessible).
4. **Phase 4 — Address & Wishlist Management:** Interactive saved address manager (`/account/addresses`) and wishlist screen (`/account/wishlist`) connected to database JSONB attributes. Supports list, add, edit, delete, and set default operations.
5. **Phase 5 — Checkout & Scoped Orders:** Built `/checkout/page.tsx` with saved address selector dropdown, "Save Address to Profile" checkbox, and UUID product ID detection. Enabled customer-scoped orders list in order history `/account/orders`. Added clear warnings when UPI is selected stating it runs in test/simulated payment mode.
6. **Phase 6 — Order Tracking**: Connected the order tracking input on `/order-tracking` directly to the FastAPI orders status endpoint to query the real order state.
7. **Phase 7 — Admin Dashboard Visual Uniformity:** Redesigned all 11 dashboard routes of the admin app (`localhost:3001`), side navigation bar, headers, metrics cards, and Quick Operations control panel to conform to the shared light-themed ELEKTRIX brand identity.
8. **Phase 8 — Quality Gate:** Verified 0 TypeScript errors across root and `apps/web`. Fixed `tsconfig.json` to exclude `apps/` from root compilation. Master regression suite 7/7 suites (196 assertions) 100% green.

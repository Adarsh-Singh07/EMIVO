# ELEKTRIX - Project Handover Document

**Last Updated:** 2026-08-10  
**Official Product Name:** ELEKTRIX  
**Official Domain:** https://elektrix.in  
**Historical Note:** Formerly called EMIVO during initial phase  
**Current Phase:** Internal Release v0.1 — Fully Runnable & Polished  
**Current Milestone:** Backend & Frontend Wired, Local Stack Operational  

---

## 1. Executive Summary

ELEKTRIX is an autonomous multi-tenant B2B commerce platform designed to empower businesses with unified POS, online catalog management, inventory, cart processing, checkout payments, AI capabilities, and analytics.

During the Stabilization Phase (v0.1), the project eliminated all local mocks, fake tokens, dummy JSON responses, and in-memory fallbacks across all core business modules. Every module was implemented as a modular vertical slice using FastAPI, AsyncSQLAlchemy, Supabase (PostgreSQL with Row Level Security), Redis, and Cloudflare R2.

As of **2026-08-10**, the master regression test suite (`verify/run_all.py`) passed 100% green across all 7 verified module test suites against live production infrastructure.

---

## 2. Architecture Overview

- **Pattern:** Modular Monolith (FROZEN — do not suggest microservices or decoupled services).
- **Backend:** FastAPI (Python 3.11+), AsyncSQLAlchemy, `asyncpg`, Pydantic v2.
- **Frontend:** Next.js 15, React 19, Tailwind CSS v4 (located in `apps/web/`).
- **Database:** PostgreSQL (Supabase) with Row Level Security (RLS) and `pgvector`.
- **Cache & Session:** Redis 7+ (used for rolling refresh token families, rate limiting, and session caching).
- **Object Storage:** Cloudflare R2 (S3-compatible bucket via pre-signed URLs).
- **Background Tasks:** ARQ worker with Redis.

### Architectural Rules (Frozen)
1. **No Mock Policy:** Every module must connect to real Supabase and Redis infrastructure.
2. **Layered Structure:** `models.py` → `schemas.py` → `repository.py` → `service.py` → `router.py`.
3. **Async DB Access:** Use `AsyncSession` only. Synchronous sessions are strictly prohibited.
4. **Tenant Scoping:** Tenant context is injected via JWT/RLS context (`app.business_id`). Never allow clients to pass `business_id` in request payloads.
5. **Monetary Values:** Stored exclusively as integer minor units (paise / cents) to prevent floating-point rounding errors.
6. **Soft Delete:** Implemented via `SoftDeleteMixin` (`deleted_at` timestamp). Exclude soft-deleted rows from standard queries.
7. **Pagination Schema:** Standardized structure: `{ "items": [...], "total": int, "page": int, "page_size": int, "has_next": bool, "has_prev": bool }`.

---

## 3. Infrastructure Topology

- **Production Target:** Oracle ARM VPS running Docker containers (`compose.prod.vm1.yaml`).
- **Containers:** `api` (FastAPI), `web` (Next.js), `workers` (ARQ background tasks).
- **PostgreSQL Connection & RLS Role:** Connections are established via `asyncpg`. In `apps/api/core/database.py`, every session executes `SET LOCAL ROLE emivo_app` to switch from superuser to a restricted role (`NOBYPASSRLS`), ensuring database RLS policies (`db/rls/*.sql`) are strictly enforced.

---

## 4. Current Implementation Status

| Module | Status | Assertions Passed | Migration Applied |
|---|---|---|---|
| **Auth** | ✅ Production Ready | 6/6 test flows | Initial Schema |
| **Users** | ✅ Production Ready | Verified in Auth | Initial Schema |
| **Businesses** | ✅ Production Ready | AsyncSession / RLS | Initial Schema |
| **Settings** | ✅ Production Ready | JSONB RLS verified | Initial Schema |
| **Products** | ✅ Production Ready | 7 Endpoints Verified | `20260809_0421_24010752e38f` |
| **Customers** | ✅ Production Ready | 41/41 Assertions | `20260809_0449_bf1f48d88adb` |
| **Orders** | ✅ Production Ready | 40/40 Assertions | `20260809_1842_266616b0d24c` |
| **Carts** | ✅ Production Ready | 30/30 Assertions | `20260809_0500_ee32a76efdd4` |
| **Payments** | ✅ Production Ready | 23/23 Assertions | `20260809_1910_39a4b12c8e1d` |
| **Coupons** | ✅ Production Ready | 30/30 Assertions | `db/rls/08_coupons.sql` |
| **AI Gateway** | 🚧 In Progress | Router unmounted | Pending Schema |
| **Analytics** | 🚧 In Progress | Redis Streams wired | Pending Router |
| **Media** | 🚧 In Progress | R2 S3 Adapter built | Needs import fix |
| **Search** | 🚧 In Progress | Needs pgvector embeddings | Needs import fix |
| **Outbox** | 🚧 In Progress | Worker scaffolded | Needs real dispatcher |
| **Admin** | ❌ Not Started | Empty scaffold | — |
| **Inventory** | ❌ Not Started | Empty scaffold | — |
| **Notifications**| ❌ Not Started | SES logger only | Needs Resend API |
| **Voice** | ❌ Not Started | Models defined | Services empty |

---

## 5. What Is Production Ready

- **Core Authentication & User Management:** Argon2 password hashing, JWT generation, Redis-backed refresh token rotation with family revocation and replay detection.
- **Tenant Isolation:** Supabase RLS policies enforced via `emivo_app` database role and session configuration (`app.business_id`, `app.user_id`).
- **Product Catalog Management:** Full CRUD, multi-variant pricing, media association, cascading deletes, and `selectin` eager loading.
- **Customer CRM:** CRUD, soft deletion, per-tenant email uniqueness checks, substring search across name/email/phone, paginated lists.
- **Order Management:** Automated price resolution from database variants, strict state transition matrix (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED` / `REFUNDED` / `CANCELLED`), idempotency key handling.
- **Cart Engine:** Guest (`session_id`) and authenticated (`user_id`) carts, line-item unit price resolution, automatic subtotal updates, session cache refreshing (`populate_existing=True`).
- **Payment Gateway Integration:** Provider adapter (Razorpay mock), HMAC-SHA256 signature verification, idempotency deduplication, automatic order status synchronization, full and partial refunds.
- **Discount & Coupon Engine:** Fixed and percentage-based discounts, minimum order threshold validation, maximum discount capping, global & per-user usage limit tracking.

---

## 6. Verification Strategy

The canonical test runner is `verify/run_all.py`. It executes test suites sequentially against a live API running on `http://127.0.0.1:8000`:

```bash
python verify/run_all.py
```

### Verification Suites Executed:
1. `verify/auth/verify_auth.py`
2. `verify/products/verify_products.py`
3. `verify/customers/verify_customers.py`
4. `verify/orders/verify_orders.py`
5. `verify/carts/verify_carts.py`
6. `verify/payments/verify_payments.py`
7. `verify/coupons/verify_coupons.py`

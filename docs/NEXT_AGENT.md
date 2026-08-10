# ELEKTRIX - Instructions for Next Coding Agent

Welcome to the ELEKTRIX codebase! This document is your 5-minute briefing to help you become fully productive immediately.
(Historical Note: Formerly named EMIVO during initial scaffold phase).

---

## 1. Core Mission & Current Project State

ELEKTRIX is an autonomous multi-tenant B2B commerce platform built on Next.js 15, FastAPI, Supabase (PostgreSQL with RLS), Redis, and Cloudflare R2.
Official domain: https://elektrix.in

### Current Progress:
- **Backend (FastAPI):** Core stabilization phase is **100% COMPLETE**. All core modules (Auth, Users, Businesses, Settings, Products, Customers, Orders, Carts, Payments, Coupons) are fully implemented with `AsyncSession`, RLS tenant isolation, Alembic migrations, and verified against live Supabase and Redis infrastructure.
- **Verification Suite:** Master regression test `python verify/run_all.py` passes 100% green across all 7 module test suites.
- **Frontend (Next.js):** UI components in `apps/web/` connect directly to live backend APIs.

---

## 2. What MUST NOT Be Changed (Frozen Architecture)

1. **Architecture:** Modular Monolith. Do NOT suggest microservices.
2. **Infrastructure Policy:** No mocks, no SQLite fallbacks, no dummy JSON return values in production code. Everything executes against real Supabase PostgreSQL, Redis, and Cloudflare R2.
3. **Database Sessions:** Always use `AsyncSession`. Never use synchronous SQLAlchemy sessions.
4. **Tenant Isolation Mechanics:**
   - Every session executes `SET LOCAL ROLE emivo_app` (`apps/api/core/database.py`).
   - Every RLS-protected route uses `Depends(set_db_context)` (`apps/api/core/dependencies.py`).
   - Tenant scoping relies on `app.business_id` set dynamically in PostgreSQL session variables. Client requests NEVER supply `business_id` in JSON bodies.
5. **Monetary Amounts:** All currency fields (`price`, `subtotal`, `total`, `amount`, `discount_value`) are stored as **integer minor units** (paise / cents). Never use floating-point numbers.

---

## 3. Module Development Rules (The 5-File Pattern)

Inside `apps/api/modules/<module_name>/`, follow this structure strictly:

```
apps/api/modules/<module_name>/
├── models.py       # SQLAlchemy ORM models with lazy='selectin'
├── schemas.py      # Pydantic v2 validation models
├── repository.py   # Database queries using AsyncSession & business_id scoping
├── service.py      # Business logic & DomainException validations
└── router.py       # FastAPI router with set_db_context & require_roles
```

---

## 4. How to Verify Code Changes

Before claiming a task or module is complete, you MUST execute the verification suite against the running API:

```bash
# 1. Start API (in terminal 1)
cd apps/api
.venv/Scripts/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# 2. Run master regression suite (in terminal 2)
python verify/run_all.py
```

All 7 test suites must pass 100% green.

---

## 5. Essential Documentation Links

- `docs/HANDOVER.md` — Full project executive summary and status report.
- `docs/DEVELOPER_GUIDE.md` — Developer setup, running locally, and common debugging tips.
- `docs/INFRASTRUCTURE.md` — Topology, Docker, Supabase RLS, and env vars reference.
- `PROJECT_STATE.md` — Complete 22-module status matrix.
- `docs/PRODUCTS_IMPLEMENTATION_REPORT.md` — Reference architecture report for products.
- `docs/PAYMENTS_IMPLEMENTATION_REPORT.md` — Payments module architecture & HMAC verification flow.

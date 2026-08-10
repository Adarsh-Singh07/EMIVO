# ELEKTRIX — Autonomous B2B Commerce Platform

**Official Website & Domain:** [https://elektrix.in](https://elektrix.in)  
*(Historical Note: Formerly named EMIVO during initial scaffold phase)*

ELEKTRIX is a multi-tenant B2B commerce platform built with **Next.js 15**, **React 19**, **FastAPI**, **Supabase (PostgreSQL with RLS)**, **Redis**, and **Cloudflare R2**.

---

## ✨ Features & Modules

- **Authentication & User Management** — Argon2 hashing, JWT access tokens, Redis refresh token family revocation with replay attack protection.
- **Multi-tenant Business Scoping** — Row Level Security (RLS) tenant isolation enforced at the PostgreSQL layer via `SET LOCAL ROLE emivo_app` and `app.business_id`.
- **Products Catalog** — Multi-variant pricing, media attachments, paginated responses, and eager relationship loading (`selectin`).
- **Customer CRM** — Per-tenant unique email constraints, soft deletion (`SoftDeleteMixin`), substring search across name/email/phone.
- **Order Engine** — Automated unit price lookup from database variants, strict state transition matrix (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`), idempotency deduplication.
- **Cart Processing** — Guest sessions (`session_id`) and authenticated user carts, dynamic subtotal auto-calculation, AsyncSession query cache refreshing.
- **Payment Processing** — Provider adapter (Razorpay mock), HMAC-SHA256 signature verification, automatic order status synchronization (`CONFIRMED`/`REFUNDED`), full and partial refunds.
- **Coupons & Discounts** — Percentage & fixed amount discounts (integer minor units), subtotal threshold validation, maximum discount capping, global & per-user usage limit tracking.
- **Developer Control Center & Diagnostics** — Real-time telemetry at `/preview` and `/health` reporting live Supabase, Redis, memory, and CPU metrics.

---

## 🚀 Getting Started

### 1. Environment Setup
```bash
cp .env.example .env
```

### 2. Run Backend (FastAPI)
```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- API Docs: `http://127.0.0.1:8000/api/v1/docs`

### 3. Run Frontend (Next.js)
```bash
npm install
npm run dev        # http://localhost:3000
```

---

## 🧪 Master Regression Test Suite

Ensure API is running on `http://127.0.0.1:8000`, then execute:

```bash
python verify/run_all.py
```

All 7 module test suites (Auth, Products, Customers, Orders, Carts, Payments, Coupons) must pass 100% green against live Supabase and Redis infrastructure.

---

## 🐳 Docker Stack

```bash
docker compose -f compose.dev.yaml up --build
```

---

## 📄 License

ELEKTRIX Platform © 2026. All rights reserved. Official domain: https://elektrix.in

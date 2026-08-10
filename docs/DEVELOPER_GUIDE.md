# ELEKTRIX - Developer Guide

Official Domain: https://elektrix.in  
Historical Note: Formerly named EMIVO during initial scaffold phase.

This guide explains how to set up, run, test, and develop on the ELEKTRIX platform.

---

## 1. Prerequisites

- **Python:** 3.11 or higher
- **Node.js:** v20 or higher (npm v10+)
- **PostgreSQL / Supabase:** Account or local instance
- **Redis:** Local instance or cloud Redis instance
- **Docker:** Optional for containerized local development

---

## 2. Environment Setup

1. **Clone & Environment Configuration:**
   ```bash
   cp .env.example .env
   ```
   Fill in `.env` with your real Supabase, Redis, and R2 credentials.

2. **Backend Environment Setup:**
   ```bash
   cd apps/api
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate

   pip install -r requirements.txt
   ```

3. **Frontend Environment Setup:**
   ```bash
   # From project root
   npm install
   ```

---

## 3. Running the Application Locally

### Running the API Server
```bash
# From apps/api directory with active virtualenv:
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- API Docs (Swagger): `http://127.0.0.1:8000/api/v1/docs`
- Health Check: `http://127.0.0.1:8000/health/live`
- Diagnostics Check: `http://127.0.0.1:8000/health/diagnostics`

### Running the Frontend Application
```bash
# From project root:
npm run dev
```
- Frontend application runs on: `http://localhost:3000`

### Running with Docker Compose
```bash
docker compose -f compose.dev.yaml up --build
```

---

## 4. Database Migrations & RLS Policies

### Running Alembic Migrations
```bash
# From project root:
cd db
alembic upgrade head
```

### Applying RLS Policies to Supabase
```bash
# Apply RLS policies to PostgreSQL:
python apply_rls.py
```
*Note: Ensure `00_app_role.sql` has executed on Supabase to create the `emivo_app` database role.*

---

## 5. Verification & Testing Strategy

The master verification script runs full end-to-end suite checks against the live running API:

1. **Ensure API is running on `127.0.0.1:8000`**.
2. **Execute master regression suite:**
   ```bash
   python verify/run_all.py
   ```
3. **Execute individual module test suite:**
   ```bash
   python verify/products/verify_products.py
   python verify/customers/verify_customers.py
   python verify/orders/verify_orders.py
   python verify/carts/verify_carts.py
   python verify/payments/verify_payments.py
   python verify/coupons/verify_coupons.py
   ```

---

## 6. How to Build a New Module (The 5-File Pattern)

Every business module inside `apps/api/modules/<module_name>/` must adhere to this exact structure:

1. **`models.py`:** SQLAlchemy ORM models inheriting `Base`, `TimestampMixin`, `TenantMixin`, `SoftDeleteMixin`. Use `lazy='selectin'` for eager relationship loading.
2. **`schemas.py`:** Pydantic v2 schemas (`Create`, `Update`, `Response`, `PaginatedResponse`).
3. **`repository.py`:** Asynchronous database layer taking `AsyncSession`. Filter by `business_id` and `deleted_at.is_(None)`. Use `populate_existing=True` when returning updated objects with relationships.
4. **`service.py`:** Business logic layer handling domain checks, computations, and throwing `DomainException`.
5. **`router.py`:** FastAPI router using `Depends(set_db_context)` and `require_roles([...])`.

Mount the new router in `apps/api/main.py`.

# EMIVO Coupons Module — Implementation Report

**Date:** 2026-08-09  
**Module Status:** ✅ Complete — Production Ready  
**Verification Results:** 30/30 assertions passed against live Supabase PostgreSQL & Redis infrastructure  

---

## Executive Summary

The **Coupons Module** provides promotion, discount management, validation, and usage tracking for the EMIVO multi-tenant SaaS eCommerce platform. It supports both **percentage-based** and **fixed-amount** discounts, subtotal thresholds (`min_order_amount`), discount capping (`max_discount_amount`), global usage limits, per-user usage limits, validity date ranges, usage recording, and soft deletion.

Tenant security is enforced strictly at the database layer via PostgreSQL **Row Level Security (RLS)** with the `emivo_app` database role (`NOBYPASSRLS`) and session context variable `app.business_id`.

---

## Database Architecture & Schemas

### 1. `coupons` Table

Stores tenant coupon definitions and usage limits. All monetary thresholds and fixed discount amounts are saved as **integers in minor currency units** (e.g., 1000 for INR 10.00 / $10.00) or integer percentages (e.g., 20 for 20%) to avoid floating-point inaccuracies.

| Column | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | `PRIMARY KEY`, default UUIDv4 | Unique coupon identifier |
| `business_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (businesses.id) ON DELETE CASCADE`, `INDEX` | Tenant isolation column |
| `code` | `VARCHAR(50)` | `NOT NULL`, `INDEX` | Coupon code (stored uppercase, e.g. `SAVE20`) |
| `description` | `VARCHAR(255)` | `NULLABLE` | Human-readable coupon description |
| `discount_type` | `VARCHAR(20)` | `NOT NULL`, Enum: `DiscountType` | Discount model (`PERCENTAGE` or `FIXED_AMOUNT`) |
| `discount_value` | `INTEGER` | `NOT NULL`, > 0 | Percentage integer (e.g. 20) or minor units for fixed amount (e.g. 1000) |
| `min_order_amount` | `INTEGER` | `NULLABLE`, Default: 0 | Minimum cart subtotal required in minor units |
| `max_discount_amount` | `INTEGER` | `NULLABLE` | Maximum discount cap in minor units |
| `usage_limit` | `INTEGER` | `NULLABLE` | Maximum global usages permitted |
| `usage_count` | `INTEGER` | `NOT NULL`, Default: 0 | Total times coupon has been applied |
| `per_user_limit` | `INTEGER` | `NULLABLE`, Default: 1 | Maximum usages permitted per individual customer |
| `start_date` | `TIMESTAMPTZ` | `NULLABLE` | Activation start timestamp (UTC) |
| `end_date` | `TIMESTAMPTZ` | `NULLABLE` | Expiration timestamp (UTC) |
| `is_active` | `BOOLEAN` | `NOT NULL`, Default: `true` | Active status flag |
| `created_at` | `TIMESTAMPTZ` | Default: `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Default: `now()`, on update `now()` | Last modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE` | Soft delete timestamp |

### 2. `coupon_usages` Table

Tracks individual coupon applications by customers and links them to orders.

| Column | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | `PRIMARY KEY`, default UUIDv4 | Unique usage record identifier |
| `business_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (businesses.id) ON DELETE CASCADE`, `INDEX` | Tenant isolation column |
| `coupon_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (coupons.id) ON DELETE CASCADE` | Associated coupon |
| `user_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (users.id)` | Customer who used coupon |
| `order_id` | `VARCHAR(36)` | `NULLABLE`, `FOREIGN KEY (orders.id)` | Associated order ID (if applied during order creation) |
| `discount_applied` | `INTEGER` | `NOT NULL` | Actual discount amount granted in minor units |
| `created_at` | `TIMESTAMPTZ` | Default: `now()` | Usage timestamp |
| `updated_at` | `TIMESTAMPTZ` | Default: `now()`, on update `now()` | Last modification timestamp |

### Database Relationships
- `Coupon.usages` has an ORM relationship with `CouponUsage` configured with `cascade="all, delete-orphan"` and `lazy="selectin"` to ensure seamless async SQLAlchemy operation.

### Database Migrations & RLS Policies
- **Table Definition:** `business_id` added as a non-nullable foreign key column in the core schema.
- **RLS SQL Policy:** [`db/rls/08_coupons.sql`](file:///d:/Projects/EMIVO/db/rls/08_coupons.sql)
  - `ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE public.coupons FORCE ROW LEVEL SECURITY;`
  - `ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE public.coupon_usages FORCE ROW LEVEL SECURITY;`
  - Policy `"tenant_isolation_coupons"`: `USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text)`
  - Policy `"tenant_isolation_coupon_usages"`: `USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text)`

---

## Row Level Security (RLS) Mechanics

Multi-tenant isolation for coupons and coupon usages is enforced at the database level:
1. **Role Context Enforcement:** FastAPI dependency [`set_db_context`](file:///d:/Projects/EMIVO/apps/api/core/dependencies.py) executes `SET LOCAL ROLE emivo_app`. Because `emivo_app` has `NOBYPASSRLS`, PostgreSQL evaluates RLS policies strictly.
2. **Session Variable Context:** [`set_db_context`](file:///d:/Projects/EMIVO/apps/api/core/dependencies.py) sets `SET LOCAL app.business_id = '<tenant_id>'` based on the authenticated JWT token.
3. **Cross-Tenant Access Result:** Business B attempting to query, update, delete, or validate Business A's coupons receives HTTP `404 Not Found` (or `403 Forbidden`) with `is_valid: False`, ensuring zero cross-tenant leakage.

---

## API Endpoints & Request / Response Examples

Base Path: `/api/v1/coupons`

| Endpoint | Method | RBAC Roles | Description |
|---|---|---|---|
| `/` | `POST` | `owner`, `staff`, `platform_admin` | Create a new coupon |
| `/` | `GET` | `owner`, `staff`, `platform_admin` | List tenant coupons with pagination |
| `/{coupon_id}` | `GET` | `owner`, `staff`, `platform_admin` | Get coupon details by ID |
| `/{coupon_id}` | `PATCH` | `owner`, `staff`, `platform_admin` | Update coupon fields |
| `/{coupon_id}` | `DELETE` | `owner`, `platform_admin` | Soft delete coupon |
| `/validate` | `POST` | `owner`, `staff`, `platform_admin` | Validate coupon against subtotal and user |
| `/apply` | `POST` | `owner`, `staff`, `platform_admin` | Apply coupon and record usage |

---

### Endpoint Details & Code Contracts

#### 1. Create Coupon — `POST /api/v1/coupons/`
- **Request Body (Percentage Coupon):**
```json
{
  "code": "save20",
  "description": "20% off all orders",
  "discount_type": "PERCENTAGE",
  "discount_value": 20,
  "min_order_amount": 5000,
  "max_discount_amount": 2000,
  "usage_limit": 100,
  "per_user_limit": 2,
  "is_active": true
}
```
- **Response (201 Created):**
```json
{
  "id": "7b8f9e12-3456-7890-abcd-ef1234567890",
  "business_id": "biz_123456",
  "code": "SAVE20",
  "description": "20% off all orders",
  "discount_type": "PERCENTAGE",
  "discount_value": 20,
  "min_order_amount": 5000,
  "max_discount_amount": 2000,
  "usage_limit": 100,
  "usage_count": 0,
  "per_user_limit": 2,
  "start_date": null,
  "end_date": null,
  "is_active": true,
  "created_at": "2026-08-09T20:00:00Z",
  "updated_at": "2026-08-09T20:00:00Z"
}
```

#### 2. Duplicate Code Validation — `POST /api/v1/coupons/`
- Creating a coupon with an existing code in the same tenant returns **409 Conflict**:
```json
{
  "detail": "Coupon with code 'SAVE20' already exists in this business",
  "code": "DUPLICATE_RESOURCE"
}
```

#### 3. List Coupons — `GET /api/v1/coupons/?page=1&page_size=20`
- **Response (200 OK):**
```json
{
  "items": [
    {
      "id": "7b8f9e12-3456-7890-abcd-ef1234567890",
      "business_id": "biz_123456",
      "code": "SAVE20",
      "description": "20% off all orders",
      "discount_type": "PERCENTAGE",
      "discount_value": 20,
      "min_order_amount": 5000,
      "max_discount_amount": 2000,
      "usage_limit": 100,
      "usage_count": 0,
      "per_user_limit": 2,
      "is_active": true,
      "created_at": "2026-08-09T20:00:00Z",
      "updated_at": "2026-08-09T20:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "has_next": false,
  "has_prev": false
}
```

#### 4. Update Coupon — `PATCH /api/v1/coupons/{coupon_id}`
- **Request Body:**
```json
{
  "description": "Updated 20% off promotion",
  "min_order_amount": 4000
}
```
- **Response (200 OK):** Updated coupon object.

#### 5. Validate Coupon — `POST /api/v1/coupons/validate`
- **Request Body:**
```json
{
  "code": "SAVE20",
  "cart_subtotal": 10000,
  "user_id": "usr_998877"
}
```
- **Response (200 OK - Valid):**
```json
{
  "is_valid": true,
  "coupon": {
    "id": "7b8f9e12-3456-7890-abcd-ef1234567890",
    "business_id": "biz_123456",
    "code": "SAVE20",
    "discount_type": "PERCENTAGE",
    "discount_value": 20,
    "min_order_amount": 4000,
    "max_discount_amount": 2000,
    "usage_limit": 100,
    "usage_count": 0,
    "per_user_limit": 2,
    "is_active": true,
    "created_at": "2026-08-09T20:00:00Z",
    "updated_at": "2026-08-09T20:00:00Z"
  },
  "discount_amount": 2000,
  "message": "Coupon applied successfully"
}
```
- **Response (200 OK - Below Minimum Subtotal):**
```json
{
  "is_valid": false,
  "coupon": null,
  "discount_amount": 0,
  "message": "Minimum order subtotal for this coupon is 4000"
}
```

#### 6. Apply Coupon — `POST /api/v1/coupons/apply`
- **Request Body:**
```json
{
  "code": "FLAT1000",
  "cart_subtotal": 5000,
  "user_id": "usr_998877",
  "order_id": "ord_112233"
}
```
- **Response (200 OK):**
```json
{
  "coupon": {
    "id": "8c9a0b12-4567-8901-bcde-f23456789012",
    "code": "FLAT1000",
    "usage_count": 1,
    "is_active": true
  },
  "discount_amount": 1000,
  "message": "Coupon applied and usage recorded successfully"
}
```

#### 7. Soft Delete Coupon — `DELETE /api/v1/coupons/{coupon_id}`
- **Response (204 No Content):** Sets `deleted_at = now()`, `is_active = false`. Subsequent `GET` returns `404 Not Found`.

---

## Business & Validation Rules

1. **Discount Models:**
   - `PERCENTAGE`: Calculated as `(cart_subtotal * discount_value) / 100`.
   - `FIXED_AMOUNT`: Fixed integer minor units granted directly.
2. **Discount Caps:**
   - Discount amount is capped at `max_discount_amount` if configured.
   - Discount amount cannot exceed `cart_subtotal`.
3. **Subtotal Requirement (`min_order_amount`):**
   - Validation fails if `cart_subtotal < min_order_amount`.
4. **Usage Limits:**
   - **Global Limit:** Fails if `usage_count >= usage_limit`.
   - **Per-User Limit:** Evaluated against `coupon_usages` table records for `(coupon_id, user_id)`.
5. **Code Normalization & Duplication:**
   - Codes automatically converted to uppercase (`code.upper()`).
   - Duplicate codes per business return `409 Conflict`.
6. **Soft Deletion:**
   - Deleted coupons retain history in DB but are filtered out from API listing and GET queries.

---

## Verification Results

The module was verified using [`verify/coupons/verify_coupons.py`](file:///d:/Projects/EMIVO/verify/coupons/verify_coupons.py) against live Supabase PostgreSQL and Redis.

| Test Section | Assertion Description | Result |
|---|---|---|
| **Auth Context Setup** | Business A and B owner accounts registered & authenticated | ✅ PASS |
| **1. Create Coupons** | Create percentage coupon (201 Created) | ✅ PASS |
| | Coupon code converted & stored in uppercase (`SAVE20`) | ✅ PASS |
| | Percentage discount value verified as 20 | ✅ PASS |
| | Create fixed amount coupon (201 Created) | ✅ PASS |
| **2. Duplicate Code** | Re-creating coupon with duplicate code returns 409 Conflict | ✅ PASS |
| **3. Get & List** | Get coupon by ID returns 200 OK with matching object | ✅ PASS |
| | Get non-existent coupon returns 404 Not Found | ✅ PASS |
| | List coupons returns 200 OK with `total >= 2` | ✅ PASS |
| **4. Update Coupon** | Update coupon description & min_order_amount returns 200 OK | ✅ PASS |
| | Description & min_order_amount field changes verified | ✅ PASS |
| **5. Validate Coupon** | Validate valid coupon returns `is_valid: true` (200 OK) | ✅ PASS |
| | Discount amount calculated correctly (2000 minor units) | ✅ PASS |
| | Validation fails (`is_valid: false`) when cart subtotal is below minimum | ✅ PASS |
| | Validation fails for non-existent coupon code | ✅ PASS |
| **6. Apply Coupon** | Apply fixed amount coupon returns 200 OK with discount = 1000 | ✅ PASS |
| | Coupon `usage_count` atomically incremented to 1 | ✅ PASS |
| | Validation fails (`is_valid: false`) after user reaches `per_user_limit` | ✅ PASS |
| **7. Soft Delete** | Soft delete coupon returns 204 No Content | ✅ PASS |
| | Soft-deleted coupon returns 404 Not Found on GET | ✅ PASS |
| **8. RLS Isolation** | Business B owner receives 404/403 attempting to access Business A coupon | ✅ PASS |
| | Business B owner cannot validate Business A coupon code | ✅ PASS |
| **9. Unauthorized** | Requests without auth token return 401/403 | ✅ PASS |
| | Requests with invalid token return 401/403 | ✅ PASS |

**Final Verification Summary:** **30 / 30 assertions passed.**

---

## Architectural Notes & Fixes

1. **AsyncSession Compatibility:** Replaced legacy synchronous code with `AsyncSession` throughout Repository, Service, and Router layers.
2. **Query Cache Hydration:** Used `execution_options(populate_existing=True)` and `selectinload(Coupon.usages)` to avoid SQLAlchemy greenlet loading issues.
3. **RLS Role Security:** Secured table access under `emivo_app` role (`NOBYPASSRLS`).

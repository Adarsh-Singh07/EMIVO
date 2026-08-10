# EMIVO Carts Module — Implementation & Verification Report

## Executive Summary

The **Carts Module** for EMIVO has been fully implemented, integrated, and verified against live Supabase infrastructure. It implements a complete AsyncSession-driven vertical slice following strict repository patterns, tenant-isolated RLS enforcement via PostgreSQL `emivo_app` role, dynamic unit price resolution, auto-calculated cart subtotals in integer minor units (cents/paise), and guest session/authenticated user cart management.

All **30/30 test assertions** passed in live end-to-end verification against real Supabase DB instances ([`verify/carts/verify_carts.py`](file:///d:/Projects/EMIVO/verify/carts/verify_carts.py)), and the full regression suite remains 100% green across all 5 active vertical slices (Auth, Products, Customers, Orders, Carts).

---

## 1. Database Schema

The Carts module utilizes two relational tables defined in [`apps/api/modules/carts/models.py`](file:///d:/Projects/EMIVO/apps/api/modules/carts/models.py) and migrated via Alembic migration `20260809_0500_ee32a76efdd4_add_carts_module_tables.py`.

### `carts` Table

| Column | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | `PRIMARY KEY`, UUID v4 | Unique identifier for the cart |
| `business_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (businesses.id)` | Tenant identifier for multi-tenant isolation |
| `user_id` | `VARCHAR(36)` | `NULLABLE`, `FOREIGN KEY (users.id)`, Index | User ID for authenticated customer carts |
| `session_id` | `VARCHAR(255)` | `NULLABLE`, Index | Session string identifier for guest guest carts |
| `subtotal` | `INTEGER` | `NOT NULL`, Default `0` | Cart subtotal in minor units (e.g. cents/paise) |
| `expires_at` | `TIMESTAMPTZ` | `NULLABLE` | Cart expiration timestamp |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `now()` | Timestamp of creation |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `now()` | Timestamp of last update |

### `cart_items` Table

| Column | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | `PRIMARY KEY`, UUID v4 | Unique item identifier |
| `cart_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (carts.id) ON DELETE CASCADE`, Index | Owning cart reference |
| `product_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (products.id)` | Target product ID |
| `variant_id` | `VARCHAR(36)` | `NULLABLE`, `FOREIGN KEY (product_variants.id)` | Target product variant ID (optional) |
| `quantity` | `INTEGER` | `NOT NULL`, Default `1`, Check `quantity >= 1` | Item quantity |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `now()` | Timestamp of addition |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `now()` | Timestamp of last update |

> [!NOTE]
> `Cart.items` relationship uses `lazy="selectin"` and `cascade="all, delete-orphan"` to guarantee clean asynchronous eager loading without triggering SQLAlchemy `MissingGreenlet` errors.

---

## 2. API Endpoints & Contract Specifications

All API endpoints are defined in [`apps/api/modules/carts/router.py`](file:///d:/Projects/EMIVO/apps/api/modules/carts/router.py) with prefix `/api/v1/carts`.

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/api/v1/carts` | Retrieve active cart by `user_id` or `session_id` (creates new if absent) | `200 OK` |
| `GET` | `/api/v1/carts/{cart_id}` | Retrieve cart details by ID | `200 OK` / `404 Not Found` |
| `POST` | `/api/v1/carts/{cart_id}/items` | Add product/variant to cart & recalculate subtotal | `201 Created` |
| `PATCH` | `/api/v1/carts/{cart_id}/items/{item_id}` | Update item quantity & recalculate subtotal | `200 OK` |
| `DELETE` | `/api/v1/carts/{cart_id}/items/{item_id}` | Remove single item from cart & recalculate subtotal | `200 OK` |
| `POST` | `/api/v1/carts/{cart_id}/clear` | Remove all items from cart and reset subtotal to 0 | `200 OK` |

---

## 3. Request & Response Examples

### A. Get or Create Cart (`GET /api/v1/carts?session_id=sess_1770644040`)

**Response (`200 OK`):**
```json
{
  "id": "e8a085d2-094b-4bbf-93f5-bf15dd7c2cb4",
  "business_id": "b1828f7a-4c22-44df-a8b2-570a969e5d12",
  "user_id": null,
  "session_id": "sess_1770644040",
  "subtotal": 0,
  "expires_at": null,
  "items": [],
  "created_at": "2026-08-09T18:55:00.123456Z",
  "updated_at": "2026-08-09T18:55:00.123456Z"
}
```

### B. Add Item to Cart (`POST /api/v1/carts/{cart_id}/items`)

**Request Body:**
```json
{
  "product_id": "9a01f789-21b4-48f8-b3de-7b89510f2c41",
  "variant_id": "2c9405d1-ef12-4019-86ab-3d1209b52123",
  "quantity": 2
}
```

**Response (`201 Created`):**
```json
{
  "id": "e8a085d2-094b-4bbf-93f5-bf15dd7c2cb4",
  "business_id": "b1828f7a-4c22-44df-a8b2-570a969e5d12",
  "user_id": null,
  "session_id": "sess_1770644040",
  "subtotal": 21000,
  "expires_at": null,
  "items": [
    {
      "id": "7611ab9c-5d12-48df-9b21-998811442233",
      "cart_id": "e8a085d2-094b-4bbf-93f5-bf15dd7c2cb4",
      "product_id": "9a01f789-21b4-48f8-b3de-7b89510f2c41",
      "variant_id": "2c9405d1-ef12-4019-86ab-3d1209b52123",
      "quantity": 2,
      "unit_price": 10500,
      "subtotal": 21000,
      "product_name": "Mechanical Keyboard",
      "variant_name": "Wireless RGB Switch",
      "created_at": "2026-08-09T18:56:10.000000Z",
      "updated_at": "2026-08-09T18:56:10.000000Z"
    }
  ],
  "created_at": "2026-08-09T18:55:00.123456Z",
  "updated_at": "2026-08-09T18:56:10.000000Z"
}
```

### C. Update Item Quantity (`PATCH /api/v1/carts/{cart_id}/items/{item_id}`)

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response (`200 OK`):**
```json
{
  "id": "e8a085d2-094b-4bbf-93f5-bf15dd7c2cb4",
  "business_id": "b1828f7a-4c22-44df-a8b2-570a969e5d12",
  "user_id": null,
  "session_id": "sess_1770644040",
  "subtotal": 31500,
  "expires_at": null,
  "items": [
    {
      "id": "7611ab9c-5d12-48df-9b21-998811442233",
      "cart_id": "e8a085d2-094b-4bbf-93f5-bf15dd7c2cb4",
      "product_id": "9a01f789-21b4-48f8-b3de-7b89510f2c41",
      "variant_id": "2c9405d1-ef12-4019-86ab-3d1209b52123",
      "quantity": 3,
      "unit_price": 10500,
      "subtotal": 31500,
      "product_name": "Mechanical Keyboard",
      "variant_name": "Wireless RGB Switch",
      "created_at": "2026-08-09T18:56:10.000000Z",
      "updated_at": "2026-08-09T18:57:00.000000Z"
    }
  ],
  "created_at": "2026-08-09T18:55:00.123456Z",
  "updated_at": "2026-08-09T18:57:00.000000Z"
}
```

---

## 4. Business Rules & Technical Logic

### Guest Session vs User Carts
- Carts can be associated with a guest `session_id` (for non-authenticated e-commerce shoppers) or a logged-in `user_id`.
- `get_or_create_cart` checks `user_id` first. If no existing active cart is found for the user, it checks `session_id`. If neither exists, a new cart record is persisted under the active tenant `business_id`.
- Requires at least one identity parameter (`user_id` or `session_id`), raising `400 Bad Request` if both are null.

### Dynamic Price Lookup & Minor Units Calculation
- Unit prices are never accepted directly from client payloads to prevent price tampering attacks.
- Unit prices are resolved dynamically from database models:
  - If `variant_id` is supplied, `ProductVariant.price` is fetched.
  - If `variant_id` is null, parent `Product.price` is fetched.
- Subtotal calculations for line items and the aggregate cart subtotal are computed continuously on every mutation (`add_item`, `update_item_quantity`, `remove_item`, `clear_cart`) in integer minor units.

---

## 5. RLS Tenant Isolation Mechanics

Row Level Security is configured in [`db/rls/07_carts.sql`](file:///d:/Projects/EMIVO/db/rls/07_carts.sql) with explicit `FORCE ROW LEVEL SECURITY`.

### Database Policy Definition
```sql
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_carts ON public.carts
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text)
    WITH CHECK (business_id = NULLIF(current_setting('app.business_id', true), '')::text);

CREATE POLICY tenant_isolation_cart_items ON public.cart_items
    FOR ALL
    USING (
        cart_id IN (
            SELECT id FROM public.carts
            WHERE business_id = NULLIF(current_setting('app.business_id', true), '')::text
        )
    )
    WITH CHECK (
        cart_id IN (
            SELECT id FROM public.carts
            WHERE business_id = NULLIF(current_setting('app.business_id', true), '')::text
        )
    );
```

### Application Context & Role Enforcement
- Database sessions set `SET LOCAL ROLE emivo_app` (which has `NOBYPASSRLS`) via `set_db_context` dependency in [`apps/api/core/dependencies.py`](file:///d:/Projects/EMIVO/apps/api/core/dependencies.py).
- Session variable `app.business_id` is populated from JWT tenant claim.
- Cross-tenant cart access attempts by a Business B user targeting a Business A cart immediately return HTTP `404 Not Found` or `403 Forbidden` at the database level.

---

## 6. Validation Rules

- **UUID Format**: `product_id` and `variant_id` strings must be valid 36-character UUIDs.
- **Quantity Constraints**: `quantity` must be an integer `ge=1`.
- **Entity Validation**:
  - Target product must exist in the current tenant database, or `404 Not Found` ("Product not found") is returned.
  - Target variant (if specified) must belong to the target product, or `404 Not Found` ("Variant not found") is returned.
  - Target cart must exist under the authenticated business tenant context, or `404 Not Found` is returned.

---

## 7. Architectural Edge Cases & Bugs Fixed

### Session Identity Cache Refresh (`populate_existing=True`)
- **Problem**: When adding/updating/deleting cart items within an `AsyncSession`, SQLAlchemy's in-memory identity map cached the parent `Cart.items` relationship collection from the initial query. Subsequent queries for the same `Cart` within the same session returned the stale, cached `items` list without reflecting freshly inserted or updated `cart_items` rows in the database.
- **Fix**: In [`CartRepository`](file:///d:/Projects/EMIVO/apps/api/modules/carts/repository.py), all `select(Cart)` queries were updated with `.execution_options(populate_existing=True)` alongside `.options(selectinload(Cart.items))`:
  ```python
  stmt = (
      select(Cart)
      .options(selectinload(Cart.items))
      .execution_options(populate_existing=True)
      .where(Cart.id == str(cart_id))
  )
  ```
  This forces SQLAlchemy to refresh object attributes and re-evaluate relationship loading after DB commits, guaranteeing accurate subtotal and item responses.

---

## 8. Verification Results

Live verification suite ran against actual Supabase PostgreSQL infrastructure:

```bash
python verify/carts/verify_carts.py
```

### Output Summary
```text
============================================================
  EMIVO Carts Module — Verification Suite
============================================================

[Setup: Business A Owner]
  [PASS] Business A owner authenticated

[Setup: Business B Owner]
  [PASS] Business B owner authenticated

[Setup Product & Variant in Business A]
  [PASS] Create product (201)
  [PASS] Add variant (201)

[1. Get or Create Cart]
  [PASS] Create guest cart (200)
  [PASS] Cart session_id matches
  [PASS] Initial subtotal is 0
  [PASS] Initial items empty
  [PASS] Get existing cart (200)
  [PASS] Returns same cart_id

[2. Add Product Item to Cart]
  [PASS] Add product item to cart (201)
  [PASS] Cart has 1 item
  [PASS] Product unit_price is 8500
  [PASS] Item subtotal is 17000
  [PASS] Cart subtotal is 17000

[3. Add Variant Item to Cart]
  [PASS] Add variant item to cart (201)
  [PASS] Cart now has 2 items
  [PASS] Cart subtotal is 27500 (17000 + 10500)

[4. Update Item Quantity]
  [PASS] Update item quantity (200)
  [PASS] Cart subtotal updated to 36000

[5. Get Cart by ID]
  [PASS] Get cart by ID (200)
  [PASS] Get cart subtotal matches
  [PASS] Get non-existent cart returns 404

[6. Remove Item from Cart]
  [PASS] Remove item (200)
  [PASS] Cart has 1 item remaining
  [PASS] Subtotal recalculated to 10500

[7. Clear Cart]
  [PASS] Clear cart (200)
  [PASS] Cart items empty
  [PASS] Cart subtotal reset to 0

[8. RLS Tenant Isolation Test]
  [PASS] Business B CANNOT access Business A cart (404/403)

============================================================
  Results: 30 passed, 0 failed out of 30 checks
============================================================

  ALL CARTS TESTS PASSED
```

---
*Report compiled on 2026-08-09.*

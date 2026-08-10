# Progress Report

## Global Brand Migration — ELEKTRIX (2026-08-10)
Status: **COMPLETE — Repository-wide Brand Migration to ELEKTRIX (https://elektrix.in)**

### Completed
- **Central Branding Configuration:** Created `apps/web/src/config/branding.ts` (`BRAND_CONFIG`) storing brand name, tagline, official domain `https://elektrix.in`, support emails, theme gradients, and social links.
- **Logo Placeholder Assets:**
  - `public/branding/icon.svg` — Stylized ELEKTRIX icon logo for favicon, tab icon, PWA manifest, sidebar, and loading spinners.
  - `public/branding/wordmark.svg` — Full ELEKTRIX wordmark logo for headers, landing, navbar, login, register, and footers.
- **Brand Component:** Created `<BrandLogo />` (`apps/web/src/components/branding/BrandLogo.tsx`) for dynamic logo rendering.
- **Documentation Migration:** Updated `README.md`, `AGENTS.md`, `PROJECT_STATE.md`, `MASTER_PROJECT_STATUS.md`, `HANDOVER.md`, `NEXT_AGENT.md`, `DEVELOPER_GUIDE.md`, `INFRASTRUCTURE.md`, and `CHANGELOG.md` with ELEKTRIX branding and domain `https://elektrix.in`, preserving "EMIVO" strictly in historical reference notes.
- **FastAPI Metadata:** Updated `apps/api/main.py` FastAPI app title to `ELEKTRIX API` and description.
- **SEO & Manifest:** Created `apps/web/public/manifest.json`, `apps/web/src/app/robots.ts`, and `apps/web/src/app/sitemap.ts` pointing to `https://elektrix.in`.
- **Package Configuration:** Updated root `package.json` to `"name": "elektrix"` and `apps/web/package.json` to `"name": "@elektrix/web"`.

---
Status: **COMPLETE — Verified against live Supabase on 2026-08-09 (30/30 assertions passed)**

### Completed
- SQLAlchemy ORM models: [`Coupon`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/models.py#L18) and [`CouponUsage`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/models.py#L59) with `lazy="selectin"` relationship on `Coupon.usages` and `cascade="all, delete-orphan"`
- Pydantic v2 schemas: [`CouponBase`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/schemas.py#L8), [`CouponCreate`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/schemas.py#L22), [`CouponUpdate`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/schemas.py#L26), [`CouponResponse`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/schemas.py#L38), [`PaginatedCouponsResponse`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/schemas.py#L49), [`CouponValidateRequest`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/schemas.py#L58), [`CouponValidateResponse`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/schemas.py#L64), [`CouponApplyRequest`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/schemas.py#L71)
- Async repository: [`CouponRepository`](file:///d:/Projects/EMIVO/apps/api/modules/coupons/repository.py) using `AsyncSession` throughout (`get_by_id`, `get_by_code`, `list_coupons`, `create`, `update`, `soft_delete`, `get_user_usage_count`, `record_usage`) with `execution_options(populate_existing=True)`
- Coupon code normalization: Converts coupon code to uppercase automatically on creation (`code.upper()`)
- Duplicate code validation: Checks uniqueness per tenant, returning `409 Conflict` on duplicate code creation
- Discount calculation engine: Supports `PERCENTAGE` and `FIXED_AMOUNT` discounts (stored as integer minor units or percentage integers), enforces `min_order_amount` subtotal requirement, caps discount at `max_discount_amount`, and prevents discount from exceeding cart subtotal
- Usage & Limit enforcement: Checks global `usage_limit` against `usage_count`, checks `per_user_limit` against records in `coupon_usages` table, and verifies `start_date` / `end_date` UTC time windows
- Usage recording & counter increment: `apply_coupon` creates usage record in `coupon_usages` table and atomically increments coupon `usage_count`
- FastAPI router: 7 endpoints (`POST /api/v1/coupons/`, `GET /api/v1/coupons/`, `GET /api/v1/coupons/{id}`, `PATCH /api/v1/coupons/{id}`, `DELETE /api/v1/coupons/{id}`, `POST /api/v1/coupons/validate`, `POST /api/v1/coupons/apply`) injected with `set_db_context` dependency and protected by `require_roles` RBAC
- Soft deletion: Sets `deleted_at` timestamp and `is_active = False`, excluding soft-deleted coupons from active list and GET operations
- Database RLS Policy applied: [`db/rls/08_coupons.sql`](file:///d:/Projects/EMIVO/db/rls/08_coupons.sql) with `FORCE ROW LEVEL SECURITY` on `coupons` and `coupon_usages` with permissions granted to `emivo_app` role (`NOBYPASSRLS`)
- Database RLS `emivo_app` role enforced via `set_db_context` dependency (`SET LOCAL ROLE emivo_app` and `SET LOCAL app.business_id`)
- Verification suite: 30/30 test assertions passed against live Supabase infrastructure ([`verify/coupons/verify_coupons.py`](file:///d:/Projects/EMIVO/verify/coupons/verify_coupons.py))

---

## Payments Vertical Slice (Priority 6)
Status: **COMPLETE — Verified against live Supabase on 2026-08-09 (22/22 assertions passed)**

### Completed
- SQLAlchemy ORM models: [`Payment`](file:///d:/Projects/EMIVO/apps/api/modules/payments/models.py#L26) and [`PaymentEvent`](file:///d:/Projects/EMIVO/apps/api/modules/payments/models.py#L54) with `lazy="selectin"` relationship on `Payment.events` and `cascade="all, delete-orphan"`
- Pydantic v2 schemas: [`PaymentCreate`](file:///d:/Projects/EMIVO/apps/api/modules/payments/schemas.py#L8), [`PaymentResponse`](file:///d:/Projects/EMIVO/apps/api/modules/payments/schemas.py#L28), [`PaginatedPaymentsResponse`](file:///d:/Projects/EMIVO/apps/api/modules/payments/schemas.py#L49), [`PaymentSuccessVerification`](file:///d:/Projects/EMIVO/apps/api/modules/payments/schemas.py#L58), [`PaymentRefundRequest`](file:///d:/Projects/EMIVO/apps/api/modules/payments/schemas.py#L63)
- Provider Adapter: Gateway interface [`BasePaymentProvider`](file:///d:/Projects/EMIVO/apps/api/modules/payments/providers/base.py) with Razorpay implementation [`RazorpayMockProvider`](file:///d:/Projects/EMIVO/apps/api/modules/payments/providers/razorpay.py) for order creation and HMAC-SHA256 signature verification
- Async repository: [`PaymentRepository`](file:///d:/Projects/EMIVO/apps/api/modules/payments/repository.py) using `AsyncSession` throughout (`get_by_id`, `get_by_order_id`, `get_by_idempotency_key`, `list_payments`, `create`, `update_status`, `log_event`) with `execution_options(populate_existing=True)` for eager relationship loading
- Minor currency units integer calculation: All transaction amounts validated (`amount > 0`) and stored as integers in minor currency units (cents/paise)
- Idempotency key deduplication: Safe re-submissions return existing payment record without duplicate database creation or external provider order creation
- Payment signature verification & capture: HMAC-SHA256 signature verification marks payment as `CAPTURED` and automatically transitions associated `Order.status` from `PENDING` to `CONFIRMED`
- Full & partial refund support: Processes refunds on `CAPTURED` payments, logs refund reason in `payment_events`, and automatically transitions associated `Order.status` to `REFUNDED`
- FastAPI router: 6 endpoints (`POST /api/v1/payments/initiate`, `POST /api/v1/payments/{id}/verify-success`, `POST /api/v1/payments/{id}/refund`, `GET /api/v1/payments/{id}`, `GET /api/v1/payments/`, `POST /api/v1/payments/webhook/razorpay`) injected with `set_db_context` dependency and protected by `require_roles` RBAC
- Database RLS Policy applied: [`db/rls/09_payments.sql`](file:///d:/Projects/EMIVO/db/rls/09_payments.sql) with `FORCE ROW LEVEL SECURITY` on `payments` and permissions granted to `emivo_app`
- Database RLS `emivo_app` role (`NOBYPASSRLS`) enforced via `set_db_context` dependency (`SET LOCAL ROLE emivo_app` and `SET LOCAL app.business_id`)
- Alembic migration applied: [`20260809_1910_39a4b12c8e1d_add_business_id_to_payments.py`](file:///d:/Projects/EMIVO/db/migrations/versions/20260809_1910_39a4b12c8e1d_add_business_id_to_payments.py) adding non-nullable `business_id` FK column
- Verification suite: 22/22 test assertions passed against live Supabase infrastructure ([`verify/payments/verify_payments.py`](file:///d:/Projects/EMIVO/verify/payments/verify_payments.py))

---

## Carts Vertical Slice (Priority 5)
Status: **COMPLETE — Verified against live Supabase on 2026-08-09 (30/30 assertions passed)**

### Completed
- SQLAlchemy ORM models: [`Cart`](file:///d:/Projects/EMIVO/apps/api/modules/carts/models.py#L11) and [`CartItem`](file:///d:/Projects/EMIVO/apps/api/modules/carts/models.py#L39) with `lazy="selectin"` relationship on `Cart.items` and `cascade="all, delete-orphan"`
- Pydantic v2 schemas: [`CartItemCreate`](file:///d:/Projects/EMIVO/apps/api/modules/carts/schemas.py#L12), [`CartItemUpdate`](file:///d:/Projects/EMIVO/apps/api/modules/carts/schemas.py#L16), [`CartItemResponse`](file:///d:/Projects/EMIVO/apps/api/modules/carts/schemas.py#L20), [`CartCreate`](file:///d:/Projects/EMIVO/apps/api/modules/carts/schemas.py#L39), [`CartResponse`](file:///d:/Projects/EMIVO/apps/api/modules/carts/schemas.py#L43)
- Async repository: [`CartRepository`](file:///d:/Projects/EMIVO/apps/api/modules/carts/repository.py) using `AsyncSession` throughout (`get_by_id`, `get_by_user`, `get_by_session`, `create`, `add_item`, `update_item_quantity`, `remove_item`, `update_subtotal`, `clear`)
- Query identity cache fix: `execution_options(populate_existing=True)` on repository `select(Cart)` queries to ensure eager `Cart.items` relationships refresh properly after DB mutations
- Cart identity support: Supports retrieving or creating active cart by guest `session_id` or authenticated `user_id`
- Dynamic price resolution & minor units subtotal calculation: Unit prices resolved from database `Product` and `ProductVariant` models; subtotal dynamically computed and stored in integer minor units (cents/paise)
- FastAPI router: 6 endpoints (`GET /api/v1/carts`, `GET /api/v1/carts/{id}`, `POST /api/v1/carts/{id}/items`, `PATCH /api/v1/carts/{id}/items/{item_id}`, `DELETE /api/v1/carts/{id}/items/{item_id}`, `POST /api/v1/carts/{id}/clear`) injected with `set_db_context` dependency
- Database RLS Policy applied: [`db/rls/07_carts.sql`](file:///d:/Projects/EMIVO/db/rls/07_carts.sql) with `FORCE ROW LEVEL SECURITY` on `carts` and `cart_items`
- Database RLS `emivo_app` role (`NOBYPASSRLS`) enforced via `set_db_context` dependency (`SET LOCAL ROLE emivo_app` and `SET LOCAL app.business_id`)
- Alembic migration applied: `20260809_0500_ee32a76efdd4_add_carts_module_tables.py`
- Verification suite: 30/30 test assertions passed against live Supabase infrastructure ([`verify/carts/verify_carts.py`](file:///d:/Projects/EMIVO/verify/carts/verify_carts.py))

---

## Orders Vertical Slice (Priority 4)
Status: **COMPLETE — Verified against live Supabase on 2026-08-09 (40/40 assertions passed)**

### Completed
- SQLAlchemy ORM models: `Order` and `OrderItem` in [`apps/api/modules/orders/models.py`](file:///d:/Projects/EMIVO/apps/api/modules/orders/models.py) inheriting `Base`, `TimestampMixin`, `SoftDeleteMixin`, and `TenantMixin`
- `lazy="selectin"` relationship on `Order.items` to eliminate async SQLAlchemy greenlet serialization issues
- Pydantic v2 schemas: `OrderCreate`, `OrderItemCreate`, `Address`, `OrderResponse`, `OrderItemResponse`, `OrderStatusUpdate`, `PaginatedOrdersResponse`
- Async repository: [`OrderRepository`](file:///d:/Projects/EMIVO/apps/api/modules/orders/repository.py) using `AsyncSession` throughout (`create`, `get_by_id`, `get_by_idempotency_key`, `list_orders`, `update`)
- Automatic price resolution: Unit price derived directly from `Product` or `ProductVariant` DB records in [`OrderService.create_order`](file:///d:/Projects/EMIVO/apps/api/modules/orders/service.py#L53)
- Idempotency key deduplication: Safe re-submissions return existing order without duplicate DB creation
- Order status transition matrix validation: Enforces valid state transitions (`PENDING` -> `CONFIRMED` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED` -> `REFUNDED` / `CANCELLED`), rejecting invalid state jumps with 400 Bad Request
- FastAPI router: 5 endpoints (`POST /`, `GET /`, `GET /{id}`, `PATCH /{id}/status`, `DELETE /{id}`) protected by `require_roles` RBAC dependency
- Database RLS Policy applied: [`db/rls/03_orders.sql`](file:///d:/Projects/EMIVO/db/rls/03_orders.sql) with `FORCE ROW LEVEL SECURITY` on `orders` and `order_items`
- Database RLS `emivo_app` role (`NOBYPASSRLS`) enforced via `set_db_context` dependency (`SET LOCAL ROLE emivo_app` and `SET LOCAL app.business_id`)
- Alembic migration applied: [`20260809_1842_266616b0d24c_add_customer_id_and_notes_to_orders.py`](file:///d:/Projects/EMIVO/db/migrations/versions/20260809_1842_266616b0d24c_add_customer_id_and_notes_to_orders.py) adding `customer_id` FK and `notes` column
- Soft deletion: Sets `deleted_at` timestamp, updates status to `CANCELLED`, excludes soft-deleted records from lists and single GET operations
- Verification suite: 40/40 test assertions passed against live Supabase infrastructure ([`verify/orders/verify_orders.py`](file:///d:/Projects/EMIVO/verify/orders/verify_orders.py))

---

## Customers Vertical Slice (Priority 3)
Status: **COMPLETE — Verified against live Supabase on 2026-08-09 (41/41 assertions passed)**

### Completed
- SQLAlchemy ORM model: `Customer` inheriting `Base`, `TimestampMixin`, and `SoftDeleteMixin`
- Pydantic v2 schemas: `CustomerCreate`, `CustomerUpdate`, `CustomerResponse`, `CustomerListResponse`
- Async repository: `AsyncSession` throughout (`create`, `get_by_id`, `get_by_email`, `list_customers`, `update`, `soft_delete`)
- Substring searching (name, email, phone using `ilike`) and pagination metadata (`page`, `page_size`, `total`, `has_next`, `has_prev`)
- Service layer: `_get_current_business_id()` derives tenant from JWT context; tenant-unique email validation (409 Conflict)
- FastAPI router: 5 CRUD endpoints (`POST /`, `GET /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`) protected by `require_roles` RBAC dependency
- Database RLS Policy applied: `db/rls/04_customers.sql` with `FORCE ROW LEVEL SECURITY`
- Database RLS `emivo_app` role (`NOBYPASSRLS`) applied via `SET LOCAL ROLE emivo_app` in `get_db_session()` to enforce RLS on Supabase connections
- Alembic migration applied: `20260809_0449_bf1f48d88adb_upgrade_customers_module.py`
- Table constraint: Unique constraint `uq_customers_business_email` on `(business_id, email)`
- Soft deletion: Sets `deleted_at` timestamp; excludes soft-deleted records from lists and single GET operations
- Verification suite: 41/41 test assertions passed against live Supabase infrastructure

---

## Products Vertical Slice (Priority 2)
Status: **COMPLETE — Verified against live Supabase on 2026-08-09**

### Completed
- SQLAlchemy ORM models: `Product`, `ProductVariant`, `ProductMedia` with `lazy='selectin'` on all relationships
- Pydantic v2 schemas: `ProductCreate`, `ProductUpdate`, `ProductOut`, `VariantCreate`, `VariantOut`, `MediaCreate`, `MediaOut`
- Async repository: `selectinload` on all fetch queries, `AsyncSession` only — no sync sessions
- Service layer: `_get_current_business_id()` injects tenant context from JWT; `business_id` never accepted from client
- FastAPI router: 7 endpoints with `require_roles([...])` RBAC dependency
- RLS policy applied to Supabase: `"Tenant isolation for products"` on `public.products`
- Alembic migration applied: `20260809_0421_24010752e38f_add_products_module_tables`
- `ON DELETE CASCADE` on `product_variants` and `product_media` (FK to `products.id`)
- Fixed 3 bugs: RLS blocked `BusinessMember` query, uppercase role names in router, `MissingGreenlet` on serialization
- All 7 endpoints returned expected HTTP status codes in live testing
- Cross-tenant RLS isolation verified

---


## Authentication Vertical Slice (Phase 2)
Status: **IN PROGRESS**

### Current State
- Backend Auth setup and tests pass
- Phase 1 (Businesses) completely finished, merged, and integrated
- Customers vertical slice completely finished, verified against Supabase, and integrated
- Beginning Auth vertical slice implementation

### Next Steps
- Users/Auth domain models, schemas, repository and service
- Register/Login/Forgot Password API endpoints
- JWT Access and Refresh Tokens
- Session management config
- Next.js Auth pages (/login, /register, etc.)
- Auth context and useAuth hook in React

---

## Businesses Vertical Slice (Phase 1)
Status: **COMPLETE & MERGED**

### Completed
- Backend: Service pattern, domain models, FastAPI endpoints, RLS policies
- Frontend: React components, TypeScript types, Tailwind v4 styling
- Premium UI: Framer-motion animations, Lenis smooth scrolling, Sonner toasts
- Type checking passed
- Fully integrated and merged to main branch
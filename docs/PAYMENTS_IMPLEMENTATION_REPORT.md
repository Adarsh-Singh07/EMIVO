# EMIVO Payments Module — Implementation Report

**Date:** 2026-08-09  
**Module Status:** ✅ Complete — Production Ready  
**Verification Results:** 22/22 assertions passed against live Supabase PostgreSQL & Redis infrastructure  

---

## Executive Summary

The **Payments Module** completes the order settlement lifecycle for the EMIVO multi-tenant SaaS eCommerce platform. It provides end-to-end payment processing including order initiation, provider integration (Razorpay adapter architecture), HMAC-SHA256 payment signature verification and capture, full and partial refund processing, event auditing, idempotency deduplication, and automatic order status synchronization.

Tenant security is enforced strictly at the database layer via PostgreSQL **Row Level Security (RLS)** with the `emivo_app` database role (`NOBYPASSRLS`) and session context variable `app.business_id`.

---

## Database Architecture & Schemas

### 1. `payments` Table

Stores tenant payment transactions. All currency amounts are saved as **integers in minor currency units** (e.g., 9000 for INR 90.00 / $90.00) to avoid floating-point rounding errors.

| Column | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | `PRIMARY KEY`, default UUIDv4 | Unique payment transaction identifier |
| `business_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (businesses.id) ON DELETE CASCADE`, `INDEX` | Tenant isolation column |
| `order_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (orders.id)` | Associated EMIVO order |
| `user_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (users.id)` | User who initiated payment |
| `amount` | `INTEGER` | `NOT NULL`, > 0 | Payment amount in minor units |
| `currency` | `VARCHAR(3)` | `NOT NULL`, Default: `'INR'` | ISO 4217 currency code |
| `status` | `VARCHAR(20)` | `NOT NULL`, Enum: `PaymentStatus` | Current payment status (`PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`) |
| `provider` | `VARCHAR(20)` | `NOT NULL`, Enum: `PaymentProvider` | Gateway provider (`RAZORPAY`, `STRIPE`, `MOCK`) |
| `provider_payment_id` | `VARCHAR(255)` | `NULLABLE`, `UNIQUE` | Payment ID issued by gateway (e.g. `pay_...`) |
| `provider_order_id` | `VARCHAR(255)` | `NULLABLE` | Order ID issued by gateway (e.g. `order_...`) |
| `idempotency_key` | `VARCHAR(255)` | `NULLABLE`, `UNIQUE`, `INDEX` | Deduplication key provided by client |
| `metadata_info` | `JSONB` / `JSON` | `NULLABLE` | Arbitrary metadata / client notes |
| `created_at` | `TIMESTAMPTZ` | Default: `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Default: `now()`, on update `now()` | Last modification timestamp |

### 2. `payment_events` Table

Audit log tracking state transitions and provider webhook events for each payment.

| Column | Type | Constraints / Attributes | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | `PRIMARY KEY`, default UUIDv4 | Unique event identifier |
| `payment_id` | `VARCHAR(36)` | `NOT NULL`, `FOREIGN KEY (payments.id) ON DELETE CASCADE` | Associated payment ID |
| `event_type` | `VARCHAR(100)` | `NOT NULL` | Event key (e.g., `payment_initiated`, `payment_captured`, `payment_refunded`, `signature_verification_failed`) |
| `payload` | `JSONB` / `JSON` | `NOT NULL` | Contextual payload (refund amount, error details, provider raw response) |
| `created_at` | `TIMESTAMPTZ` | Default: `now()` | Event occurrence timestamp |

### Database Relationship
- `Payment.events` has ORM relationship with `PaymentEvent` configured with `cascade="all, delete-orphan"` and `lazy="selectin"` to prevent async SQLAlchemy greenlet issues during serialization.

### Database Migrations & RLS Policies
- **Alembic Migration:** `20260809_1910_39a4b12c8e1d_add_business_id_to_payments.py`
  - Added `business_id` column (`VARCHAR(36)`, non-nullable) with index `ix_payments_business_id` and foreign key constraint to `businesses.id`.
- **RLS SQL Policy:** `db/rls/09_payments.sql`
  - `ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;`
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO emivo_app;`
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_events TO emivo_app;`
  - Policy `"Tenant isolation for payments"`: `USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text)`

---

## Row Level Security (RLS) Mechanics

Multi-tenant data isolation is enforced through a two-step mechanism on every request:
1. **Application Role Enforcement:** The session dependency `set_db_context` executes `SET LOCAL ROLE emivo_app`. Because `emivo_app` has `NOBYPASSRLS`, PostgreSQL enforces RLS policies even when connected via a database superuser account.
2. **Session Variable Context:** `set_db_context` sets `SET LOCAL app.business_id = '<tenant_id>'` based on the JWT context derived from `require_roles`.
3. **Cross-Tenant Access Result:** Any request attempting to access a payment record belonging to a different `business_id` returns HTTP `404 Not Found` (or `403 Forbidden`), preventing data leakage across tenants.

---

## API Endpoints & Request / Response Examples

Base Path: `/api/v1/payments`

| Endpoint | Method | RBAC Roles | Description |
|---|---|---|---|
| `/initiate` | `POST` | `owner`, `staff`, `platform_admin` | Initiate a payment for an active order |
| `/{payment_id}/verify-success` | `POST` | `owner`, `staff`, `platform_admin` | Verify signature and capture payment |
| `/{payment_id}/refund` | `POST` | `owner`, `platform_admin` | Issue a full or partial payment refund |
| `/{payment_id}` | `GET` | `owner`, `staff`, `platform_admin` | Retrieve payment by ID with loaded events |
| `/` | `GET` | `owner`, `staff`, `platform_admin` | List payments with filtering and pagination |
| `/webhook/razorpay` | `POST` | Public (Header auth) | Gateway webhook notification handler |

---

### Endpoints Details & Code Contracts

#### 1. Initiate Payment — `POST /api/v1/payments/initiate`
- **Request Body:**
```json
{
  "order_id": "8f2d5e31-5099-4c8d-8a1a-3d2b99812345",
  "amount": 9000,
  "currency": "INR",
  "provider": "MOCK",
  "idempotency_key": "idem_pay_1770644400",
  "metadata": {
    "notes": "Order payment via checkout"
  }
}
```
- **Response (HTTP 201 Created):**
```json
{
  "id": "e6a71b29-6b21-4f11-9a72-74c100223344",
  "business_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "order_id": "8f2d5e31-5099-4c8d-8a1a-3d2b99812345",
  "user_id": "usr_998877665544332211",
  "amount": 9000,
  "currency": "INR",
  "status": "PENDING",
  "provider": "MOCK",
  "provider_payment_id": null,
  "provider_order_id": "order_a1b2c3d4e5f678",
  "idempotency_key": "idem_pay_1770644400",
  "metadata_info": {
    "notes": "Order payment via checkout"
  },
  "events": [
    {
      "id": "evt_112233445566778899",
      "payment_id": "e6a71b29-6b21-4f11-9a72-74c100223344",
      "event_type": "payment_initiated",
      "payload": {
        "provider_order_id": "order_a1b2c3d4e5f678"
      },
      "created_at": "2026-08-09T19:10:05.123456Z"
    }
  ],
  "created_at": "2026-08-09T19:10:05.120000Z",
  "updated_at": "2026-08-09T19:10:05.120000Z"
}
```

#### 2. Verify Payment & Capture — `POST /api/v1/payments/{payment_id}/verify-success`
- **Request Body:**
```json
{
  "provider_payment_id": "mock_pay_12345",
  "provider_signature": "6d9e0f...hmac_sha256_hex..."
}
```
- **Response (HTTP 200 OK):**
```json
{
  "id": "e6a71b29-6b21-4f11-9a72-74c100223344",
  "business_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "order_id": "8f2d5e31-5099-4c8d-8a1a-3d2b99812345",
  "user_id": "usr_998877665544332211",
  "amount": 9000,
  "currency": "INR",
  "status": "CAPTURED",
  "provider": "MOCK",
  "provider_payment_id": "mock_pay_12345",
  "provider_order_id": "order_a1b2c3d4e5f678",
  "idempotency_key": "idem_pay_1770644400",
  "metadata_info": {
    "notes": "Order payment via checkout"
  },
  "events": [
    {
      "id": "evt_112233445566778899",
      "payment_id": "e6a71b29-6b21-4f11-9a72-74c100223344",
      "event_type": "payment_initiated",
      "payload": {
        "provider_order_id": "order_a1b2c3d4e5f678"
      },
      "created_at": "2026-08-09T19:10:05.123456Z"
    },
    {
      "id": "evt_998877665544332211",
      "payment_id": "e6a71b29-6b21-4f11-9a72-74c100223344",
      "event_type": "payment_captured",
      "payload": {
        "provider_payment_id": "mock_pay_12345"
      },
      "created_at": "2026-08-09T19:10:10.654321Z"
    }
  ],
  "created_at": "2026-08-09T19:10:05.120000Z",
  "updated_at": "2026-08-09T19:10:10.650000Z"
}
```

#### 3. Refund Payment — `POST /api/v1/payments/{payment_id}/refund`
- **Request Body:**
```json
{
  "amount": 9000,
  "reason": "Customer returned product"
}
```
- **Response (HTTP 200 OK):**
```json
{
  "id": "e6a71b29-6b21-4f11-9a72-74c100223344",
  "business_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "order_id": "8f2d5e31-5099-4c8d-8a1a-3d2b99812345",
  "user_id": "usr_998877665544332211",
  "amount": 9000,
  "currency": "INR",
  "status": "REFUNDED",
  "provider": "MOCK",
  "provider_payment_id": "mock_pay_12345",
  "provider_order_id": "order_a1b2c3d4e5f678",
  "idempotency_key": "idem_pay_1770644400",
  "metadata_info": {
    "notes": "Order payment via checkout"
  },
  "events": [
    {
      "id": "evt_112233445566778899",
      "payment_id": "e6a71b29-6b21-4f11-9a72-74c100223344",
      "event_type": "payment_initiated",
      "payload": { "provider_order_id": "order_a1b2c3d4e5f678" },
      "created_at": "2026-08-09T19:10:05.123456Z"
    },
    {
      "id": "evt_998877665544332211",
      "payment_id": "e6a71b29-6b21-4f11-9a72-74c100223344",
      "event_type": "payment_captured",
      "payload": { "provider_payment_id": "mock_pay_12345" },
      "created_at": "2026-08-09T19:10:10.654321Z"
    },
    {
      "id": "evt_334455667788990011",
      "payment_id": "e6a71b29-6b21-4f11-9a72-74c100223344",
      "event_type": "payment_refunded",
      "payload": {
        "refund_amount": 9000,
        "reason": "Customer returned product"
      },
      "created_at": "2026-08-09T19:10:15.987654Z"
    }
  ],
  "created_at": "2026-08-09T19:10:05.120000Z",
  "updated_at": "2026-08-09T19:10:15.980000Z"
}
```

#### 4. List Payments — `GET /api/v1/payments/?order_id={id}&status={status}&page=1&page_size=20`
- **Response (HTTP 200 OK):**
```json
{
  "items": [ /* PaymentResponse objects */ ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "has_next": false,
  "has_prev": false
}
```

---

## Business & Validation Rules

1. **Integer Minor Currency Units:** Amounts must be positive integers (`amount > 0`). No floating point values are accepted or stored.
2. **Idempotency Deduplication:** Payment initiation requires `idempotency_key`. Re-submitting the same idempotency key immediately returns the existing payment record without creating duplicate database rows or external provider orders.
3. **Order Validation:** Initiate payment checks that the target `order_id` exists for the authenticated business context (404 if missing).
4. **Signature Verification & State Sync:**
   - Signature validation evaluates `HMAC-SHA256(secret, provider_order_id + "|" + provider_payment_id)`.
   - On successful verification: Payment status transitions to `CAPTURED`, a `payment_captured` event is logged, and the associated `Order.status` automatically transitions from `PENDING` to `CONFIRMED`.
   - On verification failure: Payment status transitions to `FAILED`, a `signature_verification_failed` event is logged, and HTTP 400 Bad Request is returned.
5. **Refund Rules & State Sync:**
   - Refunds are permitted only on payments in `CAPTURED` status (HTTP 400 for invalid statuses).
   - Partial refunds accept an explicit `amount` parameter; if omitted, full refund is processed.
   - Refunding transitions payment status to `REFUNDED`, logs a `payment_refunded` event with the reason, and automatically transitions the associated `Order.status` to `REFUNDED`.

---

## Verification Suite & Test Results

Execution Script: `verify/payments/verify_payments.py`  
Target Infrastructure: Live Supabase PostgreSQL database & Redis instance

### Test Results Breakdown (22 / 22 Passed)

```
============================================================
  EMIVO Payments Module — Verification Suite
============================================================
  [PASS] Business A owner authenticated with owner role
  [PASS] Business B owner authenticated with owner role

[Setup Data in Business A]
  [PASS] Create Customer in Business A (201)
  [PASS] Create Product in Business A (201)
  [PASS] Create Order in Business A (201)

[1. Initiate Payment]
  [PASS] Initiate payment (201)
  [PASS] Payment status is PENDING
  [PASS] Provider order ID created (order_...)

[2. Idempotency Key Re-submission]
  [PASS] Re-submitting idempotency key returns same payment

[3. Verify Payment Success & Capture]
  [PASS] Verify & capture payment (200)
  [PASS] Payment status updated to CAPTURED
  [PASS] Associated Order status transitioned to CONFIRMED

[4. Get Payment by ID]
  [PASS] Get payment by ID (200)
  [PASS] Get non-existent payment returns 404

[5. List Payments with Filters & Pagination]
  [PASS] List payments (200)
  [PASS] List payments returns items (Total: 1)
  [PASS] Filter payments by order_id and status=CAPTURED

[6. Issue Refund]
  [PASS] Refund payment (200)
  [PASS] Associated Order status transitioned to REFUNDED

[7. RLS Tenant Isolation Test]
  [PASS] Business B CANNOT access Business A payment (404/403)

[8. Unauthorized Access]
  [PASS] No auth token returns 401/403
  [PASS] Invalid token returns 401/403

============================================================
  Results: 22 passed, 0 failed out of 22 checks
============================================================

  ALL PAYMENTS TESTS PASSED
```

---

## Bugs Fixed & Architecture Hardening

1. **AsyncSession Identity Cache Stale Eager Loading:** Added `execution_options(populate_existing=True)` on repository `select(Payment)` queries so that when `Payment.events` is eagerly loaded using `selectinload`, subsequent queries during state changes properly refresh child relationships.
2. **RLS Permission Escalation Prevention:** Added `GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO emivo_app;` and `GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_events TO emivo_app;` in `db/rls/09_payments.sql` to ensure non-superuser app role has appropriate grants while enforcing `FORCE ROW LEVEL SECURITY`.
3. **Async SQLAlchemy MissingGreenlet Prevention:** Specified `lazy="selectin"` on `Payment.events` ORM relationship to avoid greenlet errors during Pydantic schema serialization.
4. **Order Status Auto-Sync:** Integrated cross-repository update in `PaymentService` to transition `Order.status` to `CONFIRMED` upon capture and `REFUNDED` upon refund.

# 03 — Backend Architecture & Project Structure

## 1. Shape: the modular monolith (approved)

One FastAPI process contains all **business** modules. It is *not* a monolith in the
bad sense: modules are isolated, own their tables, expose only schemas, and talk to
each other **only through versioned domain events** on a transactional outbox → Redis
Streams. The workers and ai-gateway/voice are already separate processes.

```
What is a module?
  A self-contained unit with:
  - its own tables (a module owns its schema; no other module writes to them)
  - its own router, service(s), repository, schemas (DTOs), models
  - its own events it EMITS and events it CONSUMES
  - zero imports of another module's internals (enforced by import-linter)
```

**Why a module, not a class/folder:** this is the seam where the future microservice
lives. If `products` needs `inventory`, it does **not** `from modules.inventory import
...`. It emits `ProductUpdated` on the outbox; an internal subscriber refreshes
inventory. Same event, same handler, when they split — the handler just runs in a
different process.

**Trade-off:** you must design events as the cross-module contract up front (an event
catalog). **Migration path:** a module "lifts out" by moving its folder into a new
container + subscribing to the broker directly. Business logic unchanged.

## 2. Monorepo layout

```text
EMIVO/
├── apps/
│   ├── web/                      # Next.js storefront (Vercel) — exists
│   │   └── lib/products.ts       # will become fetch() to /api/v1/products
│   ├── api/                      # FastAPI modular monolith
│   │   ├── pyproject.toml
│   │   ├── Dockerfile
│   │   ├── alembic.ini
│   │   └── src/emivo_api/
│   │       ├── main.py           # app factory, router mount, middleware, lifespan
│   │       ├── core/             # THE shared kernel (stable, dependency-light)
│   │       │   ├── config.py     # pydantic-settings, layered env
│   │       │   ├── database.py   # async engine/session (Supabase DSN)
│   │       │   ├── redis.py
│   │       │   ├── security.py   # JWT, refresh rotation, password hashing, RBAC deps
│   │       │   ├── events/       # bus.py, outbox.py, producer.py, consumer.py, catalog.py
│   │       │   ├── observability.py # request-id, structured logging, metrics
│   │       │   ├── errors.py     # error envelope + handlers
│   │       │   ├── rate_limit.py # redis token bucket
│   │       │   ├── storage.py    # ImageStore interface + R2/OCI adapters
│   │       │   └── tenancy.py    # TenantContext dependency + business_id middleware
│   │       ├── common/           # shared helpers (pagination, DTO base, enums)
│   │       ├── modules/
│   │       │   ├── auth/         # authentication
│   │       │   ├── users/        # customers + staff
│   │       │   ├── businesses/   # tenants, roles, permissions
│   │       │   ├── products/     # catalog, categories, variants
│   │       │   ├── inventory/    # stock, reservations
│   │       │   ├── carts/
│   │       │   ├── orders/       # orders, items, status machine
│   │       │   ├── payments/     # Razorpay/Stripe adapter, EMI
│   │       │   ├── coupons/
│   │       │   ├── reviews/
│   │       │   ├── search/       # SearchProvider + VectorStore interfaces
│   │       │   ├── recommendations/
│   │       │   ├── analytics/    # events + queries
│   │       │   ├── notifications/  # email/SMS/push
│   │       │   ├── admin/        # platform admin endpoints
│   │       │   └── chat/         # AI assistant (calls ai-gateway)
│   │       └── ...
│   ├── workers/                  # Arq worker processes
│   │   ├── src/workers/
│   │   │   ├── main.py           # arq:Settings, cron schedules
│   │   │   └── jobs/             # emails, inventory_sync, recommendations, reports
│   ├── ai-gateway/               # VM2
│   │   ├── src/aigw/  (provider routing, cost tracking)
│   ├── voice/                    # VM2
│   │   ├── src/voice/  (call state machine, STT→LLM→TTS)
├── packages/
│   ├── contracts/                # versioned event + DTO schemas (shared, immutable)
│   └── emivo-sdk/                # python client for internal service-to-service calls
├── db/
│   ├── migrations/               # Alembic (api owns this)
│   ├── rls/                      # idempotent RLS policy SQL
│   └── seeds/
├── infra/
│   ├── docker/                   # compose.yaml + overlays + nginx/
│   ├── grafana/                  # dashboards as code
│   └── scripts/                  # backup, restore, deploy, smoke-test
├── .github/workflows/
├── docs/architecture/
└── Makefile / Taskfile.yml       # dev entrypoints
```

**Why a monorepo:** one review/deploy surface, contracts co-versioned with code,
atomic cross-service changes. **Alternatives:** polyrepo per service (coordination
pain at this team size). **Trade-offs:** a monorepo needs a good CI (only changed
apps built — GitHub Actions path filters). **Migration path:** if the team grows,
repos can split; contracts/ stays shared or becomes a published package.

## 3. Per-module clean architecture

Every module follows the same internal shape:

```text
modules/orders/
├── router.py        # FastAPI APIRouter — HTTP only, thin
├── service.py       # use cases: orchestrates repository + emits domain events
├── repository.py    # data access (SQLAlchemy async), always tenant-scoped
├── models.py        # SQLAlchemy ORM models (owned by this module)
├── schemas.py       # pydantic DTOs: request/response, versioned
├── events.py        # domain events this module emits/consumes
├── dependencies.py  # FastAPI DI providers (service, repo, current user)
└── tests/           # unit (fake repo) + integration (real pg/redis)
```

Dependency rule: **router → service → repository → models.** Nothing imports upward.
DTOs (`schemas.py`) are the only objects crossing the boundary.

### 3.1 Router

- Thin: parse/validate → call service → map result to response DTO.
- Versioned mount: `app.include_router(orders.router, prefix="/api/v1/orders")`.
- Dependencies injected: `CurrentUser`, `TenantContext`, `IdempotencyKey`.

### 3.2 Service (use cases)

- One service per aggregate; methods = use cases (`create_order`, `cancel_order`).
- Owns the **unit of work**: one DB transaction per use case, commits once.
- Raises **domain events** on the outbox *inside the same transaction* (atomicity).
- No HTTP awareness, no SQL.

### 3.3 Repository

- `AsyncSession` per request (from `core.database`).
- **Every query is tenant-scoped** — the repository always joins
  `WHERE business_id = :business_id` from `TenantContext`. This is enforced by
  convention + tested (a helper that asserts the clause).
- Returning soft-deleted rows is opt-in via `include_deleted()`.

### 3.4 Dependency injection

- FastAPI's `Depends()` is the DI container — no third-party framework needed.
- A **composition root** in `core/` wires singletons (engine, redis, storage, bus).
- Interfaces are `typing.Protocol`s (ports); adapters implement them; providers are
  selected from config (env), so tests inject fakes.

```python
# core/storage.py
class ImageStore(Protocol):
    def put(self, key: str, data: bytes, content_type: str) -> str: ...
    def get_presigned(self, key: str) -> str: ...

# in a module's dependencies.py
def get_image_store(config: Settings = Depends(get_config)) -> ImageStore:
    if config.image_store == "r2":
        return R2ImageStore(config.r2_bucket, ...)
    if config.image_store == "oci":
        return OCIObjectStore(config.oci_bucket, ...)   # same S3-compatible client
    raise ValueError(config.image_store)
```

**Why `Depends` + protocols:** zero framework lock-in, trivial to fake in tests,
and the interface is the seam for the microservice split. **Alternatives:** `punq`,
`lagom`, manual constructors — all add ceremony without improving the seam.
**Trade-offs:** FastAPI DI is function-argument-based (fine at this scale).
**Migration path:** protocols → gRPC/HTTP service interfaces with the same methods.

## 4. Config management

- **pydantic-settings** in `core/config.py`; strict typing, `frozen`, no silent
  defaults for prod secrets.
- Layered: `Settings` reads `EMIVO_ENV` → `.env` (dev) / env (prod, via docker
  `env_file`), never hard-coded values.
- Secret values come from env only; docker compose `env_file` is gitignored
  (`.env.prod`). Secrets never in code, logs, or images (see `07`).
- Per-environment config objects (`DEV`, `TEST`, `PROD`) with validation.

## 5. Events: the transactional outbox + bus

This is the backbone that makes "microservices later without rewriting" real.

```
service calls repository, raises domain events
        │
        ▼
┌─────────────────────────────┐   same DB transaction
│ business tables + outbox_events│  (Atomicity: if the txn commits, events exist)
└─────────────────────────────┘
        │  poll (every ~1s) / LISTEN-NOTIFY
        ▼
   dispatcher (in api or a tiny consumer)
        │  publish → Redis Stream per topic
        ▼
   ┌─────────┬──────────┬──────────┐
   │ in-proc │ workers  │  future  │
   │handlers │ (arq)    │ services │
   └─────────┴──────────┴──────────┘
```

- **`outbox_events`** table: `id, aggregate_type, aggregate_id, event_type,
  payload(jsonb), status(pending/sent), created_at, sent_at, business_id`.
- Dispatcher uses `LISTEN/NOTIFY` + a fallback poll; marks `sent` after the broker
  ack. No event is ever dropped: Redis Streams are durable, and the outbox row
  remains until acked.
- In-process subscribers run async handlers for **latency-free** internal fan-out;
  heavy work (email, index update, recompute) is delegated to `workers` via the same
  stream (consumers).

**Why outbox, not "publish on commit":** you can't reliably publish after a DB commit
(half-committed state, crashes between commit and publish). The outbox makes event
delivery *atomic with the business change*. **Alternatives:** CDC (Debezium →
later), publish-then-commit (loss on crash — rejected). **Trade-offs:** one extra
table + a dispatcher; a small polling cost. **Migration path:** swap the Redis
producer/consumer for Redpanda/Kafka (same `EventBroker` protocol, same handlers).

### Event catalog (first cut)

| Event | Emitter | Consumer | Why async |
|---|---|---|---|
| `OrderPlaced` | orders | notifications (email), inventory (reserve), analytics, recommendations | slow side effects |
| `ProductUpdated` | products | search (index), recommendations | rebuild indexes |
| `InventoryChanged` | inventory | search (stock filter), admin | |
| `PaymentSucceeded` | payments | orders (mark paid), notifications, analytics | |
| `UserRegistered` | auth | notifications (welcome), analytics | |
| `BusinessProvisioned` | businesses | search (tenant index), admin | |
| `ReviewCreated` | reviews | recommendations, analytics | |

Versioned: `OrderPlaced.v1`, `OrderPlaced.v2` — never mutate a schema in place.

## 6. Cross-cutting concerns

- **Request ID:** middleware assigns `X-Request-ID` (or honors inbound), threads it
  into logs, Redis ops, outbox rows, and outbound AI calls. End-to-end correlation.
- **Error envelope:** every error returns `{error: {code, message, request_id, details?}}`
  with a documented status-code mapping; pydantic validation errors normalized.
- **Pagination:** cursor-based for lists (products, orders), limit caps.
- **Idempotency:** mutating endpoints accept `Idempotency-Key`; replay returns the
  stored response (payments, order creation).
- **Rate limiting:** `core.rate_limit` token bucket per IP/user/business.
- **Tenancy middleware:** resolves `business_id` from JWT + path; injects
  `TenantContext`; repositories consume it (see `04`).

## 7. Module catalog (responsibilities)

| Module | Owns (tables) | Emits | Consumes |
|---|---|---|---|
| `auth` | users, sessions, otp, refresh_tokens | UserRegistered, UserLoggedIn | — |
| `businesses` | businesses, business_members, roles, permissions | BusinessProvisioned | UserRegistered |
| `users` | customers, addresses | UserUpdated | — |
| `products` | products, variants, categories, brands, product_media | ProductUpdated, ProductDeleted | — |
| `inventory` | stock_levels, stock_movements | InventoryChanged | OrderPlaced |
| `carts` | carts, cart_items | — | — |
| `orders` | orders, order_items, order_status_log | OrderPlaced, OrderCancelled, OrderFulfilled | PaymentSucceeded, InventoryChanged |
| `payments` | payments, payment_attempts, refunds | PaymentSucceeded, PaymentFailed | OrderPlaced |
| `coupons` | coupons, coupon_redemptions | CouponApplied | — |
| `reviews` | reviews | ReviewCreated | — |
| `search` | (writes indexes) | — | ProductUpdated, InventoryChanged |
| `recommendations` | rec_candidates (cache) | — | ProductUpdated, OrderPlaced, ReviewCreated |
| `analytics` | analytics_events, product_views | — | all |
| `notifications` | notifications, notification_prefs | — | OrderPlaced, PaymentSucceeded, UserRegistered |
| `admin` | — | — | all (read) |
| `chat` | conversations, messages | — | ProductUpdated (RAG refresh) |

**Why this shape:** every future microservice is already a folder; the event catalog
is the API of the whole system. **Trade-offs:** more files than a flat API — the
price of the split guarantee.

## 8. Testing strategy

| Layer | Test | Runtime |
|---|---|---|
| Service (with fake repo + in-memory bus) | unit | pytest, fast |
| Repository (real Postgres) | integration | compose.test (throwaway pg + redis) |
| API (httpx ASGI client) | contract/integration | same |
| Outbox (crash/replay) | integration | compose.test |
| Module isolation | import-linter in CI | static |
| Schema migrations | `alembic upgrade head` on fresh db | CI |

**Decision — tests against real Postgres, not SQLite.** The DB features you rely on
(RLS, `tsvector`, `pgvector`, partial indexes) don't exist in SQLite. The dev machine
runs `compose.test` Postgres+Redis; CI spins the same images.
**Trade-offs:** heavier CI minute usage (GitHub free = 2k min/mo is plenty).
**Migration path:** unchanged.

## 9. Worker process (summary; full detail in `06`)

- `apps/workers/` — Arq, Redis broker, same `core` package (imports the event catalog).
- Jobs: emails, notifications, inventory sync, search/recommendation indexing,
  scheduled cron (reports, retention), AI batch jobs.
- Scales by adding `--concurrency` or more worker processes; eventually its own VM.

## 10. Decision summary

| Decision | Choice | Why | Migration path |
|---|---|---|---|
| Shape | modular monolith | isolation w/o cost | split folders → services |
| Cross-module | outbox + Redis Streams | atomicity, no-coupling | → Redpanda/Kafka |
| DI | `Depends` + protocols | no lock-in, testable | → service interfaces |
| Config | pydantic-settings, env | strict, swappable | unchanged |
| Isolation | import-linter in CI | enforced, not aspirational | unchanged |
| Tests | real Postgres/Redis | trust the DB features | unchanged |


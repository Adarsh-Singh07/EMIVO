# 10 — Implementation Roadmap

Build order is deliberate: every phase leaves you with something **deployable and
testable**, and nothing later requires rewriting what came before. Each task lists its
own exit criteria.

---

## Phase 0 — Foundations (week 1)

**Goal:** the repo layout + toolchain that every later phase depends on.

- [ ] Create monorepo scaffold: `apps/{api,workers,ai-gateway,voice}`, `packages/contracts`,
      `infra/docker`, `db/`, `.github/workflows/` per `03 §2`.
- [ ] `uv` (or poetry) + `ruff` + `mypy` + `pytest` wired into CI (`ci.yaml`, path-filtered).
- [ ] `packages/contracts`: versioned event + DTO schemas (start with the event catalog in `03 §5`).
- [ ] **import-linter** gate: no module may import another module; only `core/` + `common/` shared.
- [ ] `core/config.py` (pydantic-settings), `core/database.py` (async), `core/redis.py`,
      error envelope, request-ID middleware, `/health/live` + `/health/ready`.
- [ ] Supabase project (prod + staging) — plain Postgres, service-role DSN; no GoTrue/Realtime.

**Exit:** `docker compose -f compose.yaml -f compose.dev.yaml up` boots a healthy API
with health endpoints; CI is green on an empty app.

---

## Phase 1 — Core commerce modules (weeks 2–4)

**Goal:** the platform actually sells things (multi-tenant from day 1).

- [ ] `businesses` (tenant root), `users`, `auth` (JWT + rotating refresh + Redis denylist + OTP).
- [ ] `products` (+ variants, categories, media URLs) with **integer money**, partial-unique SKU indexes.
- [ ] `inventory` (stock + reservations), `carts`, `coupons`, `orders`, `order_items`.
- [ ] `payments` with a **provider adapter** (Razorpay first, EMI support) + webhook + idempotency.
- [ ] Outbox table + dispatcher → Redis Streams; `OrderPlaced`, `ProductUpdated`, etc. wired.
- [ ] `notifications` (email via Resend/SES adapter), `reviews`, `admin`.
- [ ] Tenancy middleware + repository tenant-scoping + RLS policies (idempotent SQL in `db/rls/`).
- [ ] Alembic expand/contract discipline; `db/seeds/` (roles, permissions, sample catalog).
- [ ] `audit_log` app-layer + triggers on critical tables.
- [ ] Integration tests against real Postgres/Redis (compose.test).

**Exit:** create business → add products → checkout → pay (webhook) end-to-end, in
tests and locally. Multi-tenant isolation is verified by the cross-tenant test.

---

## Phase 2 — AI, search, recommendations, workers (weeks 5–8)

**Goal:** the "AI-powered" in EMIVO.

- [ ] `ai-gateway` on VM2: provider adapters (Gemini/Groq/Deepgram/OpenRouter), routing +
      fallback + circuit breakers, `ai_usage` cost tracking, semantic cache.
- [ ] `search` module: `SearchProvider` + `VectorStore` interfaces; **pgvector** Postgres impl.
- [ ] Embeddings on `ProductUpdated` via worker → `product_embeddings` (model-versioned).
- [ ] `chat` module (storefront assistant) using RAG over search + gateway.
- [ ] `recommendations`: offline batch (popular/co-occurrence/similar) → Redis.
- [ ] `workers` service (Arq): email/notification/inventory-sync/search-index/recs/reports
      + cron schedules + DLQ + heartbeat metrics.
- [ ] `analytics` module (product views, order funnels) feeding recs + reports.

**Exit:** semantic search returns relevant products; the assistant answers catalog
questions; recommendations render on home/product; a `ProductUpdated` flows to search
index within seconds.

---

## Phase 3 — Voice (weeks 8–10)

**Goal:** phone agent (VM2).

- [ ] `voice` service: call state machine, Deepgram streaming STT/TTS, Gemini turn with
      **tool-calling** into API read endpoints (order status, FAQ, product lookup).
- [ ] Twilio/Exotel number, WebSocket media streams, barge-in, human handoff.
- [ ] Session summary + transcript → R2; voice event webhooks → API.

**Exit:** an inbound call answers, understands, resolves an order-status query using
live data, and hangs up with a logged summary.

---

## Phase 4 — Productionize (weeks 10–12)

**Goal:** deployable, observable, recoverable.

- [ ] Prod compose overlays on VM1/VM2 (image tags, resource limits, healthchecks,
      2 api replicas, rolling deploy). Nginx + certbot + Cloudflare origin setup.
- [ ] GitHub Actions `deploy.yaml` (merge → tag → GHCR → SSH pull → migrate → smoke).
- [ ] Prometheus + Grafana + exporters (dashboards-as-code), Alertmanager → Discord/Telegram,
      Sentry + Uptime Kuma.
- [ ] Backup scripts: `pg_dump → R2`, Redis RDB → R2, `sops` secrets → R2; monthly restore test.
- [ ] **Quick win:** migrate existing `public/images/*` from GitHub raw → R2 behind
      Cloudflare; keep `<img>` shape (see `00 §5`).

**Exit:** `git tag v1.0.0` → storefront + API + AI live on the free tier; a forced
VM1 reboot recovers the stack automatically.

---

## Phase 5+ — Growth (see `09 §C`)

| Trigger | Move | Where |
|---|---|---|
| sustained CPU > 60% / DB > 400 MB | VM3, split services | `09 §C Phase 2` |
| search relevance hurts | Meilisearch | `06 §1.2` |
| > ~1M vectors | Qdrant | `06 §1.3` |
| DB > 2 GB / needs PITR | Neon or self-host + replica | `04 §10` |
| 20k+ users | K8s + Redpanda + module-lifting | `09 §C Phase 3` |

Each move is listed as **infra/config**, not a rewrite — the boundaries built in
Phases 0–2 make it so.

---

## Ordering rationale (why this sequence)

1. **Phase 0 before product** — the outbox, contracts, and import-linter are the
   "no rewrite" guarantee; retrofitting them later is the expensive part.
2. **Commerce before AI** — AI features consume products/orders/events that don't exist
   until Phase 1; you also learn the real data model before spending AI tokens.
3. **AI before voice** — voice calls the gateway; the gateway must exist first.
4. **Prod at week 10, not week 1** — you ship value (real shopping) before you invest
   in nginx/TLS/backups, but you **design** them from day 1 so nothing gets bolted on.

## Working agreement (guardrails for the whole build)

- Every schema change is **expand/contract** and reviewed like code.
- Every cross-module interaction is an **event**, never an import (import-linter is CI).
- Every provider (AI, storage, search, payments, queue) is a **config-swapped adapter**.
- No secrets in code; no PII in logs; money is **integer minor units**.
- A feature isn't done until it's **tested, healthchecked, metered, and backed up**.


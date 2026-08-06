# 12 — Final Architecture Review & Freeze Decision (ARCHITECTURE v1.0)

| | |
|---|---|
| Status | **APPROVED for production** |
| Date | 2026-08-07 |
| Decision | **ARCHITECTURE v1.0 — frozen** |
| Score | **8.5 / 10** |
| Gate | P0 list (§6) must be closed before first production launch |

---

## 0. Review constraints (self-imposed, per instruction)

Every recommendation below survives a four-way filter. It must **significantly improve
scalability**, **significantly improve maintainability**, **prevent an expensive future
rewrite**, or **prevent a serious production incident**. Anything that merely adds
"enterprise" weight is rejected.

No Kubernetes. No microservices. No brokers. No service mesh. No CQRS. No event sourcing.
No Kafka / RabbitMQ / Temporal. No expensive cloud services. No paid infrastructure —
unless a critical production blocker demands it.

Nothing in this review is a redesign. It is a sign-off with a bounded, costed list of
corrections.

---

## 1. Verdict

> **I would approve this architecture for production.**

**Score: 8.5 / 10.**

Two deductions, both already surfaced and both *fixable in place*:

- **−1.0 — Multi-tenant isolation exists only in SQL.** RLS protects the database;
  nothing yet protects Redis keys, R2 prefixes, AI memory namespaces, search filters, or
  caches from cross-tenant bleed. One bug anywhere is a PII incident for *every* business
  on the platform. This is the single biggest gap. It is a hardening item (P0-1), not a
  design flaw — the tenancy model itself is correct.
- **−0.5 — The ceiling is honest; the marketing isn't.** The realistic ceiling is
  **~1–2k stores** without a migration project, and "always free, forever" contradicts
  "thousands of businesses." The boundaries make the eventual migration *mechanical* —
  not free. The graduation trigger must be scheduled (first paying tenant / ~1k stores),
  so it's a decision, not a discovery.

After the P0 gate is closed this is a **9/10**. Nothing here suggests a different
architecture.

---

## 2. Answers to the 17 questions

| # | Question | Answer |
|---|---|---|
| 1 | Missing abstraction? | **No.** Every seam exists: Storage, Vector, Search, LLM, STT/TTS, Email, Payment, Queue, Cache. One *boundary clarification*, not an addition: **MemoryService owns memory vectors; Search owns product-embedding vectors** (§3.1). |
| 2 | SRP violations? | Two minor, both boundary fixes: **MediaStorage must not own `generateThumbnail`** (that is MediaProcessor's job); **Workers is a transport/process, not a domain module** — keep it infrastructure, never business logic. |
| 3 | Too tightly coupled? | One risk to name: agents must not treat **MemoryService as a data-access layer** (§3.2). And products→search must stay **event-driven**, never direct calls. |
| 4 | Merge anything? | **No.** Do **not** merge AI Gateway and MemoryService (transport vs persistence), and do **not** merge Search and Memory (catalog vs agent state). |
| 5 | Split anything? | **No module needs splitting.** Two ownership clarifications only (§3.1, MediaStorage→MediaProcessor). |
| 6 | Difficult future migrations? | Exactly one genuinely expensive one: **embedding-model changes** (re-embed every vector). Solved by **vector versioning + backfill tooling from day one**. DB, media, and auth migrations are already seams. |
| 7 | Bottleneck? | API→DB→AI. **Cache-first reads** answer the first two (P1-1); **gateway concurrency caps** answer the third (P0-4). |
| 8 | VM allocation reasonable? | **Yes — it is now the corrected allocation.** AI gateway on VM1 (co-located with the API it serves; web assistant is the highest-frequency AI), voice alone on VM2 (streaming-media isolation), VM3 reserved. One note: run a **single Prometheus on VM1** scraping both hosts — don't duplicate the observability stack. |
| 9 | MemoryService covers future AI? | **Yes**, with four notes: memory vectors ≠ product vectors (§3.1); per-tenant namespacing is mandatory; `summarize`/`archive` need an async (worker) path; TTL/retention per memory type. |
| 10 | MediaStorage eliminates lock-in? | **Yes — if and only if you store `media_ref` keys (provider + key), never URLs.** R2 and Oracle Object Storage are both S3-compatible, so the adapter is nearly free and R2 egress is free. |
| 11 | Interfaces to add today? | Three 1-day seams, each preventing an expensive retrofit: **Cache interface** (Redis-backed, swappable to CDN tiers), **AuthProvider seam** (SSO/SAML later), **TenantDomainResolver** (white-label custom domains). |
| 12 | Supports plugins? | Not today — and **do not build a plugin runtime now**. Today you get *integrations* (Partner API + outbound webhooks, P1-6). The module isolation + event bus gives a future plugin system a place to attach. |
| 13 | Supports enterprise? | **Structurally yes:** multi-tenant + RLS + RBAC + audit_log + API versioning. Add SSO seam (P1-8) and data export/deletion (P1-8) for DPA readiness. |
| 14 | Supports white-label? | **Yes** — the tenancy model already supports it. Make tenant→domain→theme resolution a first-class resolver (P2-1). |
| 15 | Multiple AI providers? | **Yes** — capability-aware routing (tool-calling, vision, streaming) inside the gateway. A small router, not a rewrite. |
| 16 | 100 / 500 / 1000 stores? | **100 — trivial. 500 — yes** (VM3, Meilisearch, Neon are config-swap triggers). **1000 — yes**, with cache-first reads + a read replica + discipline. **That is the realistic ceiling.** Beyond → migration project (mechanical, not free). |
| 17 | MUST before launch? | The P0 list in §6. |

---

## 3. The findings that survive the filter

Each maps to at least one of your four conditions (scalability / maintainability /
prevent-rewrite / prevent-incident). Everything else from the earlier 30-item list is
already folded into the module designs or scheduled P1/P2.

### 3.1 MemoryService owns memory; Search owns catalog vectors
Approved as written: agents reach MemoryService **only** for
`save/search/summarize/archive/forget`. But product embeddings are **catalog data, not
memory**. If product search flows through MemoryService, a memory outage breaks the
catalog and the "memory" abstraction gets overloaded. Keep two logical stores — Memory
(agent state) and Search (product vectors) — over one physical pgvector database, behind
the same VectorStore interface.

### 3.2 Agents talk to MemoryService for memory, and to read-endpoints for facts
"All AI agents must communicate ONLY with MemoryService" is correct **for memory
traffic**. It must not mean "all data flows through MemoryService." The Shopping Agent
needs live inventory and order state from the API's read endpoints. Otherwise MemoryService
becomes a god-module and every agent is coupled to memory. Affirm the decision; scope it.

### 3.3 Cross-tenant isolation is a platform invariant, not an RLS column
The single biggest gap. RLS protects SQL; nothing protects:
- Redis keys — `tenant:{id}:cart:*`, session, cache
- R2 prefixes — `{business_id}/...` (uploads, exports, voice transcripts)
- AI memory namespaces — MemoryService keys are per-tenant
- Search filters — every query carries `business_id = $1`
- Recommendation caches — keys are per-tenant

Enforce one namespacing convention everywhere **plus a cross-tenant test suite** that
proves tenant A cannot read or write tenant B in *every* store — Redis, R2, memory,
search, cache, and SQL. This is the invariant the whole platform stands on.

### 3.4 `SET LOCAL`, not `set_config`, under pooled connections
Supavisor reuses connections across requests. Session-scoped `set_config` leaks the
previous request's tenant. Use `SET LOCAL` inside the transaction so the RLS gate resets
automatically. This is a security fix, not a nicety.

### 3.5 Outbox dispatcher lives in workers, not the API
Decouple event delivery from API uptime. The API writes outbox rows in-transaction;
**workers poll and dispatch to Redis Streams**. An API restart must not stall order
emails, search-index updates, or payment side-effects.

### 3.6 Analytics is a separate pipeline from day one
Analytics writes (events, product views, funnels) never touch OLTP Postgres on the hot
path. Events → Redis Streams → workers → aggregates in PG (dashboards) + raw to R2
(parquet). Protects the 500 MB free tier *and* the checkout connection pool.

### 3.7 AI cost-abuse gate is P0; the meter is the seed of billing
Per-tenant token/request caps **enforced at gateway request time**, plus upload quotas and
an anomaly alert. The same `ai_usage` rows become the billing meter later. Without the
caps, one runaway tenant agent is your largest variable cost and a DoS on every other
tenant.

### 3.8 Payment hardening
Webhook **HMAC verification + replay protection**, idempotency on payment events, and
**tokenization** (never touch a PAN; the provider stores the card). Razorpay adapter
first; the adapter seam is what allows more providers.

### 3.9 Cache-first reads are the scaling strategy
E-commerce is ~95% reads. Cloudflare CDN + Redis catalog cache + storefront ISR,
revalidated by `ProductUpdated`. This is the difference between "1000 stores fine" and
"DB melts at 300." Build it before scaling, not after.

### 3.10 Embedding-model versioning + backfill from day one
When you change embedding models — and you will — every stored vector must be re-embedded
with the model that produced the query vector. Version the vectors and keep the backfill
job in the worker catalog. This is the sneakiest expensive migration in the AI stack.

---

## 4. Module-by-module review

| Module | Verdict | Note |
|---|---|---|
| Backend (FastAPI) | **OK** | Modular monolith; outbox dispatcher moves to workers (§3.5). |
| Database | **OK** | With §3.4 (`SET LOCAL`) + `media_ref` keys + integer minor-unit money. RLS + tenant ctx chain already in place. |
| Redis | **OK** | Namespace every key `tenant:{id}:*`. 512 MB cap is fine to ~1k stores. |
| Workers | **OK** | Hosts: outbox dispatcher, email, search indexer, recs, reports, analytics rollup, retention. Transport only — no business logic. |
| AI Gateway | **OK** | Capability-aware routing; concurrency limits + queueing (P0-4); `ai_usage` metering feeds billing. |
| MemoryService | **OK** | With §3.1 + §3.2. Typed memory, tenant-namespaced, async summarize/archive via workers. Owns memory vectors only. |
| MediaStorage | **OK** | Boundary fix: `generateThumbnail` → MediaProcessor. `media_ref` keys, presigned direct-to-R2 uploads bypass the origin. |
| Notifications | **OK** | Email adapter (Resend/SES); event-driven consumers. |
| Authentication | **OK** | JWT 15m + rotating refresh + OTP. Add MFA (P0-6) + AuthProvider seam (P1-8). |
| Authorization | **OK** | RBAC + tenant ctx + RLS chain; permission-matrix test in CI. |
| Billing | **→ Entitlements** | Plans, limits, metering (P1-2). Full payment collection rides on the same `ai_usage`/usage counters. Not needed pre-launch. |
| Tenants | **OK** | `business_id` root; RLS; audit on critical tables. Cross-tenant invariant (§3.3) is the gate. |
| Products | **OK** | Emits `ProductUpdated`; `media_ref`; variants; partial-unique SKU. |
| Orders | **OK** | Outbox events; idempotency keys; integer money. |
| Analytics | **→ Separate pipeline** | §3.6. Never OLTP Postgres on the hot path. |
| Recommendations | **OK** | Offline batch → Redis; consumes analytics aggregates; per-tenant keys. |
| Voice | **OK** | Stateless; streaming media on VM2; tool-calling into read endpoints; transcript → R2 (tenant-prefixed). |
| Search | **OK** | Postgres → Meilisearch config swap; VectorStore interface for embeddings; model-versioned vectors. |
| Caching | **OK** | Add thin Cache interface (§2 Q11); catalog cache + ISR (P1-1). |
| Docker | **OK** | Compose + overlays; `{sha}`+`{semver}` tags; cgroup limits; 2 api replicas behind nginx. |
| CI/CD | **OK** | `ci.yaml` + `deploy.yaml`; expand/contract migrations gated; path-filtered. |
| Observability | **OK** | Single Prometheus on VM1 (scrapes both hosts) + Grafana + Sentry + Uptime Kuma. Request IDs end-to-end. |
| Security | **P0** | §6 items 1–8. Defense-in-depth chain is sound; the P0s close the known holes. |
| DR / Backups | **OK** | With encrypted backups + monthly restore test (P0-7). Stateless VMs + managed data = re-provision from tags. |
| Scaling | **OK** | §2 Q16. Phase-2 levers are config swaps, each gated by a metric. |

No module fails review. Five carry a bounded correction; all are in the P0/P1 lists below.

---

## 5. P0 — must fix before first production launch

1. **Cross-tenant invariant + test suite** — every store (Redis, R2, memory, search,
   cache, SQL) namespaced by `business_id`; a cross-tenant test proves isolation in each.
2. **RLS under pooling** — `SET LOCAL` in-transaction, never session-scoped `set_config`.
3. **Payment security** — webhook HMAC + replay protection, idempotency on payment events,
   tokenization (no PAN).
4. **AI cost-abuse gate** — per-tenant token/request caps at gateway request time, upload
   quotas, anomaly alert.
5. **Prompt injection controls** — tool-arg allow-listing/parameterization; LLM output
   treated as untrusted; no PII in RAG context.
6. **Auth hardening** — MFA (TOTP) for admin/owner, email-enumeration prevention, OTP
   throttle/backoff, JWT key rotation.
7. **Secrets & backups hygiene** — boot-time secret validation, `sops`, encrypted backups
   (R2 SSE), monthly restore test.
8. **SSRF guard** — in the single `fetch_url` helper (block private/link-local/metadata
   ranges at DNS-resolve and connect).
9. **Reliability** — outbox dispatcher in workers, idempotency keys on all mutations,
   request IDs end-to-end, no PII in logs.

## 6. P1 — implement before scaling (~500 stores)

1. **Cache-first read path** — CDN + Redis catalog cache + storefront ISR, revalidated by
   `ProductUpdated`.
2. **Entitlements + metering → billing** — plans, limits, usage counters; the meter behind
   future invoices.
3. **MediaProcessor + presigned uploads** — thumbnails/compression/optimization; direct
   client→R2 uploads bypass the origin.
4. **MemoryService implementation** — typed memory + pgvector + per-tenant namespacing +
   async summarize/archive.
5. **Analytics pipeline** — events → workers → PG aggregates + R2 raw/parquet.
6. **Partner API + outbound webhook dispatcher** — home for ERP/CRM/WhatsApp integrations.
7. **Semantic search indexer** — model-versioned vectors + backfill tooling.
8. **AuthProvider + TenantDomainResolver seams** — SSO and custom domains become
   adapters, not rewrites.
9. **Trigger-based config swaps** — VM3, Meilisearch, Neon — each fired by a named metric.

## 7. P2 — can wait (post ~1k stores / evidence-driven)

1. White-label theming + custom domains end-to-end.
2. Knowledge graph (a MemoryService extension, not a new service).
3. Marketplace / plugin runtime (only after the Partner API is live).
4. Read replica for catalog/analytics reads.
5. Voice worker scaling, call analytics, richer human-handoff routing.
6. Vault / OPA / log aggregation — only when operational pain justifies them.
7. Paid-tier upgrades (domain → AI usage → DB → Cloudflare Pro → Vercel Pro), each
   justified by a metric.

## 8. Explicitly rejected — over-engineering, do not build

| Idea | Why rejected |
|---|---|
| Kubernetes / service mesh | 3 VMs; compose + overlays covers it; K8s adds ops, not capability, at this scale. |
| Microservices split | Modular monolith gives the boundary without the runtime cost; lift modules later if evidence demands. |
| Event sourcing / CQRS | Outbox + Redis Streams covers every current need; ES would rewrite the data model for no present gain. |
| Kafka / Redpanda / Temporal / RabbitMQ now | Outbox + Redis Streams holds to ~1k stores; transport is already a config-swapped seam. |
| GraphQL gateway | REST + versioned contracts covers the API surface; GraphQL is a bolt-on. |
| Plugin sandbox runtime | No plugin surface exists yet; build integrations first (P1-6). |
| Vault now | env + `sops` + boot-time validation is correct at this scale; Vault slots in behind `get_secret()`. |
| Distributed tracing (Jaeger/OTel) | Request IDs give the correlation; tracing earns its cost only past ~10 services. |
| OPA / policy-as-code | RBAC + RLS + permission-matrix tests are the policy layer today. |
| Multi-region / auto-scaling / spot infra | Zero present demand; each is a Phase-3 decision with a trigger. |
| Feature-flag SaaS / extra APM agents | Sentry + Prometheus is the complete MVP observability set. |
| Dedicated log aggregator (Loki/Cloud) | Docker logs + grep + Sentry is enough on 2 VMs; revisit at multi-VM. |

---

## 9. Freeze declaration

**Effective 2026-08-07, this architecture is declared ARCHITECTURE v1.0 and is frozen.**

- No architectural redesign will happen unless **production evidence** proves it
  necessary: an incident, a sustained metric regression, or a tenant milestone crossing
  the scaling triggers in `09 §C`.
- Changes beyond this freeze require a **documented architectural change request** that
  must satisfy at least one of the four conditions (§0) and be reviewed against this
  document.
- Implementation begins with **Phase 0** (`10-roadmap.md`), with the P0 list (§5) folded
  into Phase 0/1 work and the corrections from `11-adversarial-review.md §4` applied to
  the prior docs first.

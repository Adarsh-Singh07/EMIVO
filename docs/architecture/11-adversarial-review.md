# 11 — Adversarial Review (FAANG-grade)

*Purpose: assume nothing from the prior design is correct. Find the weaknesses, name
the dishonest promises, and re-design what's broken. Verdict is conditional, not
rubber-stamped.*

---

## TL;DR — the verdict up front

**I would approve this architecture for the MVP — with six P0 blockers fixed first —
and I would be explicit that it is a 1,000–2,000-store architecture, not a 10,000-store
architecture.** The shape (modular monolith, outbox, adapters, pgvector-first,
2-VM split) is correct for your cost and team. But three of your goals are in direct
conflict with reality, and if we don't name them now they will be discovered as
crises later:

1. **"No rewrite at 10,000 stores" is not achievable as stated.** The boundaries make
   migration *mechanical*, not *free*. The Python/FastAPI hot path and the
   Supabase→Citus jump are genuine re-platforms, not config changes.
2. **"Stay on Oracle Always Free forever" contradicts "support thousands of
   businesses."** You have exactly **one free VM3 of headroom** (3 OCPU/18 GB used,
   1 OCPU/6 GB free of the 4/24 cap). After that, you pay. That's a budget
   expectation, not an engineering problem — but it must be set now.
3. **"Multi-tenant" is currently true at the database and nowhere else.** Redis keys,
   R2 prefixes, AI memory, search filters, recommendation caches, and RLS under
   connection pooling all need tenant discipline. One leak in any layer is a PII
   incident for *every* business on the platform. This is the single biggest gap.

Everything else is refinements. Details below.

---

## Part 1 — Reality check: requirements vs. reality

| Requirement | Reality | Consequence |
|---|---|---|
| "No rewrite when scaling to millions of products / 10k stores" | Python/FastAPI is a ~1–2k-store ceiling for the transactional hot path; "plain Postgres exit" holds only to single-node scale | Boundaries make migration mechanical, not free; budget a future hot-path rewrite, not zero work |
| "Stay on Always Free as long as possible" | 4 OCPU/24 GB account cap; you use 3/18 → **exactly one VM3** free | Plan the "graduate to paid" trigger (~1–2k stores / ~20–50k users) as a scheduled decision, not a crisis |
| "Multi-tenant SaaS" | Isolation enforced in SQL only | Must become a cross-cutting invariant: DB, Redis, R2, search, AI memory, caches |
| "AI is config-only" | Model *capabilities* (tool-calling, JSON mode, vision, streaming) differ per provider | Routing must be capability-aware, not just name-aware |
| "Voice on its own VM" (good) | 1 OCPU for streaming STT/TTS + LLM + ai-gateway is tight | Voice will want VM3 sooner than the "growth" phase |
| "Database stores only URLs" | URL-only refs make a future R2→OCI migration a **data rewrite** | Store `media_ref` (provider+key), resolve to URLs at the edge |

---

## Part 2 — Answers to your 10 review questions

### 1. Should there be a dedicated Memory Service? **Yes — as a module now, a service later. Your instinct is correct; the packaging is the nuance.**

- **Agents should only talk to MemoryService — yes.** Every agent hand-rolling
  pgvector calls is how you get four different, subtly-broken memory implementations.
  A single memory surface (`save/search/summarize/forget/archive`) centralizes
  vectorization, retrieval, retention, and compliance.
- **It simplifies pgvector→Qdrant — yes, but only if MemoryService *owns* vector
  persistence.** Right now vector access is split (search module + ad-hoc AI).
  Collapse it: **one `MemoryService` module owns all vectors** — product embeddings
  *and* agent memories. Then the Qdrant migration is a change in one adapter, not a
  sweep across modules.
- **Knowledge Graph — this is exactly the seam.** Entities/relationships
  ("customer X bought product Y, returned brand Z") live behind the same interface.
  A future graph store is an implementation detail of MemoryService, not a new system.
- **Design it typed, not as one bucket:** *episodic* (conversations/events),
  *semantic* (facts + embeddings), *working* (short-term session state), each
  **namespaced by tenant and by agent** (`{tenant}/shared`, `{tenant}/{agent}`).
  Shared core memory (customer, product, order — structured) + per-agent episodic
  memory. That answers Q10 too: **not fully independent, not fully shared.**
- **It is a PII store.** Conversations about customers = PII. It needs retention
  policies, encryption, tenant-scoped access, and `forget` as a compliance feature
  (right-to-be-forgotten), not a nice-to-have.
- **Don't make it an HTTP microservice at MVP.** A module with a stable interface;
  lift it when agent count or memory volume demands it.

### 2. Should there be a Media Storage abstraction? **Yes — but split storage from processing, and stop storing raw URLs.**

- `MediaStorage` (upload/delete/copy/signedURL) is right and **R2/OCI/MinIO are all
  S3-compatible**, so one S3-compatible client covers them — the abstraction is thin
  and real.
- **`generateThumbnail()` does not belong in the storage interface.** Image processing
  (resize, WebP/AVIF, EXIF strip) is CPU work; storage is bytes. Separate
  `MediaProcessor` from `MediaStorage`: upload pipeline = processor → storage → DB ref.
- **Stop storing URLs; store `media_ref` = `{provider, key}`** (or `{external_url}`).
  A URL bakes the vendor into your data. With keys, R2→OCI is config + a copy job,
  not a table-wide URL rewrite. This directly answers your vendor-lock-in concern.
- **Default catalog media to public + CDN-cached** (signed URLs only for private
  media like invoices). Public-by-default is dramatically cheaper and lets
  Cloudflare edge serve images without origin round-trips.
- **Don't push uploads through the origin.** Presigned direct-to-R2 PUTs (client →
  R2) keep multi-MB images off nginx and the API. This is also a quota/rate-limit
  surface per tenant (an upload flood is a **cost-abuse vector** — R2 Class-A ops).

### 3. Review the AI Gateway.

- **One gateway: keep.** But run **separate pools for "text" (chat/embeddings) and
  "media" (STT/TTS)** — a burst of chat embeddings shouldn't delay a voice TTS chunk.
  Same codebase, two deployment units / concurrency domains.
- **Provider adapters: keep, but make them capability-aware.** Config alone can't
  route to a provider that lacks tool-calling or JSON mode. Add a `Capabilities`
  set per adapter and route on `required_capabilities`, failing fast otherwise.
- **Model routing configurable: yes.** Add per-feature model tiers (already designed)
  + **per-tenant override** (a big tenant wants a better model — that's billable).
- **Semantic cache inside the gateway: with a strict caveat.** Cache **embeddings**
  aggressively (deterministic, safe). Cache **LLM responses only with short TTLs and
  never for stateful content** (prices, stock, orders) — a cached reply can serve
  wrong commerce data. And key the cache by **tenant**, never cross-tenant.
- **AI billing here: yes, but as *events*, not just logs.** Emit `AICostIncurred`
  (tenant, feature, model, tokens, cost) onto the event bus → metering → billing.
  `GET /v1/usage` is a debugging endpoint, not a billing system.
- **Missing: gateway-level concurrency limits + queueing** so a burst of requests
  backpressures instead of hammering providers into 429s.

### 4. Vector search: pgvector first — still right. Qdrant at 1–10M vectors.

- **For 500 products, don't even build an index.** A table scan over <10k rows with
  cosine is single-digit ms. Create the HNSW index around **~10k–100k vectors**, not
  day 1.
- **Qdrant becomes worth it at ~1–10M vectors** *or* when you need (a) filtered
  vector search at high QPS, (b) native hybrid BM25+vector fusion, (c) sharding/HA.
  1,000 stores × 10k products ≈ 10M vectors — that's the trigger. Until then,
  pgvector is objectively cheaper and simpler.
- **The engine swap is the easy half.** Dual-write to both, verify counts + spot-check
  similarity results, cut over, keep a rollback toggle. The **expensive half is the
  embedding-model migration**: changing from `text-embedding-004` to any other model
  forces re-embedding the entire corpus. Model-version the vectors and build the
  backfill tool *now* — that's the migration that actually hurts.
- **Accept the ceiling now:** at scale, keyword-only or vector-only both underperform
  on e-commerce relevance; you'll want normalized score fusion and eventually a
  cross-encoder re-ranker. That's a Phase-3 feature, not a bug — just don't be
  surprised by it.

### 5. VM allocation — I would change it.

| Current (prior design) | Recommended |
|---|---|
| VM1: api · workers · redis · nginx · obs | **VM1: api · workers · redis · nginx · ai-gateway** |
| VM2: ai-gateway · voice | **VM2: voice (dedicated)** |

- The **storefront assistant + search embeddings are the highest-frequency AI calls**
  and originate from the API. Running the gateway on VM1 makes that a localhost call
  (lower latency, shares idle headroom). The gateway is thin (no models in memory).
- **Voice is the one workload that must not contend with anyone**: real-time streaming
  STT/TTS + LLM turns on 1 OCPU. Give it VM2 alone. Voice calls the gateway only for
  the LLM turn (STT/TTS can go straight to Deepgram).
- **The honest caveat:** 1 OCPU is small for streaming media. If voice grows, **VM3
  becomes voice-dedicated and the gateway moves back to VM2** — and that is your only
  free VM3. Plan accordingly.
- Alternative (defensible): keep gateway on VM2 with voice if voice volume is proven
  near-zero. Decide on measured traffic, not preference.

### 6. Storage responsibilities — the split is right, with one real gap.

- **R2** = immutable media + documents (invoices, exports) + backups. **Supabase** =
  relational + vectors. **Redis** = ephemeral state. **Oracle disks** = boot + docker
  volumes + redis snapshots. Correct division of labor. **Do not move the DB onto the
  VMs — ever.** Agreed.
- **Gap: analytics has no home.** You currently accumulate `analytics_events` in
  Postgres. That's the wrong store for write-heavy, low-structure, high-volume events —
  and they'll crowd Supabase's 500 MB *and* share a pool with checkout. From day one:
  **events → Redis Streams → workers → (a) aggregates to Postgres for dashboards,
  (b) raw to R2 (parquet-ready) for warehouse-grade analytics.** Separate the *event
  stream* from the *serving aggregates*.
- **Gap: Redis is one bucket for four workloads** (sessions/OTP, cache, streams,
  rate-limit) with conflicting eviction needs. Use **logical DBs with per-DB
  `maxmemory-policy`** (cache=allkeys-lru, OTP/sessions=noeviction, streams=noeviction).
- **Gap: no documents store** beyond images (invoices, ERP files). Fold into the
  media abstraction; key by tenant.

### 7. Security — the missing pieces.

Beyond what's designed (JWT+rotation, RBAC, RLS, SSRF guard, rate limits, request IDs,
audit, env secrets):

1. **RLS under connection pooling is a latent cross-tenant bug.** Supavisor/pooled
   sessions reuse connections; a `set_config('app.business_id', …, false)` (session-
   scoped) leaks the previous request's tenant to the next. **Must use
   `SET LOCAL` inside the transaction** (auto-reset) — or accept a cross-tenant read.
   This is the single most dangerous detail in the whole design.
2. **Multi-tenant isolation is only at the DB.** Tenant-key Redis/R2/search/AI-memory
   keys, and add a **cross-tenant test suite** (read/write as tenant B against tenant
   A data, per module) as a CI gate.
3. **Prompt injection + LLM tool abuse.** The assistant RAGs product data — a
   malicious product description can steer the model into triggering tools or leaking
   order data. Mitigations: **treat LLM output as untrusted input to tools**,
   tool-arguments allow-listed and parameterized, no PII in RAG context, sanitize
   external content before it enters context, per-tenant tool permissions.
4. **Payment webhooks must be signature-verified** (Razorpay/Stripe HMAC), replay-
   protected, and **no card data ever stored** — use provider tokenization (PCI-DSS
   scope). EMI plans don't change this.
5. **Cost-abuse vectors:** an upload flood (R2 Class-A ops), an AI token flood
   (per-tenant budgets enforced *at the gateway*, not just logged), an OTP flood.
   Quotas + budgets + anomaly alerts are security controls, not billing features.
6. **No MFA** for platform admins / business owners. Add it (TOTP), plus an
   IP-allow-listed, audit-logged admin path.
7. **Backups contain PII** — encrypt at rest (R2 SSE) and rotate keys.
8. **Auth hygiene:** uniform login/registration messages (prevent email enumeration),
   OTP throttling, refresh-token device binding, and **signing-key rotation** for JWT.
9. **CI gates missing:** dependency/CVE scanning (trivy/grype), and **release gates**
   that block a deploy on a 5xx spike.

### 8. Scalability: what's real at each store count.

| Stores | Verdict | What it takes |
|---|---|---|
| 100 | **Yes, today.** | nothing |
| 500 | **Yes, Phase 2.** | VM3, Meilisearch, maybe Neon, catalog cache-first |
| 1,000 | **Yes, with discipline.** | read replica, Redis/CDN catalog cache, per-tenant domain resolution, analytics off the hot path |
| 2,000–10,000 | **No — migration project.** | sharding (Citus), broker (Redpanda), module-lifting, possibly reimplementing orders/payments hot path in a systems language, multi-region, partner API platform |

The **single biggest scalability lever is cache-first reads.** E-commerce is ~95% reads
(product pages, search). If the catalog is CDN-cached + Redis-cached and revalidated
via `ProductUpdated`, the DB and the Python API only serve the hot 5% (checkout,
account, writes). Design that now — it's what makes 1,000+ stores plausible at all.

The honest ceiling: **~1,000–2,000 stores / ~20–50k users** before you're doing a
planned re-platform. The boundaries make that re-platform *mechanical*; they do not
make it *zero-work*.

### 9. Observability — what's genuinely missing.

- **Distributed tracing.** `X-Request-ID` stops being enough the day an order flows
  api → outbox → worker → ai-gateway → provider across processes. Add **OpenTelemetry**,
  and instrument the *event flow* (outbox → stream → consumer) as a span — not just HTTP.
  Trace UI: Grafana Tempo (pairs with your stack) later.
- **Log aggregation across VMs.** Docker logs on 2 VMs don't correlate. Add **Loki**
  at Phase 2 (same Prometheus/Grafana ecosystem, cheap).
- **AI cost & latency dashboards** per feature/tenant, with **cost-anomaly alerts**
  (>₹X/day is the canary for both bugs and abuse).
- **Business KPIs**, not just SRE metrics: orders/hour, conversion, checkout
  abandonment, per-store. Feed from the analytics module.
- **SLOs + error budgets** defined for the two customer-facing paths (browse/search,
  checkout) and **synthetic monitoring** of a scripted checkout journey.
- **Release observability:** canary/rollback gates comparing error rates before/after.
- **Self-monitoring smell:** Grafana+Prometheus live on the same prod VM as the app —
  acceptable at MVP; note that a monitoring outage monitors itself.

### 10. Future AI agents — one gateway, shared core memory, namespaced episodic memory.

- **All agents use the same AI Gateway** — it's the only way to manage token spend,
  keys, and rate limits centrally. Agents differ by *feature key* (prompt bundle,
  model tier, budget cap), not infrastructure.
- **Memory is shared at the core, isolated at the edges.** Shared structured memory
  (customer, product, order), shared semantic store (embeddings), but **per-agent
  episodic memory** (`{tenant}/{agent}/…`). Shopping and support agents both know the
  order history; a support agent's conversation thread doesn't pollute a shopping
  agent's context.
- **Build the seams, not the framework.** Resist LangChain/CrewAI today — they churn
  violently. Build: **ToolRegistry** (functions with schemas + permission checks the
  gateway/voice/agents all use), **MemoryService**, and the gateway. Keep agent
  orchestration as thin plain code. Choose an agent framework only when you have 3+
  agents and a demonstrated need.

---

## Part 3 — Final task: weaknesses, improvements, ranking, effort, verdict

### 3.1 Every weakness

**A. Correctness / security (launch-blocking)**
1. RLS uses session-scoped `set_config` — cross-tenant leak risk under connection pooling (must be `SET LOCAL` in-transaction).
2. Multi-tenant isolation exists only in SQL, not in Redis/R2/search/AI-memory/cache.
3. Outbox dispatcher is coupled to the API process — events stall if the API is down.
4. Payment webhook signature verification + replay protection not explicit; card-data storage risk (must tokenize).
5. Prompt injection / LLM tool abuse via RAG content — LLM output treated as trusted input to tools.
6. AI usage & uploads are unbounded cost-abuse surfaces (no enforced per-tenant budgets/quotas at request time).
7. No MFA for admin/owner roles; admin security posture undefined.
8. Backups hold PII unencrypted.
9. Semantic cache can serve stale/wrong commerce data (prices/stock) if it caches LLM replies carelessly.
10. Auth hygiene gaps: email enumeration, OTP brute-force, no JWT key rotation, no device binding on refresh.
11. No dependency/CVE scanning or release-gate in CI.

**B. Scalability / performance**
12. Python/FastAPI hot path is the real ceiling; "no rewrite" promise is overstated.
13. Catalog read path is not cache-first — every page hits API→Supabase.
14. Analytics in OLTP Postgres — wrong store, crowds free-tier DB, shares pool with checkout.
15. Single Redis, one eviction policy for conflicting workloads.
16. No noisy-neighbor protection on the shared schema/pool (statement timeouts, pool isolation, read replicas).
17. Embedding-model migration (re-embed everything) is the real vector cost — no versioning/backfill tooling yet.
18. No per-tenant domain resolution in the storefront (white-label / marketplace impossible).
19. Supabase→Citus is a re-platform, not a DSN swap — "plain Postgres exit" only holds to single-node scale.
20. Single VM1 = no HA; availability is "recovery," not "high availability." One free VM3 of headroom; then you pay.

**C. Missing abstractions / product architecture**
21. No entitlements / plans / feature-flags / metering → cannot run thousands of businesses on tiers or bill AI usage.
22. No partner API / API-key/OAuth surface or outbound Webhook Dispatcher → ERP/CRM/WhatsApp have no home.
23. No MemoryService — agents will each hand-roll memory; vector access split across modules.
24. URL-only media refs bake vendor into data; thumbnail generation inside the storage abstraction.
25. Uploads relayed through origin (nginx 5 MB cap, API) instead of presigned direct-to-R2; uploads are an unrate-limited surface.
26. No OTel tracing for the event flow; no cross-VM log aggregation.
27. No ToolRegistry for agents (voice/chat/future agents reinvent tools).
28. Domain seams missing for commerce scale: tax (GST), shipping, returns/refunds, invoices.
29. No event schema registry / compatibility enforcement / replay UI / DLQ admin.
30. No per-tenant backup/export (data portability / DPA) — `pg_dump` is all-or-nothing.
31. No synthetic monitoring / SLOs / canary release gates.

**D. Ops / process**
32. Compose→K8s is more work than "just manifests" (healthchecks, secrets, ingress, PVCs).
33. SSH+docker-compose deploys are not auditable like GitOps (ArgoCD/Flux) — acceptable now, note it.
34. Observability stack runs on the same prod VM it monitors.

### 3.2 Improvements, ranked with effort

*Effort = engineering-weeks for a 1–2 person team. **P0 = cannot ship a multi-tenant SaaS without these.***

| # | Priority | Improvement | Effort | Addresses |
|---|---|---|---|---|
| 1 | **P0** | Tenant-isolation invariant: `SET LOCAL` RLS, tenant-keyed Redis/R2/search/AI-memory, cross-tenant CI test suite per module | 1–2 wk | A1, A2 |
| 2 | **P0** | Payment security: webhook HMAC verification, replay protection, provider tokenization (no PAN) | 1 wk | A4 |
| 3 | **P0** | Secrets hygiene + backup encryption (R2 SSE) + boot-time secret validation | 1 wk | A8 |
| 4 | **P0** | AI/upload cost-abuse controls: per-tenant token budgets enforced at gateway, upload quotas, cost-anomaly alerts | 1–2 wk | A6 |
| 5 | **P0** | Prompt-injection & tool-safety: LLM output untrusted for tools, allow-listed/parameterized args, PII out of RAG context | 1 wk | A5 |
| 6 | **P0** | Auth hardening: MFA for admin/owner, uniform login messages, OTP throttle, refresh device-binding, JWT key rotation | 1–2 wk | A7, A10 |
| 7 | **P0** | SSRF-guarded fetcher mandatory + tested (image proxy/import path) | 0.5 wk | (prior) |
| 8 | **P1** | **MemoryService module** (typed memory: shared + per-agent namespaced; owns all vectors; PII posture) | 1–2 wk | C23, Q1 |
| 9 | **P1** | **MediaStorage refactor**: `media_ref` keys (not URLs), separate `MediaProcessor`, presigned direct upload, public-by-default catalog | 1–2 wk | C24, C25 |
| 10 | **P1** | **Analytics as separate service**: events → Streams → workers → aggregates (PG) + raw (R2/parquet); own process/pool | 2–3 wk | B14 |
| 11 | **P1** | **Catalog cache-first read path**: Redis catalog cache + storefront ISR + per-tenant host resolution; revalidate via `ProductUpdated` | 1–2 wk | B13, B18 |
| 12 | **P1** | **Entitlements / feature-flags / metering module** (plans, limits, AI usage → billing) | 2–3 wk | C21 |
| 13 | **P1** | **Partner API + API keys + outbound Webhook Dispatcher** (signatures, retries) | 1–2 wk | C22 |
| 14 | **P1** | Move outbox dispatcher into workers; add event replay + DLQ admin | 1 wk | A3, C29 |
| 15 | **P1** | AI Gateway: capability model, text/media pools, concurrency limits, emit `AICostIncurred` events | 1–2 wk | Q3 |
| 16 | **P1** | VM re-allocation: ai-gateway → VM1, voice alone on VM2; VM3 plan | 0.5 wk | Q5 |
| 17 | **P1** | Redis: logical DBs with per-DB eviction + memory budgets | 0.5–1 wk | B15 |
| 18 | **P1** | OTel tracing for the event flow + `trace_id` in logs | 1–2 wk | B26 |
| 19 | **P2** | Qdrant migration tooling (dual-write, verify, cutover) + embedding-model versioning/backfill | 1–2 wk | Q4 |
| 20 | **P2** | Neon/self-host + read replica + statement-timeout/pool isolation for noisy tenants | 1–2 wk | B16, B19 |
| 21 | **P2** | Log aggregation (Loki) across VMs + business-KPI dashboards | 1 wk | B26, Q9 |
| 22 | **P2** | Per-tenant backup/export (logical `business_id`) for DPA/portability | 1–2 wk | C30 |
| 23 | **P2** | ToolRegistry for agents + thin orchestration (no agent framework yet) | 1–2 wk | C27, Q10 |
| 24 | **P2** | Domain seams: tax (GST), shipping, returns/refunds, invoice adapters | 2–3 wk (when needed) | C28 |
| 25 | **P2** | Synthetic monitoring + SLOs + release gates in CI | 1 wk | A11, C31 |
| 26 | **P2** | Warehouse analytics (ClickHouse/BigQuery) when events outgrow PG | 2–4 wk (later) | B14 |
| 27 | **P3** | Knowledge graph behind MemoryService | later | Q1 |
| 28 | **P3** | Marketplace / white-label storefront themes + per-tenant DNS | later | B18 |
| 29 | **P3** | Multi-region + data residency (India DPDP) | later | B20 |
| 30 | **P3** | Hot-path rewrite (orders/payments) in a systems language *only if metrics demand* | large, later | B12 |

### 3.3 Verdict

**Conditional approval.**

- **Approved for:** building the MVP on the free tier with the modular-monolith +
  outbox + adapters + pgvector-first shape. The core decisions survive this review —
  that's the test, and they mostly pass.
- **Not approved to call "production multi-tenant SaaS" until P0 (items 1–7) is done.** Four
  of those are security-isolation issues that a first paying tenant would eventually
  trigger.
- **Must set expectations now:** this is a **1,000–2,000-store architecture** on the
  designed migration path. Scaling to 10,000 stores is a planned re-platform — the
  boundaries make it mechanical, not free. "Stay on Always Free" and "thousands of
  businesses" are incompatible past that point; schedule the paid-graduation decision
  (trigger: first paying tenant, or ~1k stores) rather than discovering it in an outage.
- **The two "new idea" suggestions from you — MemoryService and MediaStorage — are
  correct and should be adopted.** They are not gold-plating; they are the missing
  seams that make the vendor-lock-in and multi-agent futures tractable.

---

## Part 4 — Corrections that supersede prior docs

| Prior doc | Superseded by |
|---|---|
| `01` (VM allocation) | ai-gateway → VM1, voice alone on VM2; VM3 = voice or next split |
| `03` (outbox dispatcher in api) | dispatcher lives in **workers**; event replay + DLQ admin |
| `03` (module catalog) | add **MemoryService**, **entitlements/metering**, **partner API/webhooks**; refine `core/storage.py` → `MediaStorage` + `MediaProcessor` + `media_ref` |
| `04` (RLS, media refs, Supabase exit) | `SET LOCAL` in-transaction; store `media_ref` keys not URLs; Supabase→Citus is a re-platform (honest scope) |
| `05` (gateway, semantic cache) | capability-aware routing; text/media pools; cache embeddings only by default; emit `AICostIncurred` |
| `06` (analytics home, embeddings) | analytics = separate event-stream service; model-versioned embeddings + backfill tooling |
| `07` (security) | P0 items: RLS-under-pooling, webhook HMAC, MFA, prompt-injection, cost-abuse quotas, backup encryption, CVE scan |
| `09` (resources, ceiling) | 3 OCPU/18 GB → exactly one free VM3; honest 1–2k-store ceiling; paid-graduation trigger |
| `10` (roadmap) | insert a **P0 hardening phase** before launch; fold P1 improvements into Phases 1–2 |

*This document is the review, not the rewrite. Apply the deltas to the docs above
after you've accepted the changes.*

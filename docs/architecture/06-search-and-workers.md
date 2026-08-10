# 06 — Search, Recommendations & Background Workers

## 1. Search architecture: hybrid (keyword + semantic) behind one interface

Search is a **module** in the monolith (`modules/search`) that exposes one interface
and swaps implementations by config. That is what lets you move from Postgres-native
search to Meilisearch/Qdrant without touching callers.

```python
# modules/search/provider.py
class SearchProvider(Protocol):
    async def search(self, q, *, business_id, filters, sort, page) -> SearchResults: ...


class PostgresSearch:  # tsvector + pg_trgm + pgvector (MVP)
    ...


class MeilisearchSearch:  # Phase 2 — faceted keyword search
    ...


class HybridSearch:  # Phase 3 — keyword (Meili) + semantic (Qdrant) fused
    ...


# provider = env SEARCH_PROVIDER=postgres
```

```python
# modules/search/vector_store.py
class VectorStore(Protocol):
    async def upsert(self, rows: list[VectorRow]): ...
    async def query(
        self, embedding, *, business_id, filters, k, score_threshold
    ) -> list[ScoredId]: ...


class PostgresVectorStore:  # pgvector (MVP — approved)
    ...


class QdrantVectorStore:  # later — config swap
    ...


# vector_store = env VECTOR_STORE=pgvector
```

### 1.1 MVP: Postgres-native (zero new infra)

- **Keyword:** `to_tsvector('simple', name || description)` GIN index + `pg_trgm`
  for typo-tolerant prefix matching. Good enough for 500 products and few-hundred
  concurrent search requests.
- **Semantic:** query → `ai-gateway /v1/embed` → `product_embeddings` HNSW index →
  top-k similar. Re-ranked with keyword match + popularity (order count) in SQL.
- **Facets/sort:** category/brand/price filters are SQL `WHERE` on indexed columns.

### 1.2 Phase 2: Meilisearch (keyword/facets) when relevance hurts

Ecommerce relevance (typo tolerance, facet distribution, exact-match boosting) is
Meilisearch's whole job and it is tiny (~150 MB) — fits the free VM3 or VM1 headroom.
The indexer worker consumes `ProductUpdated` from the outbox stream and writes to it.

### 1.3 Phase 3: Qdrant (semantic at scale)

When vectors pass ~1M or you need filtered hybrid at low latency, swap
`VectorStore` to Qdrant. Migration is **data + config**, not code:
`SELECT id, business_id, embedding, model FROM product_embeddings` → `upsert` into a
Qdrant collection with payload filters; set `VECTOR_STORE=qdrant`.

### 1.4 Indexer (keeps search fresh)

`workers/jobs/search_indexer.py` consumes `ProductUpdated` / `ProductDeleted` /
`InventoryChanged` → re-embed (only on content change, from cache) → upsert into the
active provider(s). Backfill job (`search.backfill`) rebuilds the whole index on
deploy of a new provider.

**Why one interface + event-driven sync:** callers never know which engine is behind
it; the index stays correct even while you migrate engines (dual-write during
switchover). **Trade-offs:** the sync is eventually consistent (seconds) — fine for
catalog search; not fine for order lookups (those stay on Postgres). **Migration
path:** listed above; nothing else changes.

## 2. Recommendations

| Type | How | Where it runs |
|---|---|---|
| Popular / trending | order + view aggregation (windowed) | worker → Redis |
| Related items | co-occurrence (bought together) — SQL on order_items | worker → Redis |
| Similar products | content-based: product embedding cosine | search module / vector store |
| "For you" (logged-in) | user embedding (purchase + view history) vs product embeddings | worker → Redis |
| Cold start | category bestsellers fallback | served when no user signal |

- **Offline computation in workers** (batch, low-rate), results cached in Redis with
  TTL; the API serves from Redis in the request path (sub-ms).
- **Feedback loop:** `ProductViewed` analytics events feed the next batch.
- **Levers per business:** featured slots, rules ("exclude sold-out"), manual
  overrides — config, not code.
- **Hybrid scoring** (`Phase 3`): fused score = `w1·semantic + w2·co_occurrence +
  w3·recency`, weights per tenant in config.

**Why offline-first:** recommendation quality at MVP doesn't need a real-time
reranker; Redis-served lists give the same UX at a fraction of the cost/latency, and
the real-time path (embed query → vector query) already exists for search if you want
"similar to this cart". **Trade-offs:** personalization lags an event batch (minutes).
**Migration path:** swap Redis lists → feature store + online reranker when data
volume justifies it; the API shape (`GET /recommendations?context=...`) is unchanged.

## 3. Background workers (Arq)

### 3.1 Why Arq (challenged decision #9)

| | Arq | Celery | RQ |
|---|---|---|---|
| Async-native | **yes** (asyncio) | no (picks a strategy, awkward) | no (sync, threads) |
| Runtime | tiny | heavy (billboard, beat, 10+ deps) | light |
| Broker | Redis | Redis/RabbitMQ/SQS | Redis |
| Cron | built-in | via beat | needs RQ-Scheduler |
| Retries/backoff | built-in | built-in | manual |
| Failure/DLQ | job state + retries, dead-letter on `max_tries` | yes | manual |

Arq is the right default for an async FastAPI codebase with Redis already present.
**Trade-offs:** smaller community; no UI — you get observability from logs + metrics
(`arq` job events → Prometheus). **Migration path:** the *worker process* and *job
functions* are the contract; swapping Arq → Celery/SQS later touches the runner, not
the jobs.

### 3.2 Worker service (`apps/workers`)

- Runs the same `core` package as the API (imports the event catalog + repositories)
  so jobs share models, config, and the outbox consumer.
- `main.py` = `arq:create_pool_settings` with `cron` schedules and function registry.
- Concurrency: `--concurrency 10` (async → many cheap jobs per process); scale by
  adding worker processes → later a VM3/autoscaled fleet.

### 3.3 Job catalog

| Job | Trigger | Source | Notes |
|---|---|---|---|
| `send_email` | event | outbox `OrderPlaced`, etc. | transactional templates, retries, provider adapter (Resend/SES) |
| `send_notification` | event | outbox | email/SMS/push; per-user prefs |
| `inventory_sync` | event / cron | outbox | external suppliers → `stock_levels` |
| `search.index` | event | outbox | see §1.4 |
| `recommendations.recompute` | event / cron | outbox + analytics | see §2 |
| `reports.generate` | cron | — | daily/weekly, PDF → R2, notify |
| `analytics.rollup + separate event pipeline` | cron | — | hourly/daily aggregation for dashboards |
| `ai.describe_products` | cron / admin | — | batch AI, low-rate (cost control) |
| `retention.purge` | cron | — | expired carts, old sessions, processed outbox rows |

### 3.4 Reliability rules for jobs

- **Idempotent by design**: every job re-runs safely (unique keys in DB, checks
  before side effects). A retried email doesn't double-send; a re-embed overwrites.
- **Retries**: exponential backoff + jitter; `max_tries` per job type; **dead-letter**
  to a `dead_letter` stream for manual replay (a tiny admin page lists them).
- **Rate-limit external calls** (email provider, AI gateway, supplier APIs) so a
  flood of events can't get your account throttled/banned.
- **Watchdog**: worker heartbeat + `jobs` table `last_run_at`; alerts when a scheduled
  job stops firing (stale = silently broken).
- **Scheduled jobs** are cron in Arq; all times UTC; `tz` per business honored in
  payloads.

## 4. Search module API (served by the monolith)

```text
GET /api/v1/search?q=…&business_id=…&category=…&price_min=…&sort=…&cursor=…
GET /api/v1/recommendations/{context}   # home | product | cart | user
POST /api/v1/search/admin/rebuild       # admin, triggers backfill job
```

Auth: search on the public catalog is anonymous (rate-limited); recommendation
`user` context requires a JWT.

## 5. Decision summary

| Decision | Choice | Why | Migration path |
|---|---|---|---|
| Search engine | Postgres-native first (tsvector+pg_trgm+pgvector) | zero infra, fine at MVP | Meilisearch (Phase 2) → Qdrant (Phase 3) |
| Vector store | pgvector behind `VectorStore` | approved; config swap | Qdrant |
| Sync | outbox-driven indexer | always-correct, engine-agnostic | unchanged |
| Recs | offline batch → Redis | cost/latency | online reranker later |
| Queue | Arq | async-native, tiny, built-in retries | SQS/Redpanda runner swap |
| Jobs | idempotent + DLQ + heartbeat | reliability | unchanged |


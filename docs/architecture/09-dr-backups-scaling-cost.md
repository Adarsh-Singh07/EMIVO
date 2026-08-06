# 09 — Disaster Recovery, Scaling & Cost Optimization

## Part A — Backups

### A.1 What to back up (and who owns it)

| Asset | Primary owner | Backup | Target | Frequency | RPO/RTO |
|---|---|---|---|---|---|
| Postgres | Supabase (managed) | `pg_dump` custom → **R2** + Supabase daily snapshots | R2 (versioned) | daily + PITR later | RPO ≤ 24 h · RTO ≤ 30 min |
| Redis | you | RDB snapshot → **R2** (nightly) + AOF optional | R2 | daily | RPO ≤ 24 h (sessions/OTP re-issue) |
| Images/media | Cloudflare R2 | **R2 versioning + lifecycle** | R2 | continuous | RPO ≈ 0 |
| Config/secrets | you | `sops`-encrypted `secrets.env` → R2 + git | R2 + repo | on change | RTO ~ minutes |
| Code | git | repo | GitHub | on push | RPO ≈ 0 |
| Metrics/logs | you | low-retention (rebuildable) | — | — | — |

### A.2 Backup mechanics

- **Postgres:** nightly `pg_dump -Fc` (custom, compressible) streamed straight to R2
  via `rclone` (or `pg_dump \| aws s3 cp -`), 30-day retention, `--exclude-table-data`
  for rebuildable tables (analytics_events, ai_usage can be thinned).
  `rclone` handles R2 **and** Oracle Object Storage with the same config — one script.
- **Redis:** `SAVE` → copy `dump.rdb` to R2 nightly; `maxmemory` keeps it small.
  Acceptable loss: cache (rebuilds), sessions/OTP (users re-auth).
- **R2 media:** enable **versioning** + lifecycle (keep last N versions, purge old
  thumbnails); optional cross-region replication of the bucket (R2 → Oracle) at cost
  ~0 when you add Oracle Object Storage as the mirror.
- **Config:** `.env.prod` is `sops`-encrypted and mirrored to R2; compose + nginx
  files are in git (they're code).
- **Test restores monthly** (or on every major schema change): spin a throwaway
  Supabase project / local Postgres, `pg_restore`, run smoke queries, then drop.

## Part B — Disaster Recovery plan

### B.1 RTO/RPO targets (MVP)

| Scenario | RTO | RPO |
|---|---|---|
| VM1 dies (API/workers/redis) | ≤ 30 min (re-provision from compose + image tags) | ≤ 24 h (DB) · ≤ 1 h (redis) |
| VM2 dies (AI/voice) | ≤ 30 min | voice session state lost (stateless by design) |
| Full Oracle region loss | ≤ 4 h | ≤ 24 h |
| Supabase loss | ≤ 30 min (restore dump) | ≤ 24 h |
| R2 loss | ≤ 1 h (re-upload originals or restore) | RPO ≈ 0 (versioned) |

### B.2 Runbooks (kept in `infra/scripts/` + docs)

1. **VM1 down:**
   - Recreate VM (same shape) from Oracle image/script; attach volumes;
   - `git clone` → `infra/docker/compose.prod.vm1.yaml`; pull last-good image tags;
   - `docker compose up -d`; nginx + certbot regenerate (`acme.sh` re-issue via DNS-01);
   - smoke-test `/healthz` + `/api/v1/health/ready`; flip DNS if IP changed (Cloudflare).
2. **DB restore:** `rclone cat r2:backup/db/dump.dump | pg_restore --clean --if-exists -d <new-dsn>` on a fresh Supabase/Neon project; verify counts; point `DATABASE_URL` at it; redeploy api.
3. **VM2 down:** same pattern; voice resumes statelessly, missed calls get voicemail/queue.
4. **Secret loss:** restore from sops-encrypted backup in R2; otherwise rotate keys
   (they're env, no code change).

### B.3 Resilience design (so DR is rare)

- **Stateless apps**: only Redis holds state on the VMs; a VM replacement never needs
  data migration.
- **Immutable deploys**: `{sha}` tags mean "reprovision from tag" is exact.
- **Everything else is managed**: DB, media, CDN, edge — the risky data is on
  platforms with their own SLAs.
- **Multi-region later**: DB read replica + media replication + Cloudflare LB (Phase 3).

## Part C — Scaling plan (500 users → 100,000+)

The promise: **no business-logic rewrites**, because the boundaries were built in.
Each phase lists *triggers, actions, code changes (expected ≈ none for logic)*.

### Phase 1 — MVP (now → ~1,000 users, few hundred concurrent)

```text
VM1: api (modular monolith) + workers + redis + nginx + observability
VM2: ai-gateway + voice + nginx
Managed: Supabase (pgvector) · R2 · Cloudflare · Vercel
```
Exit triggers to Phase 2: sustained CPU > 60% on VM1, DB > 400 MB, or latency
regressions under load.

### Phase 2 — Growth (~1k → 20k users)

| Action | Why | Code change |
|---|---|---|
| Add **VM3** (1 OCPU/6 GB free headroom) — split `api` into two instances behind Cloudflare LB, or run `workers` + `search` there | headroom exists free | config + compose overlay |
| Move keyword search to **Meilisearch** (VM3) | relevance/facets at volume | `SEARCH_PROVIDER=meilisearch` |
| Move embeddings to **Qdrant** (VM3) when vectors grow | vector scale | `VECTOR_STORE=qdrant` |
| Migrate DB **Supabase → Neon** (or self-host + read replica) | 500 MB cap / pause / PITR | DSN change |
| Add **read replica** for catalog/analytics reads | read-heavy ecommerce | route in repository layer (config) |
| Feature flags, session store hardening, CDN on catalog APIs | control + latency | config + middleware |
| Scale `api` replicas 2 → 4, workers → dedicated | throughput | compose `--scale` |

### Phase 3 — Scale (~20k → 100k+)

| Action | Why | Code change |
|---|---|---|
| **Kubernetes** (managed k3s or EKS/GKE) — the compose overlays become K8s manifests, same images/env | scheduling, autoscaling, self-heal | infra only |
| **Message broker** — outbox → **Redpanda/Kafka** (same handlers) | durable event backbone at volume | config swap |
| **Lift modules to services** — move `search`, `recommendations`, `notifications`, `analytics`, `payments` into their own pods | independent scale, teams | deployment change; logic identical |
| **Shard Postgres** — Citus `create_distributed_table('products','business_id')` | multi-million rows | SQL + config |
| **Cache tiers** — CDN edge for public catalog, Redis cluster for sessions | latency at scale | config |
| **AI gateway autoscale** + dedicated GPUs *only if* a feature ever needs local gen (not planned) | AI volume | scale deployment |

### What makes this "without rewriting"

| Boundary (built in Phase 1) | How it survives to Phase 3 |
|---|---|
| Module isolation (import-linter) | module → pod, same folder |
| Outbox + versioned events | Redis Streams → Redpanda, handlers unchanged |
| Ports & adapters (storage/AI/search/queue/events/payments) | provider = config |
| Plain SQL + asyncpg | Supabase → Neon → Citus, DSN/SQL only |
| API versioning + contracts | clients never break |
| Stateless, sha-tagged images | horizontal scale is instance count |

## Part D — Cost optimization plan

### D.1 Baseline (₹0 infra/mo) — see `00`

### D.2 Cost levers ranked by impact

1. **AI tokens** (the only real variable cost) — model tiering, semantic cache,
   per-tenant caps, offline batching (see `05 §5`). A caching misconfig can cost 10×
   more than every other infra line combined.
2. **Never self-host what's free-managed** — Supabase/R2/Cloudflare/Vercel all have
   free tiers; a VPS-hosted Postgres or a self-built CDN only adds ops.
3. **Image pipeline** — resize/convert to WebP/AVIF at upload; serve via Cloudflare
   cache. Egress from R2 is free; egress from Vercel/Oracle isn't unlimited. Correct
   cache headers mean the edge absorbs repeat views.
4. **Watch free-tier ceilings** — Supabase 500 MB (archive audit/analytics to R2),
   R2 Class-A ops (minimize writes), Vercel bandwidth (image caching offloads it),
   GitHub 2k min (path-filtered CI).
5. **Pay only when it pays** — upgrade tiers in this order: domain → AI usage →
   Supabase/Neon paid (PITR + no-pause) → Cloudflare Pro (WAF) → Vercel Pro — each
   justified by a metric, not fear.

### D.3 Monitoring cost

Grafana on the free VM, Alertmanager → free Discord/Telegram webhook. Total monitoring
cost: ₹0. The moment it isn't, Grafana Cloud free tier takes over.

### D.4 Kill-list (things that silently cost money)

- Auto-scaling Kubernetes clusters with no traffic · reserved GPUs · multi-region
  replication before revenue · paid observability SaaS at MVP scale · running a
  Postgres you pay for *and* a VPS it sits on.

## Part E — Decision summary

| Decision | Choice | Why | Migration path |
|---|---|---|---|
| DB backup | `pg_dump` → R2 + rclone | ₹0, provider-agnostic | paid PITR later |
| Redis backup | RDB → R2 nightly | sessions/OTP recoverable | unchanged |
| Media | R2 versioning + lifecycle | RPO≈0 | Oracle mirror |
| DR | stateless VMs + managed data | re-provision from tags | multi-region Phase 3 |
| Scale | 3 VMs → K8s → Citus + Redpanda | fits free tier, then standard | infra-only |
| Cost | ₹0 infra, AI cached + tiered | only real spend is usage | pay-for-metric upgrades |


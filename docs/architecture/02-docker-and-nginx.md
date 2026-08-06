# 02 — Docker & Nginx Architecture

## 1. Image & build strategy

- **Multi-arch images** built for `linux/arm64` (Ampere A1) and `linux/amd64` (CI,
  dev machines). `buildx` + `docker/build-push-action`.
- **Registry: GitHub Container Registry (GHCR).** Same place as your code; free;
  pullable from Oracle VMs.
- **Tagging:** `:latest` is never used in prod. Tags = `{service}:{git-sha}` (unique
  per deploy, enables rollback) + `{service}:{semver}` for releases.
- **Distroless / slim runtimes** for `api`, `workers`, `ai-gateway`, `voice`
  (`python:3.12-slim` + non-root user). Smaller images = faster pulls, smaller
  attack surface.
- **Layer hygiene:** pin base images by digest; install deps in a separate layer from
  source; `.dockerignore` excludes `node_modules`, `.git`, tests.
- **Build once, pull everywhere** — CI builds and pushes to GHCR; VMs only `docker
  compose pull`. Never `docker build` on the server (slower, non-reproducible, uses
  server CPU).

**Why GHCR vs building on the VM:** reproducible immutable images, fast rollback by
tag, and the VM stays read-only for code. **Alternatives:** GitHub-hosted runner
building on a self-hosted runner (see `08`), or `docker build` on the VM (rejected:
no provenance). **Trade-offs:** one extra push step in CI. **Migration path:** the
same tags push to any registry (ECR/GAR) when you leave the free tier.

## 2. Compose model: base + overlays

**One base file, thin overlays — not three parallel files** (challenged decision #3).

```text
infra/docker/
├── compose.yaml            # base topology: services, networks, volumes, healthchecks
├── compose.dev.yaml        # dev: bind mounts, hot-reload, seed data, exposed ports
├── compose.test.yaml       # test/CI: throwaway db/redis, run pytest
└── compose.prod.yaml       # prod: image tags, restart policies, resource limits,
                            #        extra replicas, no ports except nginx
```

Merged via `docker compose -f compose.yaml -f compose.prod.yaml up -d`.
Dev uses `.env`, prod uses `.env.prod` (never committed).

**Why overlays:** one source of truth for topology; drift impossible; the prod file
stays tiny. **Alternatives:** three standalone files (drift), Docker Compose single
file + env only (mixing dev/prod in one file is error-prone), K8s at day 1
(premature, cost, complexity — reserved for Phase 3). **Trade-offs:** you must learn
overlay semantics (a few flags). **Migration path:** compose → K8s (Phase 3) uses the
same image tags and env contract; only the runtime manifest changes.

## 3. Services

### VM1 — `infra/docker/compose.yaml` (base)

| Service | Image | Ports | Restart | Healthcheck |
|---|---|---|---|---|
| `nginx` | `nginx:alpine` | `0.0.0.0:80/443 → 443` | always | `wget -qO- http://localhost/healthz` |
| `api` | `ghcr.io/emivo/api:sha` | internal only | `unless-stopped` | `GET /health/ready` (DB+Redis probe) |
| `workers` | `ghcr.io/emivo/workers:sha` | internal | `unless-stopped` | `arq` worker uptime signal |
| `redis` | `redis:7-alpine` | `127.0.0.1:6379` | always | `redis-cli ping` |
| `prometheus` | `prom/prometheus` | internal (`9090`) | `unless-stopped` | `/-/healthy` |
| `grafana` | `grafana/grafana` | internal (`3000`) | `unless-stopped` | `/api/health` |
| `node-exporter` | `prom/node-exporter` | internal | `unless-stopped` | — |

Prod overlay adds `api` replicas = 2 (nginx load-balances) for zero-downtime rolling.

### VM2 — same base file, prod overlay selects different services

| Service | Image | Ports | Notes |
|---|---|---|---|
| `nginx` | `nginx:alpine` | 80/443 | proxies `voice` + `ai-gateway` |
| `ai-gateway` | `ghcr.io/emivo/ai-gateway:sha` | internal | |
| `voice` | `ghcr.io/emivo/voice:sha` | internal | WebSocket to telephony |

**Decision — same repo/image pipeline for both VMs.** One compose base, two prod
overlays (`compose.prod.vm1.yaml`, `compose.prod.vm2.yaml`). CI builds all images;
each VM pulls only what it runs.
**Why:** one build pipeline, no per-VM drift, symmetric ops. **Trade-offs:** VM2 pulls
images it doesn't use (negligible). **Migration path:** adding VM3 = one more overlay.

## 4. Networks

```text
compose network:
  frontend  → nginx only
  backend   → api, workers, redis, prometheus, exporters
  (no public ports on backend services)
```

- **`frontend`:** carries inbound 443; nginx is the *only* member with published ports.
- **`backend`:** everything else; **no published ports at all** — services reachable
  only via the docker network / `127.0.0.1`.
- Services never cross the network boundary except nginx; this is the micro-service
  firewall within the host.

**Why:** any container compromise (e.g., an RCE in a dependency) cannot expose Redis,
the API, or the DB port to the internet. **Alternatives:** host networking (rejected:
no isolation), per-service networks (over-engineering at this scale). **Trade-offs:**
slightly more compose config. **Migration path:** maps 1:1 to K8s namespaces/network
policies.

## 5. Volumes & persistence

| Volume | Service | Contents | Backup |
|---|---|---|---|
| `redis-data` | redis | RDB/AOF snapshots | R2 (see 09) |
| `prometheus-data` | prometheus | metrics (low-retention) | none (rebuildable) |
| `grafana-data` | grafana | dashboards + datasource | git (dashboards as code) |
| `nginx-cache` | nginx | edge cache of static/media | none (rebuildable) |
| `certbot-etc` | certbot | TLS certs | regenerate |

Named volumes (not bind mounts) for prod data; bind mounts only in dev.

**Decision — no `docker-compose` host volume for the database and no media volume.**
Postgres lives in Supabase (managed), media lives in R2 (managed). The VM holds only
stateless app state + Redis + metrics. **Why:** the two hardest things to back up —
DB and images — are delegated to providers that back them up for you.
**Trade-offs:** you depend on Supabase/R2 availability (both ≥99.9% class).
**Migration path:** unchanged when you move DB/storage — DSNs and bucket config.

## 6. Restart policies & resource limits

- `restart: always` for nginx/redis (edge), `unless-stopped` for app services.
- **cgroups limits in compose** (`deploy.resources.limits`):
  - `redis`: `memory: 512m` + `maxmemory 384mb`
  - `api`: `memory: 1024m`, `workers`: `memory: 768m`
  - `ai-gateway` / `voice`: `memory: 768m` each
  - This is what prevents a leak in one container from killing the VM (an OOM-killed
    container restarts; an OOM-killed VM does not).

## 7. Nginx

`infra/docker/nginx/nginx.conf` + per-VM `sites/*.conf` (mounted read-only).

Server block essentials (VM1):

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;

server {
    listen 443 ssl http2;
    server_name api.emivo.com;
    # TLS certs from certbot, HSTS, OCSP stapling

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Brotli (or gzip fallback)
    brotli on; brotli_types text/plain text/css application/json application/javascript image/svg+xml;

    # Static/media caching (long-lived, immutable)
    location ~* \.(webp|avif|jpg|jpeg|png|svg|css|js)$ {
        expires 30d; add_header Cache-Control "public, immutable"; proxy_pass http://media;
    }

    # API
    location /api/ {
        limit_req zone=api burst=40 nodelay;
        proxy_pass http://api:8000;
        proxy_set_header X-Request-ID $request_id;   # correlate end-to-end
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 5m;                     # image upload cap
    }

    # Health (no rate limit, used by LB/uptime)
    location = /healthz { access_log off; return 200; }
}
```

On VM2 the same pattern proxies `ai-gateway` and `voice` (with
`proxy_read_timeout` for long STT/TTS streams and WebSocket `Upgrade` headers).

**Why Nginx over alternatives:** you specified it, and it is the correct origin
proxy for this shape (battle-tested, tiny, config-as-code). **Alternatives:**
Caddy (auto-HTTPS, simpler, but fewer knobs), Traefik (great with Docker labels,
more moving parts). **Trade-offs:** nginx config is more verbose; you manage certs
via certbot. **Migration path:** the same config ships into K8s as an Ingress (or
you adopt the platform's ingress) — your security headers/caching rules are portable.

## 8. HTTPS on origin

- `certbot`/`acme.sh` with **Cloudflare DNS-01** challenge, auto-renew (systemd timer
  or certbot deploy hook reloading nginx).
- `proxy_cert` — Cloudflare **full (strict)**, so origin must present a valid LE cert.
- Optional: `ssl_reject_handshake` default server block to 443-drop unknown SNI.

## 9. Zero-downtime deploy (within Docker)

1. `api` runs 2 replicas behind nginx `upstream` with `max_fails` + active healthcheck
   (nginx `zone` + `api_health` upstream checks).
2. Deploy: `docker compose -f ... up -d --no-deps --scale api=2 api` pulls the new
   image → compose creates a new container → healthcheck passes → nginx re-resolves;
   the old container is stopped last.
3. Rollback = `docker compose up -d api:<previous-sha>` (or `git revert` + redeploy).

**Decision — rolling, not blue-green.** Two replicas cost one extra container's RAM
(~500 MB, you have 10 GB headroom) and give graceful drain. **Alternatives:**
blue-green (needs a temp "green" stack — heavier on a 12 GB box), keep-old-till-new
(compose default behavior is stop-then-start → real downtime; avoided by scaling to 2
first). **Trade-offs:** during a deploy both image versions briefly serve — safe
because migrations are backward-compatible (expand/contract, `08`).

## 10. Logs & the container runtime

- **Docker logs go to** `json-file` with rotation (`max-size: 20m`, `max-file: 3`),
  and `app` processes emit **structured JSON** (see `07`).
- Prometheus scrapes exporters on the backend network; Grafana dashboards committed
  to `infra/grafana/` (dashboards as code).

## 11. Decision summary

| Decision | Choice | Why | Migration path |
|---|---|---|---|
| Images | GHCR, sha-tagged, multi-arch | reproducible + rollback | any registry |
| Compose | base + overlays | no drift | → K8s manifests |
| Networks | nginx-only public | internal firewall | K8s network policies |
| DB/media | external (Supabase/R2) | delegated backups | same DSNs/buckets |
| Limits | cgroups + `maxmemory` | VM survives leaks | K8s resource requests |
| Deploy | rolling 2 replicas | zero-downtime, cheap | K8s rollout |

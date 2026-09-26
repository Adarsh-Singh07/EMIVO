# ELEKTRIX — Deployment Guide

This document is the single source of truth for deploying ELEKTRIX anywhere.
It is written so that a **completely fresh Ubuntu VPS** (temporary Azure VM
today, permanent Oracle VPS later) can be brought online without any knowledge
that is not written here.

Architecture in one line:

```
GitHub (source of truth)
   → local dev (compose.yaml + compose.local.yaml)
   → any VPS (/opt/elektrix, compose.prod.vm1.yaml, .env on that machine only)
   → Supabase (PostgreSQL, external, survives VPS loss)
   → Cloudflare R2 (media, external)
```

The **VPS is disposable**. If it dies: provision a new one, install Docker,
clone, restore `.env`, run the deploy script — done. Application data lives in
Supabase / R2, not on the VPS.

---

## 1. Repository layout (what runs where)

| Path | Role |
|---|---|
| `apps/api/` | FastAPI backend (Docker image `apps/api/Dockerfile`, port 8000) |
| `apps/workers/` | ARQ worker: outbox dispatch, cron, inbound email→tickets |
| `storefront/` | Next.js storefront (Dockerfile.storefront, port 3000) |
| `admin/` | Next.js admin dashboard (admin/Dockerfile, port 3100) |
| `compose.yaml` | Local base services: PostgreSQL (pgvector) + Redis |
| `compose.local.yaml` | Local **full stack** (api + storefront + admin + workers, no nginx) |
| `compose.prod.vm1.yaml` | **VPS stack**: nginx TLS edge + 2×api + 2×storefront + 2×admin + workers + redis |
| `infra/nginx/nginx.conf` | 4 vhosts: elektrix.in, www, admin.elektrix.in, api.elektrix.in |
| `infra/scripts/deploy_vps.sh` | One-shot VPS deploy (build → backup → migrate → RLS → certs → rollout → seed → smoke → rollback) |
| `infra/scripts/setup_ssl.sh` | Let's Encrypt certs (self-signed placeholders until DNS points at the VPS) |
| `infra/scripts/backup_db.sh` / `restore_db.sh` | Supabase pg_dump backup/restore |
| `scripts/seed_store.py` | Idempotent seed of the canonical ELEKTRIX store |
| `scripts/apply_all_rls.py` | Applies `db/rls/*.sql` Row Level Security policies |
| `scripts/smoke_prod.sh` | Post-deploy smoke checks against a live API |
| `.env.example` | Template of every environment variable (placeholders only) |

The compose project name is pinned to `elektrix` (top-level `name:` in the
compose files). Do not change it: nginx load-balances across the container
names `elektrix-api-1` / `elektrix-api-2`.

---

## 2. Environments

The same commit runs everywhere. Only three things differ:

| | Local | Azure (temporary, ~1 month) | Oracle (permanent) |
|---|---|---|---|
| Compose file | `compose.yaml` + `compose.local.yaml` | `compose.prod.vm1.yaml` | `compose.prod.vm1.yaml` |
| App dir | repo clone | `/opt/elektrix` | `/opt/elektrix` |
| Public URLs | `localhost:3000/8000` | VM IP or temp domain | `elektrix.in` + subdomains |
| `ENV_NAME` | `local` | `staging` | `prod` |
| `PAYMENT_PROVIDER` | `easebuzz` (test keys) | `easebuzz` (**test** keys, sandbox) | `easebuzz` (`EASEBUZZ_ENVIRONMENT=production`, live keys) |
| Database | local `db` container | Supabase project | same Supabase project |
| TLS | none (http) | Let's Encrypt via `setup_ssl.sh` | Let's Encrypt via `setup_ssl.sh` |

Never point local testing at the production Supabase database — local testing
writes real orders/users. Local always uses the `db` container.

---

## 3. Local setup (do this FIRST — it must work before any VPS work)

Prerequisites: Docker Desktop (or docker engine + compose plugin), Git.

```bash
git clone https://github.com/Adarsh-Singh07/EMIVO.git Elektrix
cd Elektrix
cp .env.example .env
# Edit .env — for local you only strictly need:
#   JWT_SECRET   (openssl rand -hex 32)
#   EASEBUZZ_MERCHANT_KEY / EASEBUZZ_SALT  (Easebuzz TEST credentials, for payment tests)
# Everything else has working local defaults.
```

Start the full stack (db, redis, api, storefront, admin, workers):

```bash
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```

Initialize the local database (empty until you do this):

```bash
docker compose -f compose.yaml -f compose.local.yaml run --rm api alembic upgrade head
docker compose -f compose.yaml -f compose.local.yaml run --rm api python scripts/apply_all_rls.py
docker compose -f compose.yaml -f compose.local.yaml run --rm \
  -e ADMIN_INITIAL_PASSWORD='LocalTest@123' api python scripts/seed_store.py
```

Verify:

| Check | Command / URL |
|---|---|
| API health | `curl http://localhost:8000/health/live` and `/health/ready` |
| API docs | http://localhost:8000/api/v1/docs |
| Storefront | http://localhost:3000 |
| Admin | http://localhost:3001 |
| Catalog | storefront home shows the seeded products |
| Login | admin@elektrix.in + the ADMIN_INITIAL_PASSWORD you set |
| Cart → checkout → pay | add to cart, checkout, pay with Easebuzz **test** credentials |

Logs / container status:

```bash
docker compose -f compose.yaml -f compose.local.yaml ps
docker compose -f compose.yaml -f compose.local.yaml logs -f api
```

Tear down (keeps the local DB volume): `docker compose -f compose.yaml -f compose.local.yaml down`.
Wipe the local DB volume too: add `-v`.

### How local payments work without a public URL

- The API calls Easebuzz's `initiateLink` API **outbound** — works from localhost.
- After paying on `testpay.easebuzz.in`, Easebuzz POSTs the browser to the
  **surl/furl**: `{API_PUBLIC_URL}/api/v1/payments/easebuzz/return`. With
  `API_PUBLIC_URL=http://localhost:8000` the *browser itself* (same machine)
  completes the callback, the backend verifies the hash + status API, and
  303-redirects into the embedded frame → `{STOREFRONT_URL}/pay/<order>`.
- The Easebuzz webhook (`/api/v1/payments/webhook/easebuzz`) cannot reach
  localhost — that's fine: settlement is driven by the surl callback + status
  API verification, the webhook is a redundancy for missed callbacks.

---

## 4. VPS setup (fresh Ubuntu — Azure now, Oracle later)

### 4.1 Base packages (once)

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git openssl

# Docker Engine + Compose plugin (official convenience script)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # log out/in afterwards
docker compose version            # should print v2.x+
```

### 4.2 Get the code

```bash
sudo mkdir -p /opt/elektrix && sudo chown "$USER":"$USER" /opt/elektrix
cd /opt/elektrix
git clone https://github.com/Adarsh-Singh07/EMIVO.git .
```

If the repo is private, authenticate git first (GitHub CLI: `gh auth login`,
or a fine-grained **deploy key** / personal access token with repo-read scope).

### 4.3 Configure `.env` (secrets live ONLY here — never commit, never push)

```bash
cd /opt/elektrix
cp .env.example .env
nano .env    # fill in the real values (see checklist below)
chmod 600 .env
```

Minimum checklist for a VPS `.env`:

| Variable | Value |
|---|---|
| `COMPOSE_PROJECT_NAME` | `elektrix` (keep) |
| `ENV_NAME` | `staging` on Azure, `prod` on Oracle |
| `DATABASE_URL` | Supabase **pooler** DSN (`postgresql+asyncpg://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres`) |
| `SYNC_DATABASE_URL` | same credentials as `postgresql://…` (used by deploy backup/RLS steps) |
| `REDIS_URL` | `redis://redis:6379/0` (compose-internal redis) |
| `JWT_SECRET` | `openssl rand -hex 32` — generate a NEW one per VPS |
| `CORS_ORIGINS` | `https://elektrix.in,https://www.elektrix.in,https://admin.elektrix.in` (add the VM IP/`http://<ip>` on Azure if browsing by IP) |
| `STOREFRONT_URL` | `https://elektrix.in` (Azure-by-IP phase: `http://<VM-IP>`) |
| `API_PUBLIC_URL` | `https://api.elektrix.in` (Azure-by-IP phase: `http://<VM-IP>`) — drives Easebuzz surl/furl |
| `NEXT_PUBLIC_API_URL` | `https://api.elektrix.in/api/v1` (or `http://<VM-IP>/api/v1`) — **build-time**, changing it requires a rebuild |
| `PAYMENT_PROVIDER` | `easebuzz` |
| `EASEBUZZ_MERCHANT_KEY` / `EASEBUZZ_SALT` | from the Easebuzz dashboard (TEST pair on Azure, LIVE pair on Oracle) |
| `EASEBUZZ_ENVIRONMENT` | `test` on Azure, **`production`** (literally) on Oracle |
| `ADMIN_INITIAL_PASSWORD` | strong password for the seeded admin, then optionally remove from `.env` |
| `R2_*`, email, SMS, AI keys | optional features; fill when needed |

### 4.4 Firewall / network

Open inbound: `22` (SSH), `80` (HTTP + ACME), `443` (HTTPS).
On Azure this is the VM's **Network Security Group**; on Oracle it is the
Security List/NSG *plus* `ufw`/iptables if enabled.

### 4.5 Deploy

```bash
cd /opt/elektrix
bash infra/scripts/setup_ssl.sh      # certificates (self-signed placeholders until DNS points here)
bash infra/scripts/deploy_vps.sh     # full pipeline incl. migrations, RLS, seed, smoke tests
```

`deploy_vps.sh` runs: `git fetch origin main && git reset --hard` → build →
Supabase pg_dump backup (to `/opt/elektrix/backups/`) → `alembic upgrade head`
→ RLS policies → certs → `docker compose up -d` → idempotent seed → smoke
tests (api/storefront/admin/PDP) → **automatic rollback on smoke failure**.

Manual day-2 commands:

```bash
git pull && docker compose -f compose.prod.vm1.yaml build
docker compose -f compose.prod.vm1.yaml up -d          # rolling recreate
# or simply re-run: bash infra/scripts/deploy_vps.sh
```

### 4.6 Point DNS at the VPS

At the DNS provider (Cloudflare, per nginx's real-IP config):

| Record | Value |
|---|---|
| `elektrix.in` | VPS public IP (A) |
| `www.elektrix.in` | CNAME → elektrix.in (or A) |
| `admin.elektrix.in` | VPS public IP (A) |
| `api.elektrix.in` | VPS public IP (A) |

Then re-run `bash infra/scripts/setup_ssl.sh` to replace self-signed
placeholders with real Let's Encrypt certificates. **DNS change is the entire
Oracle↔Azure↔Oracle migration for the domain** — no code changes.

### 4.7 Update GitHub Actions secrets (optional CI deploy)

`.github/workflows/deploy-vps.yml` deploys via SSH after CI passes. Update the
repository secrets for the new VPS: `VPS_SSH_HOST`, `VPS_SSH_USER`,
`VPS_SSH_KEY`, `VPS_SSH_PORT`. Without them, deploy manually with
`bash infra/scripts/deploy_vps.sh` — that is the supported path.

---

## 5. Health checks & diagnostics

| Layer | Check |
|---|---|
| Containers | `docker compose -f compose.prod.vm1.yaml ps` — all `healthy`/`running` |
| API liveness | `curl -k https://localhost/health/live -H 'Host: api.elektrix.in'` (on VPS) or `https://api.elektrix.in/health/live` |
| API readiness (DB + Redis + migrations) | `/health/ready` |
| Full diagnostics (latencies, git commit, provider) | `/health/diagnostics`, `/api/v1/system/status` |
| Storefront | `curl -k -H 'Host: elektrix.in' https://localhost/ -o /dev/null -w '%{http_code}'` |
| Admin | same with `admin.elektrix.in` |
| Catalog API | `https://api.elektrix.in/api/v1/store/products?page_size=1` |
| Payment initiation | place a sandbox order; watch `logs -f api` for `EaseBuzz: initiating payment txnid=…` |
| Scripted suite | `bash scripts/smoke_prod.sh` (uses `API_BASE` env or api.elektrix.in) |

---

## 6. Update / rollback

**Update** (normal path): merge to `main` → on the VPS run
`bash infra/scripts/deploy_vps.sh` (or let GitHub Actions do it).

**Rollback code:** `deploy_vps.sh` rolls back automatically if smoke tests
fail. Manual: `git reset --hard <previous-commit> && docker compose -f compose.prod.vm1.yaml up -d --build`.

**Rollback database:** pre-deploy pg_dump dumps are in `/opt/elektrix/backups/`;
restore with `bash infra/scripts/restore_db.sh` (reads `LOCAL_DATABASE_URL`).

**Rollback env:** edit `.env` → `docker compose -f compose.prod.vm1.yaml up -d`.
Note `NEXT_PUBLIC_*` and compose build-args are baked into images — changing
them requires a rebuild, not just a restart.

**nginx config changed?** `nginx.conf` is bind-mounted as a single file: after
a commit that touches it, force-recreate:
`docker compose -f compose.prod.vm1.yaml up -d --force-recreate nginx`.

---

## 7. Disaster recovery (the "VPS died" playbook)

1. Provision a fresh Ubuntu VM; open ports 22/80/443.
2. `curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER`
3. Clone the repo into `/opt/elektrix` (Section 4.2).
4. Restore `.env` from your secret store (password manager / encrypted note).
   **This is the ONLY thing not in Git — keep a copy of every value off-VPS.**
5. Point DNS at the new IP (Section 4.6) and run `setup_ssl.sh`.
6. `bash infra/scripts/deploy_vps.sh`.
7. Application data is untouched: it lives in Supabase (DB) and Cloudflare R2
   (media). Only the transient redis (sessions/rate-limits) starts empty.

Run `bash infra/scripts/backup_db.sh` on a schedule (cron) to keep Supabase
dumpsafe beyond its own platform backups: dumps go to `/tmp/db_backups` and
R2 (`r2:emivo-db-backups/production/`).

---

## 8. Payments (Easebuzz) — reference

- Backend source of truth: `apps/api/modules/payments/providers/easebuzz.py`.
  Salt stays server-side; every callback hash is verified (SHA-512, constant
  time); captures cross-check the Easebuzz **status API** — callback hashes
  alone are never proof of payment.
- Embedded checkout: the storefront renders the gateway page in a modal iframe
  (`storefront/components/site/PaymentGatewayModal.tsx`); the frame's final hop
  is our own `/pay/<order>` page, which reports the result via postMessage.
  CSP in `infra/nginx/nginx.conf` already allows `pay/testpay/staticpay.easebuzz.in`.
- Easebuzz dashboard configuration: set success/failure URLs to
  `{API_PUBLIC_URL}/api/v1/payments/easebuzz/return` (surl = furl = same
  endpoint; the `status` field differentiates). Optional webhook:
  `{API_PUBLIC_URL}/api/v1/payments/webhook/easebuzz`.
- `EASEBUZZ_ENVIRONMENT` values: `test` → testpay.easebuzz.in,
  `production` → pay.easebuzz.in. Anything other than literally `production`
  stays on the sandbox.
- Test cards/UPI for sandbox are those provided by Easebuzz support/dashboard
  in test mode. Verify: initiate → pay in the embedded frame → order flips to
  CONFIRMED → stock committed → email/outbox events fire.

---

## 9. Rules that keep this reproducible

1. **GitHub is the source of truth.** Never edit source files on the VPS;
   every fix goes local → test → commit → push → pull on the VPS.
2. **`.env` never leaves the machine.** `.gitignore` already excludes
   `.env`/`.env.*`; `.env.example` is the committed template. Add new variables
   to `.env.example` in the same commit that introduces them.
3. **No hardcoded hosts.** Public URLs come from `STOREFRONT_URL`,
   `API_PUBLIC_URL`, `NEXT_PUBLIC_API_URL` (build-time), `CORS_ORIGINS`.
4. **The VPS is disposable.** Anything that must survive its loss lives in
   Supabase, R2, or Git.

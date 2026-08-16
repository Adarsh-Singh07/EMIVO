#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# ELEKTRIX v0.2 — Oracle VPS Deployment (same script GitHub Actions triggers)
#
# Pipeline: build → DB backup → migrate → RLS → certs → rollout → seed →
#           smoke (api/storefront/admin) → reload | rollback on failure
# Set SKIP_PULL=1 to deploy the working tree as-is (local deploy).
# ==============================================================================

cd /opt/elektrix
COMPOSE="docker compose -f compose.prod.vm1.yaml"
PREVIOUS_COMMIT=$(git rev-parse HEAD)

echo "=== [1/9] Source ==="
if [ "${SKIP_PULL:-0}" != "1" ]; then
    git fetch origin main
    git reset --hard FETCH_HEAD
else
    echo "  SKIP_PULL=1 — deploying working tree at $(git rev-parse --short HEAD)"
fi

if [ ! -f ".env" ]; then
    echo "ERROR: .env file missing!"; exit 1
fi
set -a; source .env; set +a
: "${DATABASE_URL:?DATABASE_URL missing in .env}"
: "${JWT_SECRET:?JWT_SECRET missing in .env}"

echo "=== [2/9] Building images ==="
$COMPOSE build

echo "=== [3/9] Database backup (pre-migration) ==="
mkdir -p backups
TS=$(date +%Y%m%d_%H%M%S)
PGPASS=$(echo "$SYNC_DATABASE_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')
docker run --rm -e PGPASSWORD="$PGPASS" -v /opt/elektrix/backups:/backups postgres:17-alpine \
    pg_dump "${SYNC_DATABASE_URL}" --no-owner --no-privileges -Fc \
    -f "/backups/pre_deploy_${TS}.dump" && echo "  backup: backups/pre_deploy_${TS}.dump"

echo "=== [4/9] Migrations ==="
$COMPOSE run --rm api alembic upgrade head

echo "=== [5/9] RLS policies ==="
docker run --rm -i -e PGPASSWORD="$PGPASS" postgres:17-alpine \
    sh -c "psql '$SYNC_DATABASE_URL' -v ON_ERROR_STOP=1 -f -" < <(cat db/rls/*.sql) \
    && echo "  RLS applied"

echo "=== [6/9] Certificates ==="
bash infra/scripts/setup_ssl.sh || echo "  (cert step reported issues — continuing with placeholders)"

echo "=== [7/9] Rollout ==="
$COMPOSE up -d --remove-orphans
sleep 8

echo "=== [8/9] Store seed (idempotent) ==="
$COMPOSE run --rm api python /app/scripts/seed_store.py || {
    echo "WARNING: seed step failed — continuing (run scripts/seed_store.py manually)"
}

echo "=== [9/9] Smoke tests ==="
FAIL=0
check() {
    local name="$1" host="$2" path="${3:-/}"
    if curl -sk -f -H "Host: $host" --max-time 20 "https://localhost$path" -o /dev/null; then
        echo "  OK   $name ($host$path)"
    else
        echo "  FAIL $name ($host$path)"; FAIL=1
    fi
}
check "api live"    api.elektrix.in    /health/live
check "api ready"   api.elektrix.in    /health/ready
check "api catalog" api.elektrix.in    /api/v1/store/products?page_size=1
check "storefront"  elektrix.in        /
check "admin"       admin.elektrix.in  /

if [ "$FAIL" = "1" ]; then
    echo "=== SMOKE FAILED — rolling back to $PREVIOUS_COMMIT ==="
    git reset --hard "$PREVIOUS_COMMIT"
    git stash list >/dev/null 2>&1 || true
    $COMPOSE up -d --remove-orphans
    $COMPOSE exec -T nginx nginx -s reload || true
    echo "=== Rolled back (DB NOT reverted — migration is additive; see docs/ROLLBACK.md) ==="
    exit 1
fi

$COMPOSE exec -T nginx nginx -s reload
echo "=== Deployment SUCCESS at $(git rev-parse --short HEAD) ==="
$COMPOSE ps

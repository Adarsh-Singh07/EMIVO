#!/usr/bin/env bash
# ELEKTRIX backend integration test runner.
# Boots a clean scratch Postgres (RLS applied) + isolated test Redis, applies
# migrations, seeds the store, and runs pytest inside the API image.
#
# Container/network names are deliberately NOT part of the production compose
# project (elektrix_*), so this can never touch live containers even when run
# on the VM. All hostnames come from variables — no hardcoded names.
set -euo pipefail
cd "$(dirname "$0")/.."

API_IMAGE="${API_IMAGE:-elektrix-api:v02test}"
NET=elektrix-test-net
DB_CONTAINER=elektrix-test-db-1
REDIS_CONTAINER=elektrix-test-redis
DB_URL="postgresql+asyncpg://postgres:password@${DB_CONTAINER}:5432/emivo"
DB_SYNC_URL="postgresql://postgres:password@${DB_CONTAINER}:5432/emivo"
REDIS_URL="redis://${REDIS_CONTAINER}:6379/0"

cleanup() {
  docker rm -f "$REDIS_CONTAINER" "$DB_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NET" >/dev/null 2>&1 || true
echo "==> [0/6] building image"
docker build -q -t "$API_IMAGE" -f apps/api/Dockerfile .

echo "==> [1/6] scratch postgres up"
docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$DB_CONTAINER" --network "$NET" \
  -e POSTGRES_PASSWORD=password -e POSTGRES_DB=emivo ankane/pgvector:latest >/dev/null

echo "Waiting for db..."
until docker exec "$DB_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done
sleep 5

echo "==> [2/6] isolated test redis"
docker rm -f "$REDIS_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$REDIS_CONTAINER" --network "$NET" redis:7-alpine >/dev/null
sleep 2

echo "==> [3/6] reset schema + migrate"
docker exec "$DB_CONTAINER" psql -U postgres -d emivo -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
docker run --rm --network "$NET" \
  -e DATABASE_URL="$DB_URL" \
  -e SYNC_DATABASE_URL="$DB_SYNC_URL" \
  -e JWT_SECRET="test-secret-for-migrations-only-32ch" \
  -e REDIS_URL="$REDIS_URL" \
  "$API_IMAGE" alembic upgrade head >/dev/null

echo "==> [4/6] apply RLS"
docker exec "$DB_CONTAINER" psql -U postgres -d emivo -c "CREATE ROLE emivo_app NOLOGIN NOBYPASSRLS;" 2>/dev/null || true
docker exec "$DB_CONTAINER" psql -U postgres -d emivo -c "GRANT emivo_app TO postgres;" >/dev/null
for f in db/rls/*.sql; do
  docker cp "$f" "$DB_CONTAINER:/tmp/rls.sql" >/dev/null
  docker exec "$DB_CONTAINER" psql -U postgres -d emivo -v ON_ERROR_STOP=1 -f /tmp/rls.sql >/dev/null
done

echo "==> [5/6] seed store"
docker run --rm --network "$NET" \
  -e DATABASE_URL="$DB_URL" \
  -e SYNC_DATABASE_URL="$DB_SYNC_URL" \
  -e JWT_SECRET="test-secret-for-migrations-only-32ch" \
  -e REDIS_URL="$REDIS_URL" \
  -e ADMIN_EMAIL="admin@example.com" \
  -e ADMIN_INITIAL_PASSWORD="TestAdminPass123!" \
  -e ENV_NAME=pytest \
  -v "$(pwd)/scripts:/app/scripts" \
  "$API_IMAGE" python /app/scripts/seed_store.py | tail -3

echo "==> [6/6] pytest"
docker run --rm --network "$NET" \
  -e DATABASE_URL="$DB_URL" \
  -e SYNC_DATABASE_URL="$DB_SYNC_URL" \
  -e JWT_SECRET="test-secret-for-migrations-only-32ch" \
  -e REDIS_URL="$REDIS_URL" \
  -e ENV_NAME=pytest \
  -e PAYMENT_PROVIDER=mock \
  -e RAZORPAY_WEBHOOK_SECRET=test_webhook_secret \
  -e CASHFREE_CLIENT_SECRET=test_webhook_secret \
  -e EASEBUZZ_MERCHANT_KEY=testkey \
  -e EASEBUZZ_SALT=testsalt \
  -e STORE_BUSINESS_ID="" \
  -e ADMIN_EMAIL="admin@example.com" \
  -e ADMIN_INITIAL_PASSWORD="TestAdminPass123!" \
  -e PYTHONPATH=/app/apps/api \
  -v "$(pwd)/apps/api/tests:/app/apps/api/tests" \
  --workdir /app \
  "$API_IMAGE" python -m pytest apps/api/tests/v02 -q

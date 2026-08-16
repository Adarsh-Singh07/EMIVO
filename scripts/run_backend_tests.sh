#!/usr/bin/env bash
# ELEKTRIX v0.2 backend integration test runner.
# Boots a clean scratch Postgres (RLS applied) + isolated test Redis, applies
# migrations, seeds the store, and runs pytest inside the API image.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_CONTAINER=elektrix-db-1
API_IMAGE="${API_IMAGE:-elektrix-api:v02test}"
NET=elektrix_default

echo "==> [1/6] scratch postgres up"
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || docker run -d --name "$DB_CONTAINER" --network "$NET" \
  -e POSTGRES_PASSWORD=password -e POSTGRES_DB=emivo ankane/pgvector:latest
docker start "$DB_CONTAINER" >/dev/null 2>&1 || true
sleep 3

echo "==> [2/6] isolated test redis"
docker rm -f elektrix-test-redis >/dev/null 2>&1 || true
docker run -d --name elektrix-test-redis --network "$NET" redis:7-alpine >/dev/null
sleep 2

echo "==> [3/6] reset schema + migrate"
docker exec "$DB_CONTAINER" psql -U postgres -d emivo -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
docker run --rm --network "$NET" \
  -e DATABASE_URL="postgresql+asyncpg://postgres:password@db:5432/emivo" \
  -e SYNC_DATABASE_URL="postgresql://postgres:password@db:5432/emivo" \
  -e JWT_SECRET="test-secret-for-migrations-only-32ch" \
  -e REDIS_URL="redis://elektrix-test-redis:6379/0" \
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
  -e DATABASE_URL="postgresql+asyncpg://postgres:password@db:5432/emivo" \
  -e SYNC_DATABASE_URL="postgresql://postgres:password@db:5432/emivo" \
  -e JWT_SECRET="test-secret-for-migrations-only-32ch" \
  -e REDIS_URL="redis://elektrix-test-redis:6379/0" \
  -e ADMIN_EMAIL="admin@example.com" \
  -e ADMIN_INITIAL_PASSWORD="TestAdminPass123!" \
  -e ENV_NAME=pytest \
  -v /opt/elektrix/scripts:/app/scripts \
  "$API_IMAGE" python /app/scripts/seed_store.py | tail -3

echo "==> [6/6] pytest"
docker run --rm --network "$NET" \
  -e DATABASE_URL="postgresql+asyncpg://postgres:password@db:5432/emivo" \
  -e SYNC_DATABASE_URL="postgresql://postgres:password@db:5432/emivo" \
  -e JWT_SECRET="test-secret-for-migrations-only-32ch" \
  -e REDIS_URL="redis://elektrix-test-redis:6379/0" \
  -e ENV_NAME=pytest \
  -e PAYMENT_PROVIDER=mock \
  -e RAZORPAY_WEBHOOK_SECRET=test_webhook_secret \
  -e STORE_BUSINESS_ID="" \
  -e ADMIN_EMAIL="admin@example.com" \
  -e ADMIN_INITIAL_PASSWORD="TestAdminPass123!" \
  -e PYTHONPATH=/app/apps/api \
  -v /opt/elektrix/apps/api/tests:/app/apps/api/tests \
  --workdir /app \
  "$API_IMAGE" python -m pytest apps/api/tests/v02 -x -q

RC=$?
docker rm -f elektrix-test-redis >/dev/null 2>&1 || true
exit $RC

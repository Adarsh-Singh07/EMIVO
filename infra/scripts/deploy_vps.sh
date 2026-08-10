#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# ELEKTRIX — Oracle VPS Zero-Downtime Deployment Script
# Official Domain: https://elektrix.in
# ==============================================================================

# Define rollback tag in case of health check failure
PREVIOUS_COMMIT=$(git rev-parse HEAD)

echo "=== [1/6] Pulling latest git changes ==="
git fetch origin main
git reset --hard FETCH_HEAD

echo "=== [2/6] Validating environment file ==="
if [ ! -f ".env" ]; then
    echo "ERROR: .env file missing in root directory!"
    exit 1
fi

echo "=== [3/6] Building production docker images ==="
docker compose -f compose.prod.vm1.yaml build

echo "=== [4/6] Running database migrations ==="
# Run Alembic migrations against production Supabase
docker compose -f compose.prod.vm1.yaml run --rm api alembic upgrade head

echo "=== [5/6] Deploying production stack ==="
# Start services in the background (FastAPI, Workers, Redis, Nginx)
docker compose -f compose.prod.vm1.yaml up -d --remove-orphans

echo "=== [6/6] Verifying API Health Endpoint ==="
# Give containers time to initialize
sleep 5

# Check FastAPI health status through Nginx proxy
if curl -k -f -H "Host: api.elektrix.in" https://localhost/health/live > /dev/null 2>&1; then
    echo "=== Health check passed! Reloading Nginx ==="
    docker compose -f compose.prod.vm1.yaml exec -T nginx nginx -s reload
    echo "=== Deployment completed successfully for ELEKTRIX API (https://api.elektrix.in) ==="
    docker compose -f compose.prod.vm1.yaml ps
else
    echo "=== ERROR: Health check failed! Initiating rollback ==="
    git reset --hard "$PREVIOUS_COMMIT"
    docker compose -f compose.prod.vm1.yaml up -d --remove-orphans
    docker compose -f compose.prod.vm1.yaml exec -T nginx nginx -s reload
    echo "=== Rollback completed successfully to Git SHA: $PREVIOUS_COMMIT ==="
    exit 1
fi

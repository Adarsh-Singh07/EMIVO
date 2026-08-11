#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# ELEKTRIX — SSL Let's Encrypt Certificate Automation
# Official Domain: https://api.elektrix.in
# ==============================================================================

DOMAIN="api.elektrix.in"
EMAIL="adarsh2001gop@gmail.com"
WEBROOT_PATH="/var/www/certbot"

echo "=== [1/4] Installing certbot dependencies ==="
if ! command -v certbot &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y certbot
else
    echo "Certbot is already installed."
fi

# Ensure webroot challenge directory exists on the host
sudo mkdir -p "$WEBROOT_PATH"
sudo chown -R ubuntu:ubuntu "$WEBROOT_PATH"

echo "=== [2/4] Verifying DNS resolution for $DOMAIN ==="
# Attempt a local resolve check
if ! host "$DOMAIN" > /dev/null 2>&1; then
    echo "WARNING: DNS for $DOMAIN does not resolve yet."
    echo "Let's Encrypt challenge might fail if propagation is not complete."
    echo "Proceeding anyway..."
fi

echo "=== [3/4] Requesting Let's Encrypt Certificate ==="
sudo certbot certonly --webroot \
    -w "$WEBROOT_PATH" \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --keep-until-expiring \
    --non-interactive

echo "=== [4/4] Reloading Nginx Container to Apply Certificates ==="
docker compose -f /opt/elektrix/compose.prod.vm1.yaml exec -T nginx nginx -s reload

echo "=== SSL setup completed successfully for $DOMAIN ==="

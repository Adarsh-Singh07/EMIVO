#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# ELEKTRIX — TLS certificate automation (Let's Encrypt, webroot)
# Covers: api.elektrix.in, elektrix.in (+www), admin.elektrix.in
#
# For domains whose DNS does not point at this VPS yet, a self-signed
# placeholder is installed so nginx can serve; re-run this script after the
# DNS change to replace placeholders with real certificates.
# ==============================================================================

EMAIL="adarsh2001gop@gmail.com"
WEBROOT_PATH="/var/www/certbot"
LE_DIR="/etc/letsencrypt"

echo "=== [1/5] Installing certbot if needed ==="
if ! command -v certbot &> /dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y -qq certbot openssl
fi

sudo mkdir -p "$WEBROOT_PATH"
sudo chown -R ubuntu:ubuntu "$WEBROOT_PATH"

self_signed() {
    local domain="$1"
    local dir="$LE_DIR/live/$domain"
    if sudo test -f "$dir/fullchain.pem"; then
        return 0  # already has something
    fi
    echo "  -> installing self-signed placeholder for $domain"
    sudo mkdir -p "$dir"
    sudo openssl req -x509 -nodes -newkey rsa:2048 -days 90 \
        -keyout "$dir/privkey.pem" -out "$dir/fullchain.pem" \
        -subj "/CN=$domain" >/dev/null 2>&1
}

issue() {
    local domain="$1"
    echo "=== Requesting certificate for $domain ==="
    if sudo certbot certonly --webroot -w "$WEBROOT_PATH" -d "$domain" \
        --email "$EMAIL" --agree-tos --no-eff-email \
        --keep-until-expiring --non-interactive; then
        echo "  -> OK ($domain)"
        return 0
    fi
    echo "  -> FAILED ($domain) — DNS may not point here yet; using placeholder"
    self_signed "$domain"
    return 1
}

FAILED=0
for domain in api.elektrix.in elektrix.in www.elektrix.in admin.elektrix.in; do
    issue "$domain" || FAILED=1
done

# www shares the elektrix.in cert (SAN); symlink if certbot made a separate one
if sudo test -d "$LE_DIR/live/www.elektrix.in"; then
    echo "www.elektrix.in has its own lineage — leaving it in place"
fi

echo "=== [5/5] Reloading nginx ==="
docker compose -f /opt/elektrix/compose.prod.vm1.yaml exec -T nginx nginx -s reload 2>/dev/null || true

if [ "$FAILED" = "1" ]; then
    echo "NOTE: some domains used placeholders. Point their DNS A records at this"
    echo "VPS (161.118.254.169), then re-run: bash infra/scripts/setup_ssl.sh"
else
    echo "All certificates installed."
fi

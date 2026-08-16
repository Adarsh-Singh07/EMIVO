# ELEKTRIX — DNS & Edge Configuration (v0.2)

Managed in Cloudflare (zone: elektrix.in). **No Cloudflare credentials exist on
the VPS** — DNS changes must be made in the Cloudflare dashboard.

## Current state (2026-08-16)

| Record | Type | Target | Status |
|---|---|---|---|
| api.elektrix.in | A | 161.118.254.169 (direct, not proxied) | ✅ LIVE — API on VPS |
| elektrix.in | A | 64.29.17.65 / 216.198.79.65 (Vercel) | ⚠️ stale v0.1 storefront |
| www.elektrix.in | A (proxied) | Cloudflare → redirect to elektrix.in | ✅ |
| admin.elektrix.in | — | **NO RECORD** | ❌ |
| media.elektrix.in | CNAME | Cloudflare R2 public bucket | ✅ (product images) |
| sell.elektrix.in | — | none | future v1.1 |

## REQUIRED CHANGE for v0.2 launch (owner action, ~2 minutes)

In Cloudflare → DNS:

1. **elektrix.in**: change the A record to `161.118.254.169` (DNS only / grey
   cloud recommended initially so Let's Encrypt webroot works; orange-cloud
   proxying can be enabled afterwards).
2. **admin.elektrix.in**: create A record → `161.118.254.169` (DNS only).
3. On the VPS: `bash /opt/elektrix/infra/scripts/setup_ssl.sh` — replaces the
   self-signed placeholders with real Let's Encrypt certificates for both
   domains (nginx reloads automatically).
4. Verify: `curl -sI https://elektrix.in` (expect 200 from ELEKTRIX nginx) and
   open `https://admin.elektrix.in` (admin login page).

Until steps 1-2, Vercel keeps serving the OLD static storefront; the new
storefront and admin console run on the VPS and become reachable the moment
DNS flips.

## SSL

- Let's Encrypt via certbot webroot (`/.well-known/acme-challenge/` served by
  the nginx container for every host).
- `setup_ssl.sh` issues/renews for api, elektrix.in, www, admin; installs
  self-signed placeholders when a domain's DNS has not moved yet.
- Renewal: `certbot.timer` (systemd). The legacy renewal config for
  `api.elektrix.in` was corrupt (0-byte conf + dangling `-0001` lineage);
  verify health with `sudo certbot renew --dry-run` after launch.

## Vercel cleanup (after DNS switch + verification)

The Vercel project serving the old storefront can be paused/deleted once
elektrix.in points at the VPS.

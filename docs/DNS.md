# ELEKTRIX — DNS & Cloudflare Configuration

This document specifies the authoritative DNS record setup and Cloudflare security variables required for the production deployment of **ELEKTRIX**.

**Official Domain:** https://elektrix.in  

---

## 1. Cloudflare DNS Settings

Cloudflare is the authoritative DNS manager for the zone `elektrix.in`. DNS management must **not** be migrated to Vercel. 

### A. SSL/TLS Encryption Mode
- **SSL Mode:** **Full (Strict)**.  
- **Rationale:** Guarantees end-to-end encryption. Cloudflare enforces HTTPS at the edge, and Nginx on the Oracle VPS terminates with verified Let's Encrypt SSL certificates (for `api.elektrix.in`). Self-signed or unencrypted origin connections are rejected.

### B. Required DNS Records Table

Below is the canonical list of DNS records to be created in the Cloudflare dashboard.

| Type | Name | Content / Target | Proxy Status | Rationale |
|---|---|---|---|---|
| **CNAME** | `@` (Apex) | `cname.vercel-dns.com` | **DNS Only (Grey)** | Storefront apex routing to Vercel. (Must be DNS Only or use CNAME flattening). |
| **CNAME** | `www` | `cname.vercel-dns.com` | **Proxied (Orange)** | Main customer storefront domain. |
| **CNAME** | `admin` | `cname.vercel-dns.com` | **Proxied (Orange)** | Platform operator administrative portal. |
| **CNAME** | `sell` | `cname.vercel-dns.com` | **Proxied (Orange)** | Business/seller management portal. |
| **A** | `api` | `<Oracle_VPS_Public_IP>` | **Proxied (Orange)** | API Backend routed to the Oracle VPS. |
| **TXT** | `_vercel` | `vc-domain-verify=...` | **DNS Only (Grey)** | Verification record issued by Vercel for domain ownership. |

---

## 2. API Traffic Caching Rules

Authenticated e-commerce transactions and administrative actions must never be cached at the Cloudflare Edge.

- **Cloudflare Cache Bypass Rule:**
  - **Match:** `https://api.elektrix.in/*`
  - **Settings:** Cache Level: **Bypass**, Edge Cache TTL: `0`.
- **Browser Headers:** The FastAPI backend sends explicit HTTP response headers to prevent intermediate caches from saving state:
  ```http
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0
  ```

---

## 3. WAF & Rate Limiting Strategy

Cloudflare WAF is configured to protect the stateful Oracle VPS backend:
- **Rate Limit Rule:** Blocks client IPs exceeding **100 requests per minute** on API endpoints (`api.elektrix.in/api/v1/*`), except for checkout and webhook callbacks (where lower bursts are permitted with strict IP validity).
- **SSL Minimum Version:** Restricted to **TLS 1.2** and **TLS 1.3** to maintain modern cryptographical standards.
- **DNSSEC:** Enabled in the Cloudflare registrar settings to prevent DNS cache poisoning.

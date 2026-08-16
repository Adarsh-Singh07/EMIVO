# ELEKTRIX — Security Policy & Guidelines

This document specifies the security requirements, CORS settings, database RLS constraints, and secret management guidelines for **ELEKTRIX**.

**Official Domain:** https://elektrix.in  

---

## 1. CORS (Cross-Origin Resource Sharing)

To prevent cross-site request forgery and unauthorized data leaks, the FastAPI backend restricts CORS explicitly. **Wildcard configurations (`CORS *`) are strictly prohibited in production.**

### Authorized Production Origins
The FastAPI server is configured via root `.env` environment variables to only respond to the following origins:
- `https://elektrix.in`
- `https://www.elektrix.in`
- `https://admin.elektrix.in`
- `https://sell.elektrix.in`

---

## 2. Token Storage & Authentication Transport

ELEKTRIX handles session authentication using header-based JWT transport with client-side cookie persistence:
- **Authorization Header**: Client applications manually read tokens from local storage/cookies and attach them as `Authorization: Bearer <access_token>` headers. This prevents standard cross-site request forgery (CSRF) vulnerabilities as the browser does not automatically send authentication state with requests.
- **Cookie Persistence**: Tokens are stored in browser cookies on the client side with `SameSite=Lax` and path restrictions, allowing session sharing across the domain.
- **Token Rotation**: Refresh tokens are checked against a Redis token family blacklist to detect and block token replay attacks.

---

## 3. Database Isolation (Row Level Security)

RLS acts as our final gatekeeper to isolate multi-tenant data in Supabase:
- **Role Enforcement:** All API connections run under the unprivileged role `emivo_app`. This role has explicitly limited tables permissions and is prohibited from bypassing RLS (`NOBYPASSRLS`).
- **Context Injection:** When an API request is initialized, FastAPI executes `SET LOCAL ROLE emivo_app` and sets context variables:
  ```sql
  SET LOCAL app.business_id = 'current_business_uuid';
  SET LOCAL app.user_id = 'current_user_uuid';
  ```
- **RLS Policy Example:**
  ```sql
  ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Tenant isolation for products" ON public.products
    FOR ALL USING (business_id = NULLIF(current_setting('app.business_id', true), '')::text);
  ```

---

## 4. Secret & Environment Management

### Separation of Secrets
Secrets are divided by visibility scope to prevent exposure to frontend bundles:

1. **Frontend Scope (Vercel)**
   - Only non-sensitive variables prefixed with `NEXT_PUBLIC_` are configured in Vercel.
   - Example: `NEXT_PUBLIC_API_URL=https://api.elektrix.in/api/v1`

2. **Backend Scope (Oracle VPS Env)**
   - All server-side keys are stored on the VPS host system filesystem inside `.env`.
   - Never committed to git repositories.
   - Excluded via `.gitignore`.
   - Includes:
     - `DATABASE_URL` (direct connection string to Supabase)
     - `JWT_SECRET` (used for key generation and validation)
     - `R2_SECRET_ACCESS_KEY` (Cloudflare R2 Object Storage credentials)
     - `RAZORPAY_KEY_SECRET` (Payment processor private credentials)

---

# v0.2 Security Update (2026-08-16)

## What changed in v0.2

### Fixed vulnerabilities
- **Unauthenticated business CRUD** (`/api/v1/businesses`) — now staff-only (it
  had created 127 junk tenants in production).
- **Header-spoofable tenant** (`x-business-id` on `/api/v1/settings`) — now
  derived from the authenticated session only.
- **Cart IDOR** — carts are now owner-scoped (user match or guest session
  token) at the router AND in RLS.
- **Order IDOR** — customers can only read/list their own orders (RLS policy
  + service ownership checks); staff bypass via `app.role` GUC.
- **Payment amount tampering** — client amounts are validated against the
  server-computed order total; totals always recomputed at checkout.
- **RLS gaps** — `payment_events` protected; `users` SELECT scoped to
  self/staff/anonymous-login-flow; new v0.2 tables owner-scoped.
- **SQL-injection-shaped set_config** — GUC binding now uses bound parameters.
- **Hardcoded Supabase password** removed from `apply_rls.py` (was in git
  history — rotate that password; see Known Issues).

### New protections
- Redis fixed-window rate limiting (login/register/reset/coupon/checkout/
  newsletter/search/webhook) — fails open if Redis is down.
- Password reset flow (single-use 30-min Redis tokens, no user enumeration,
  revoke-all-sessions on reset) + change-password endpoint.
- Request-ID middleware on every response (`X-Request-ID`).
- Security headers + CSP (Razorpay-scoped) at nginx; admin portal `noindex`.
- Webhook signature verification (HMAC-SHA256) + Redis event-id dedup.
- Refresh-token family replay detection (pre-existing, retained).

### Known & accepted risks (v0.2)
- **JWTs in JS-readable cookies** (not httpOnly) — mitigated by 15-min access
  tokens, refresh rotation w/ replay detection, CSP, and rate limiting.
  httpOnly-cookie migration is the top security item for v0.3.
- **JWT role claims go stale** until re-login (max 15 min impact window for
  access tokens; roles re-read at every refresh).
- `outbox_events` RLS is intentionally permissive (`USING(true)`) — contains
  no secrets beyond order metadata; worker-only access in practice.
- Email verification not enforced at registration (v0.3).

## Secrets

Only in VPS `.env` (never in git): DATABASE_URL, JWT_SECRET, RAZORPAY_* (live),
R2_*, RESEND_API_KEY. `SENTRY_DSN` empty (optional). Rotate the Supabase DB
password (see DNS.md known issues / git history leak).

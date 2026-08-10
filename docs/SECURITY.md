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

## 2. Cookie Security Configuration

ELEKTRIX handles session authentication utilizing cookie-based JWT transport:
- **`HttpOnly`**: Access and refresh token cookies must be marked `HttpOnly` to block client-side scripts from reading the payload.
- **`Secure`**: Enforces SSL usage. Cookies are never transmitted over unencrypted HTTP.
- **`SameSite`**: Set to **`Lax`** or **`Strict`**. Prevents CSRF attacks during navigation from third-party links.

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

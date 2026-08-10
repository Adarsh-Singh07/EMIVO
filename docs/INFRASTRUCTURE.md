# ELEKTRIX Infrastructure & Topology

Official Domain: https://elektrix.in  
Historical Note: Formerly named EMIVO during initial scaffold phase.

This document details the canonical production and local infrastructure for ELEKTRIX. Local mocks, simulated responses, or fake repositories are **strictly prohibited**.

---

## 1. Oracle VPS Architecture

- **Environment:** Oracle Cloud Infrastructure (ARM Ampere VPS).
- **Topology:** Production services run inside Docker containers orchestrated by `compose.prod.vm1.yaml`.
- **Services:**
  - `api`: FastAPI application container (`0.0.0.0:8000`).
  - `web`: Next.js frontend application (`0.0.0.0:3000`).
  - `workers`: ARQ background worker for background tasks and outbox processing.
- **Reverse Proxy:** NGINX or Cloudflare Tunnel managing SSL termination and routing requests to Docker ports.

---

## 2. PostgreSQL & Supabase Setup

- **Database Provider:** Supabase PostgreSQL with `pgvector` enabled.
- **Connection Strategy:**
  - `postgresql+asyncpg://`: High-performance asynchronous connection pooling for FastAPI (port 6543 / Supavisor pooler).
  - `postgresql://`: Direct DSN used by Alembic for schema migrations (port 5432).
- **RLS & Security Role Mechanics:**
  - Application sessions connect as `postgres` (superuser), but `apps/api/core/database.py` immediately issues `SET LOCAL ROLE emivo_app`.
  - The `emivo_app` database role is configured with `NOBYPASSRLS` (`db/rls/00_app_role.sql`).
  - Request middleware / dependencies invoke `set_db_context()` to execute `SET LOCAL app.business_id = '...'` and `SET LOCAL app.user_id = '...'`.
  - Database Row Level Security policies (`db/rls/*.sql`) filter rows dynamically based on `current_setting('app.business_id')`.

---

## 3. Redis Topology

- **Role:** Centralized in-memory store for sessions, authentication token state, and background task queues.
- **Use Cases:**
  - **Auth Refresh Tokens:** Opaque refresh token family tracking. Replay attempts revoke the entire token family instantly.
  - **Rate Limiting:** Sliding-window rate limit checks per IP / user.
  - **Background Queues:** ARQ job queue storage (`apps/workers/`).
  - **Event Streams:** Outbox and analytics event buffers.

---

## 4. Cloudflare R2 Object Storage

- **Role:** Canonical object storage for product images, business logos, user avatars, and invoice attachments.
- **Bucket Layout:** Standardized key structure (`businesses/{business_id}/products/{product_id}/{filename}`).
- **Upload Pattern:**
  1. Client requests a pre-signed PUT URL from `/api/v1/media/presigned-url`.
  2. Client uploads file directly to Cloudflare R2.
  3. Client calls backend to register the media URL reference.

---

## 5. Environment Variables Reference

| Variable | Description | Example / Required Format |
|---|---|---|
| `ENV_NAME` | Runtime environment name | `local`, `staging`, `prod` |
| `DATABASE_URL` | Asyncpg PostgreSQL pooler DSN | `postgresql+asyncpg://user:pass@host:6543/postgres` |
| `SYNC_DATABASE_URL` | Direct PostgreSQL migration DSN | `postgresql://user:pass@host:5432/postgres` |
| `REDIS_URL` | Redis DSN | `redis://localhost:6379/0` |
| `JWT_SECRET` | Secret key for signing JWTs | 32+ byte cryptographically secure string |
| `JWT_ALGORITHM` | Algorithm for JWT signatures | `HS256` |
| `JWT_EXPIRATION_MINUTES` | Access token TTL | `15` |
| `REFRESH_TOKEN_EXPIRATION_DAYS` | Refresh token TTL | `30` |
| `R2_ACCOUNT_ID` | Cloudflare account ID | Cloudflare Account Identifier |
| `R2_ACCESS_KEY_ID` | R2 API access key | S3-compatible Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API secret key | S3-compatible Secret Access Key |
| `R2_BUCKET_NAME` | R2 bucket identifier | `elektrix-media-prod` |
| `RAZORPAY_KEY_ID` | Razorpay payment API key | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay payment secret | API Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification key | Webhook Secret String |

---

## 6. Backup & Recovery Strategy

- **Database:** Supabase automated daily backups and Point-In-Time Recovery (PITR).
- **Object Storage:** Cloudflare R2 multi-region replication.
- **Application Configuration:** Version-controlled in Git repository.

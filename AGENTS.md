# ELEKTRIX Coding Agent Rules
**Official Domain:** https://elektrix.in  
**Current Architecture:** Modular Monolith — Storefront Next.js (port 3000), Admin Dashboard Next.js (`admin`, port 3001), FastAPI Backend (`apps/api`, port 8000).  
**Current Milestone Status:** ✅ **ELEKTRIX Internal Release v0.1 Milestone COMPLETE** (Quality Gate PASSED — Frontend + Backend integration verified, 0 TypeScript errors, 14/14 backend tests PASSED).  
*(Historical Note: Formerly named EMIVO during initial scaffold phase)*

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
<!-- BEGIN:antigravity-infrastructure-rules -->
## Existing Infrastructure (Already Provisioned)

**IMPORTANT**
The following infrastructure is **already created and configured**.
Do **NOT** replace it with local alternatives or mock implementations.

### Supabase
Supabase is our **official production database**.
It already exists and must be used for:
* PostgreSQL
* Row Level Security (RLS)
* Authentication (where applicable)
* pgvector
* Database migrations
* AsyncPG connections
* Alembic migrations

Every module must use the real Supabase database.
Do **NOT** create SQLite fallbacks for production code.
Do **NOT** create fake repositories.
Do **NOT** return mock JSON.
Every CRUD operation must execute against the real database.

For every completed module:
* Verify migrations apply successfully.
* Verify tables exist.
* Verify indexes exist.
* Verify foreign keys.
* Verify RLS policies.
* Verify real CRUD operations.
* Verify async transactions.
* Verify rollback behavior.
* Verify repository -> service -> router flow.

### Cloudflare R2
Cloudflare R2 is our **official object storage**.
It already exists.
Every module requiring media must use R2.

### Redis
Redis already exists.
Do **NOT** simulate Redis.

### Docker
Docker is already configured.
Every service must run inside Docker.
Verify every change using Docker.
Never assume something works because it compiles.

### Testing Requirements
Every feature must be tested against the **real infrastructure**.
Not mocks. Not placeholders.

### No Mock Policy
Unless explicitly instructed:
? No mocked APIs
? No fake tokens
? No dummy JSON
? No hardcoded responses
? No placeholder repositories
? No simulated uploads
? No simulated authentication
Everything should use the actual infrastructure that has already been provisioned.

### Definition of "Complete"
A module is **NOT** complete because:
* TypeScript passes
* Pytest passes
* Docker builds

A module is only complete when:
* Frontend works
* Backend works
* Supabase stores real data
* Cloudflare R2 stores real files (if applicable)
* Redis works
* Docker works
* Health checks pass
* CRUD operations are verified
* Documentation is updated
Only then may the module be marked as **Production Ready**.
<!-- END:antigravity-infrastructure-rules -->

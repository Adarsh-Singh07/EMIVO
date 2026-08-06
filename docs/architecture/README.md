# EMIVO — Production Architecture

Complete design for the EMIVO AI-powered e-commerce SaaS: multi-tenant from day one,
near-zero infrastructure cost at MVP, and a migration path to Kubernetes / many
microservices **without rewriting business logic**.

Every decision is justified with **Why / Alternatives / Trade-offs / Migration path**.
The two headline calls (made and approved up front) are:

1. **Modular monolith, not microservices** — one API process with strictly isolated
   modules communicating over an event bus + transactional outbox. Each module maps
   1:1 to a future microservice. See `03-backend-and-project-structure.md`.
2. **pgvector first, Qdrant later** — vector search ships on the Postgres you already
   use (Supabase), behind a `VectorStore` interface so Qdrant is a config swap when
   vector scale demands it. See `06-search-and-workers.md`.

## Document map

| # | File | Covers (your requested deliverables) |
|---|------|--------------------------------------|
| 00 | [Executive overview & decision log](00-executive-overview.md) | Critical review of the plan, decision log, topology, memory/cost budget |
| 01 | [Infrastructure & network](01-infrastructure-and-network.md) | 1. Infrastructure Architecture · 2. Network Architecture |
| 02 | [Docker & Nginx](02-docker-and-nginx.md) | 3. Docker Architecture · Nginx/HTTPS |
| 03 | [Backend & project structure](03-backend-and-project-structure.md) | 4. Folder Structure · 5. Backend Architecture |
| 04 | [Database design](04-database-design.md) | 6. Database Architecture |
| 05 | [AI & Voice](05-ai-and-voice.md) | 7. AI Architecture |
| 06 | [Search & background workers](06-search-and-workers.md) | Search, recommendation, background tasks |
| 07 | [Security & observability](07-security-and-observability.md) | 9. Security Architecture · 10. Monitoring Architecture |
| 08 | [CI/CD & deployment](08-cicd-and-deployment.md) | 8. Deployment Architecture · 11. CI/CD Architecture |
| 09 | [DR, scaling & cost](09-dr-backups-scaling-cost.md) | 12. Disaster Recovery · 13. Scaling 500→100k+ · 14. Cost Optimization |
| 10 | [Implementation roadmap](10-roadmap.md) | 15. Step-by-step roadmap |

## Where this repo stands today

The repository is currently the **storefront only** (Next.js 16 on Vercel, static
catalog in `lib/products.ts`, product images served from GitHub raw). The platform
backend, Docker, CI/CD, and nginx do **not exist yet** — this document set designs them
from scratch. The frontend's product layer is already structured to swap static data
for API calls without changing shape (`lib/products.ts` → `fetch(/api/products/...)`).

## Non-negotiables (from product owner)

- **No PostgreSQL on the VPS.** Database is Supabase Postgres; the VPS runs only app
  services.
- **Images are URLs, never BLOBs.** R2 / Oracle Object Storage / external URLs, all
  supported by one storage layer.
- **No local LLM inference.** Gemini / Groq / Deepgram / OpenRouter behind an AI
  abstraction; provider is config-only.
- **Voice AI is separate** from the backend, on its own VM.
- **Multi-tenant from day one.** All tenant data carries `business_id`.
- **Scale to millions of products / many microservices later without rewriting code.**

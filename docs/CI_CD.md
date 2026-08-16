# ELEKTRIX — CI/CD Pipeline

This document describes the automated Continuous Integration and Continuous Deployment (CI/CD) pipelines configured for the **ELEKTRIX** project.

**Official Domain:** https://elektrix.in  

---

## 1. Pipeline Overview

The pipeline guarantees that code pushed to Git is fully validated, type-checked, built, and tested before it reaches the production environment.

```
                  Git Push (main branch)
                            ↓
                    [ GitHub Actions ]
                            ↓
    ┌───────────────────────┼───────────────────────┐
    ▼                       ▼                       ▼
[ Docker Validate ]   [ Backend Tests ]   [ Frontend Builds ]
(compose files)        (typecheck & py)    (Storefront & Admin)
    │                       │                       │
    └───────────────────────┼───────────────────────┘
                            ▼
              All CI Checks Successful? (GREEN)
                            ↓
       ┌────────────────────┴────────────────────┐
       ▼                                         ▼
[ Vercel Deployment ]                  [ VPS SSH Deployment ]
  ├── elektrix.in                        └── api.elektrix.in
  ├── admin.elektrix.in                      (deploy_vps.sh)
  └── sell.elektrix.in
```

---

## 2. GitHub Actions Workflows

We configure two specialized workflows inside `.github/workflows/`:

### A. CI Validation Pipeline (`ci.yml`)
Runs automatically on every `push` and `pull_request` targeting the `main` branch.
- **Docker Compose Validation:** Validates `compose.dev.yaml` and `compose.prod.vm1.yaml` schema structures via `docker compose config`.
- **Backend Verification:** Validates environment dependencies using Python 3.12.
- **Storefront Compilation:** Installs packages, validates TypeScript type safety via `tsc --noEmit`, and compiles the production Next.js storefront package.
- **Admin Portal Compilation:** Checks workspace packages and compiles the Next.js admin dashboard application.

### B. Oracle VPS CD Pipeline (`deploy-vps.yml`)
Triggers automatically only upon a successful `push` or merge to the `main` branch.
- **SSH Credentials:** Uses encrypted GitHub repository secrets (`VPS_SSH_HOST`, `VPS_SSH_USER`, `VPS_SSH_KEY`).
- **Execution:** Connects via SSH to the VPS, checks out the codebase, and runs the safe rollback deployment script (`infra/scripts/deploy_vps.sh`).

---

## 3. Vercel Auto-Deployment Integration

Vercel is linked directly to the GitHub repository for hosting the static Next.js frontend pages.

### Projects & Routing

1. **Project 1: Storefront**
   - **Repository Root:** `/`
   - **Production Domain:** `elektrix.in` (and alias `www.elektrix.in`)
   - **Production Branch:** `main`

2. **Project 2: Admin & Seller Portals**
   - **Repository Root:** `apps/web`
   - **Production Domains:** `admin.elektrix.in`, `sell.elektrix.in` (mapped to the same Vercel project deployment in v0.1 as domain aliases)
   - **Production Branch:** `main`

### Environment Variable Scope
Each Vercel project has the following environment variables configured inside the Vercel dashboard:
- **`NEXT_PUBLIC_API_URL`**:
  - Production Value: `https://api.elektrix.in/api/v1`
  - Preview/Branch Value: `https://api.elektrix.in/api/v1`
  - Development Value: `http://localhost:8000/api/v1`

---

# v0.2 CI/CD (2026-08-16)

- **ci.yml** (push/PR → main): compose config validation · **backend
  integration suite** (`scripts/run_backend_tests.sh` — builds the API image,
  boots scratch Postgres+Redis, migrates, applies RLS, seeds, runs pytest) ·
  storefront typecheck+build · admin typecheck+build.
- **deploy-vps.yml**: triggered by SUCCESSFUL CI completion (`workflow_run`),
  SSHes to the VPS and runs `infra/scripts/deploy_vps.sh` (which owns backup,
  migrate, RLS, rollout, smoke, rollback).
- Rollback: automatic on smoke failure (code+containers); DB is additive-only
  (docs/ROLLBACK.md).
- Images are built on the VPS from git (no registry dependency).

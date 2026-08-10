# ELEKTRIX — Deployment Playbook

This document outlines the deployment instructions and container layout for the **ELEKTRIX** backend.

**Official Domain:** https://elektrix.in  

---

## 1. Prerequisites

Before starting the deployment, verify the target environment (Oracle ARM VPS) has the following prerequisites configured:
1. **Docker Engine:** Version 25+ installed.
2. **Docker Compose:** Version 2.20+ installed.
3. **SSL Certificates:** Let's Encrypt certificates provisioned for `api.elektrix.in` under `/etc/letsencrypt/`.
4. **Environment File (`.env`)**: Populated at the repository root on the VPS with production database, Redis, Cloudflare R2, and payment secrets.

---

## 2. Docker Compose Production Configuration

Production deployment utilizes the validated `compose.prod.vm1.yaml` file:

- **Replicated API Instances:** The `api` service runs with 2 replicas behind Nginx for zero-downtime rolling updates.
- **Private Redis Service:** Redis does not expose any host ports. Only internal docker network containers can resolve `redis:6379`.
- **Nginx Termination:** Nginx binds to host ports `80` and `443` and mounts the Certbot certificates dynamically.

```yaml
services:
  api:
    image: ghcr.io/elektrix/api:latest
    deploy:
      replicas: 2
      update_config:
        order: start-first
        delay: 10s
        failure_action: rollback
    # ...
```

---

## 3. Step-by-Step Deployment Playbook

### Step 1: Establish SSH Connection
Connect to the production VPS server:
```bash
ssh -i /path/to/ssh_key.key ubuntu@api.elektrix.in
```

### Step 2: Retrieve Latest Repository State
Navigate to the application folder and fetch the main branch:
```bash
cd /app/elektrix
git fetch origin main
git reset --hard origin/main
```

### Step 3: Run Deployment Runner
Execute the automated validation and deployment script:
```bash
bash infra/scripts/deploy_vps.sh
```

This script will automatically:
1. Perform configuration checks.
2. Pull the latest Docker images.
3. Run Alembic schema migrations against Supabase.
4. Spin up replicated FastAPI containers.
5. Query `/health/live` to verify live status.
6. Reload Nginx without drop in active client connections.
7. Trigger automatic rollback to the previous commit if health checks fail.

---

## 4. Manual Database Migration Verification
To run Alembic migrations manually or troubleshoot schemas, execute:
```bash
# Verify pending migrations
docker compose -f compose.prod.vm1.yaml run --rm api alembic current

# Run upgrade to head
docker compose -f compose.prod.vm1.yaml run --rm api alembic upgrade head
```

---

## 5. Directory Locations & Troubleshooting
- **Production Logs:** `/var/log/nginx/` on host or:
  ```bash
  docker compose -f compose.prod.vm1.yaml logs -f api
  docker compose -f compose.prod.vm1.yaml logs -f nginx
  ```
- **System Service Directories:**
  - Workspace: `/app/elektrix`
  - Nginx Config: `/app/elektrix/infra/nginx/nginx.conf`
  - Docker Compose: `/app/elektrix/compose.prod.vm1.yaml`

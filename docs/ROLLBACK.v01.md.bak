# ELEKTRIX — Rollback Procedures

This document details the contingency rollback playbooks in the event of production deployment failures.

**Official Domain:** https://elektrix.in  

---

## 1. Application & Docker Rollback (Oracle VPS)

If the FastAPI service fails its container health checks during deployment, the automated script `deploy_vps.sh` initiates a rollback immediately.

### Manual VPS Container Rollback
If a critical runtime error is discovered after deployment verification, execute the following manual rollback steps:

1. **Revert Git Repository to Last Stable Commit:**
   ```bash
   cd /opt/elektrix
   # Revert head
   git reset --hard HEAD~1
   ```
2. **Rebuild / Re-run Previous Containers:**
   ```bash
   docker compose -f compose.prod.vm1.yaml up -d --build --remove-orphans
   ```
3. **Reload Nginx Configuration:**
   ```bash
   docker compose -f compose.prod.vm1.yaml exec -T nginx nginx -s reload
   ```

---

## 2. Database Migration Rollback Limitations

> [!CAUTION]  
> Database migrations must **never** be rolled back automatically in production. Reverting database tables schemas can result in irreversible data loss.

### Alembic Rollback Playbook
1. Check the active revision:
   ```bash
   docker compose -f compose.prod.vm1.yaml run --rm api alembic current
   ```
2. Revert the database schema to the previous revision manually (if data integrity is verified):
   ```bash
   # Upgrade down to target revision
   docker compose -f compose.prod.vm1.yaml run --rm api alembic downgrade <previous_revision_id>
   ```

---

## 3. Frontend Vercel Rollback

Vercel provides instant static rollback capabilities through its dashboard and CLI.

### Dashboard Rollback
1. Navigate to the **Vercel Project Dashboard** (Storefront, Admin, or Seller).
2. Go to the **Deployments** tab.
3. Locate the last verified stable build.
4. Click the options menu (three dots) and select **Instant Rollback**.
5. Confirm the rollback. The deployment will point back to the selected Git SHA immediately.

---

## 4. DNS Rollback (Cloudflare)

In the event of network outages or routing failures:
- **Proxy Status Toggle:** Switch the API DNS record (`api.elektrix.in`) to **DNS Only (Grey)** to bypass Cloudflare caching/routing layers and check host accessibility directly.
- **Apex CNAME Pointing:** To redirect customer storefront traffic to a static maintenance page during major downtime, point the CNAME `@` record to a pre-configured backup S3 bucket or Cloudflare Pages static fallback.

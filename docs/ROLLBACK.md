# ELEKTRIX — Rollback Procedures (v0.2)

## Deployment rollback (code)

`infra/scripts/deploy_vps.sh` automatically rolls back on smoke-test failure:
it resets to the previous commit and re-creates containers. Manual equivalent:

```bash
cd /opt/elektrix
git reset --hard <known-good-sha>
SKIP_PULL=1 bash infra/scripts/deploy_vps.sh
```

The database is NOT auto-reverted: v0.2 migrations are additive-only (new
tables + nullable/defaulted columns), so the previous API version keeps
working on the new schema.

## Database rollback

Backups (pg_dump custom format) are written before every deploy to
`backups/pre_deploy_<ts>.dump`, plus manual snapshots.

```bash
# Restore a full backup (destructive — replaces current DB state)
export PGPASSWORD='<password from .env SYNC_DATABASE_URL>'
docker run --rm -e PGPASSWORD -v /opt/elektrix/backups:/backups postgres:17-alpine \
    pg_restore --no-owner --no-privileges -h <host> -U postgres -d postgres \
    --clean --if-exists /backups/<file>.dump
```

Schema-only step-back (additive changes are safe to drop while old code runs):

```bash
docker compose -f compose.prod.vm1.yaml run --rm api alembic downgrade 40a4b12c8e1d
```

Rehearsal evidence: the v0.2 migration was upgrade+downgrade+re-upgrade tested
against a restored copy of production data before first deployment.

## Application-level rollback (single service)

```bash
docker compose -f compose.prod.vm1.yaml up -d --no-deps --force-recreate api
docker compose -f compose.prod.vm1.yaml restart workers
```

## Emergency: take the storefront offline

```bash
docker compose -f compose.prod.vm1.yaml stop storefront   # nginx returns 502 for elektrix.in
docker compose -f compose.prod.vm1.yaml stop storefront admin
```

## Known-good states

| Date | Commit | Migration | Notes |
|---|---|---|---|
| 2026-08-11 | bb157254 | 40a4b12c8e1d | v0.1 production baseline (backup `pre_v02_20260816_173759.dump`) |

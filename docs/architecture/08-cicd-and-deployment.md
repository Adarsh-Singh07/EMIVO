# 08 — CI/CD & Deployment Architecture

## 1. Branch strategy

```text
demo (trunk)                      ← the working default today; treat as main
├── feature/*                     PRs into demo (worktree workflow for this repo)
│   └── requires: lint + typecheck + tests + build green, 1 review
├── releases/vX.Y.Z               cut from demo, tagged, promoted
└── hotfix/vX.Y.Z-branch          from tag, merged back to demo
```

- `demo` is **protected**: force-push banned, status checks required, deploy happens
  **on merge** (auto) and **on tag** (manual promote).
- Feature branches: short-lived; the existing **worktree delivery workflow** (edit →
  push `worktree-*:demo` → ff-merge → build-verify in the main checkout) slots in as
  the *developer loop*; CI adds the gate.
- **Environments:** `preview` (each PR → ephemeral Vercel preview + test stack),
  `staging` (merge → deploy to staging compose on the VMs), `production` (tag → prod).

**Why trunk + short branches:** smallest diff, fastest cadence, and your deploy
target is one monorepo. **Alternatives:** gitflow (overkill), release trains (heavy
for a 1–2 person build). **Trade-offs:** trunk needs discipline on status checks —
enforced by CI. **Migration path:** unchanged as the team grows.

## 2. Pipelines (GitHub Actions)

### 2.1 `ci.yaml` — on every PR / push (fast, < ~4 min)

```text
jobs:
  lint          → ruff + import-linter (module isolation gate) + mypy
  typecheck-web → npm run typecheck
  tests-api     → compose.test: pytest (unit + integration vs real pg/redis)
  build-images  → docker buildx (arm64+amd64), push to GHCR :pr-{sha} for preview
```

Path-filtered: web changes skip API jobs and vice-versa (monorepo economy).

### 2.2 `deploy.yaml` — on merge to `demo` + on tag

```text
on:
  push:
    branches: [demo]
    tags: ['v*']

jobs:
  build-push:
    - build + push all changed images → GHCR :{sha} and :{semver} (tag)

  deploy-api (VM1):                 # job runner: needs gh-actions on the VM, or SSH
    - ssh emivo@vm1 "docker compose -f …/compose.prod.vm1.yaml pull
       && docker compose up -d --no-deps --scale api=2 api"
    - migrate: run alembic expand migrations BEFORE, contract AFTER
       (guard: fail deploy if migration apply fails → rollback tag)
    - smoke-test: curl /healthz + /api/v1/health/ready on the new container

  deploy-ai-voice (VM2): same pattern for ai-gateway + voice
  deploy-web:         Vercel (git integration or `vercel --prod`)
```

### 2.3 Runner decision

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| GitHub-hosted + SSH deploy | zero maintenance, no VM exposure | can't reach a private VM without exposing SSH; pulls from GHCR over the internet | **chosen for prod** (SSH via deploy key, restricted) |
| Self-hosted runner on VM1 | builds/pulls locally, zero egress, can run compose directly | the VM is on the internet running your CI (hardening needed) | good later / for large images |

For MVP: GitHub-hosted runners push images to GHCR; VMs `docker compose pull` over
the internet. It is the least moving parts and keeps the VMs read-only for code.

**Secrets in GH:** `GH_PAT` (read packages on the VM), `SSH_PRIVATE_KEY` (deploy
key), `SUPABASE_*`, `R2_*`, `GEMINI_KEY`, `DEEPGRAM_KEY`, etc. — all encrypted.

## 3. Zero-downtime deployment (expand/contract)

The API runs **2 replicas** behind nginx (see `02`). Safe releases:

1. **Expand:** run `alembic upgrade` to add columns/tables (backward-compatible).
2. **Roll:** `docker compose up -d --no-deps api` — nginx drains old container once
   the new one passes `/health/ready`.
3. **Contract:** after both replicas run the new code, apply the follow-up migration
   (tighten constraints, drop deprecated columns) — as a second migration step.
4. **Rollback:** `docker compose up -d api:{previous-sha}` (image is immutable);
   if a DB migration already ran, use the `down` revision (tested in CI) or accept
   the additive state (it was designed backward-compatible).

**Why expand/contract:** rolling deploys mean two code versions live at once; a
drop-column migration on step 1 would break the old replica. This is the same
discipline as `04 §7`. **Alternatives:** downtime deploys (rejected), blue-green on a
12 GB box (heavy). **Trade-offs:** migrations come in pairs — CI enforces the pairing.

## 4. Deploy topology summary

```text
           ┌─────────────── GitHub Actions ───────────────┐
           │  CI: lint/test/build  ·  CD: push images     │
           └───────┬───────────────────┬──────────────────┘
                   │ GHCR pull         │ GHCR pull
                   ▼                   ▼
        VM1 (api · workers · redis)    VM2 (ai-gateway · voice)
        nginx :443/80                  nginx :443/80
```

No VM ever builds; no secrets reach CI logs; rollback is a tag swap.

## 5. Release & versioning

- **SemVer** tags (`v1.2.3`); GHCR images tagged `{sha}` + `{semver}`.
- A `CHANGELOG.md` auto-updated from conventional commits (release-please or manual
  — keep it manual at this stage).
- **Promotion rules:** only a passing `demo` → tag → prod. Never deploy straight to
  prod from a branch.

## 6. Secrets, configs & env across environments

| Env | Config source | Secrets | DB |
|---|---|---|---|
| preview (PR) | repo `.env.example` + PR env | GH secrets, throwaway | test Supabase project |
| staging | `.env.prod` on VM, staging overlay | staging keys | staging Supabase project |
| prod | `.env.prod` on VM, prod overlay | prod keys | prod Supabase project |

Never share a Supabase project between staging and prod. Schema drift between them is
caught by running `alembic upgrade head` in both.

## 7. Decision summary

| Decision | Choice | Why | Migration path |
|---|---|---|---|
| Branching | trunk (demo) + tags | small diffs, fast cadence | unchanged |
| CI | GH Actions, path-filtered | monorepo economy | unchanged |
| Images | GHCR, {sha}+{semver} | immutable + rollback | any registry |
| Deploy | SSH pull + compose up, 2 replicas | zero-downtime, no VM CI exposure | K8s rollout / self-hosted runners later |
| Migrations | expand/contract gated | rolling-safe | unchanged |
| Runners | GitHub-hosted + deploy key | least moving parts, VMs read-only | self-hosted runner when images get heavy |

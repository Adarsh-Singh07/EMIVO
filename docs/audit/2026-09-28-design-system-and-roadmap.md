# ELEKTRIX — Design System Specification (v0 draft, 2026-09-28)

Goal (brief §4): one ELEKTRIX identity across storefront and admin, without
inventing a new brand. The storefront already carries the intended identity:
near-black `neutral-950` surfaces with white text, emerald accent
(`emerald-600/700`) for primary actions and success states, amber/orange accent
in admin auth screens, rounded-xl/2xl geometry, Inter-scale typography.

## Brand tokens (extracted from live storefront UI)

| Token | Value | Usage |
|---|---|---|
| `--ex-ink` | neutral-950 (#0a0a0a) | Primary surfaces, headers, primary buttons |
| `--ex-surface` | white / neutral-50 | Page background, cards |
| `--ex-accent` | emerald-600 (#059669) | Primary CTAs, links, success, chat |
| `--ex-accent-warm` | amber-500→orange-600 gradient | Admin auth + highlights (keep as secondary brand accent) |
| `--ex-danger` | red-600 | Errors, destructive |
| `--ex-warning` | amber-600 | Stock warnings, network fallbacks |
| Radii | rounded-xl (inputs/buttons), rounded-2xl/3xl (cards) | consistent across storefront already |
| Type scale | text-xs → text-3xl, font-semibold for headings | matches current usage |

## Component contracts to unify (Phase 4 implementation)

1. **Button** — variants: primary (ink), accent (emerald), ghost, danger; sizes sm/md/lg; loading spinner state; disabled treatment. Storefront `Button` already exists — admin needs the same contract.
2. **Input/Select/Switch/Checkbox** — shared focus ring (`focus:ring-1` + border-darken), error text slot (`text-xs text-red-600`), helper slot.
3. **Card/Dialog/Drawer/Toast** — one shadow/elevation scale; toasts via sonner on both apps.
4. **Status colors** — order statuses (pending/paid/processing/shipped/delivered/cancelled) get one semantic mapping shared by storefront order cards and admin tables.
5. **Logo/wordmark/favicon** — single source in `storefront/public/branding` + `icons`; admin imports the same assets (currently duplicated styles in admin globals).
6. **Empty/loading/error states** — one `EmptyState`, one `Spinner`, one `ErrorState` component pair per app, identical visuals.

## Implementation approach

- Create `packages/ui-tokens` (CSS variables + Tailwind preset) consumed by both Next apps; migrate hardcoded palettes gradually (admin first — it diverges most).
- Keep admin's information architecture; only the visual layer unifies.
- EMIVO sweep: replace visible brand strings; preserve `emivo_app` role and repo/technical identifiers.
- Acceptance: side-by-side mobile screenshots of storefront + admin pass visual review; contrast meets WCAG 2.2 AA on all primary text/background pairs (axe-core in CI).

## Admin-only AI assistant — architecture outline (brief §10)

- **New module** `apps/api/modules/admin_assistant/`: router `/api/v1/admin/assistant/*`, service, scoped tools. Reuses the existing chatbot LLM plumbing (Agnes AI primary, Gemini fallback) but a fully separate system prompt, tool set and audit trail.
- **Authorization**: every request requires a valid access token with an admin-side role (owner/platform_admin/staff via BusinessMember) — enforced server-side in the router dependency, never in the UI. Customers get 404 (route not exposed in storefront bundles).
- **Tools (read-only first)**: `orders.search(filters)`, `orders.get(number)`, `inventory.low_stock(threshold)`, `products.lookup(query)`, `customers.search(email/phone, masked PII)`, `analytics.summary(range)`, `docs.search(query)` (searches this repo's docs/). Each tool = a typed function with allowlisted SQL through the existing RLS-scoped session; no raw SQL from the model, no shell.
- **Write actions (later phases)**: refund/coupon/broadcast drafting only; every mutation requires an explicit `confirmation_token` issued after the model presents a summary, plus audit-log rows (`admin_ai_actions`) and role checks. Hard rule: the assistant never mutates production directly; writes go through existing admin services that already enforce business rules.
- **Prompt-injection defenses**: catalog/docs content is quoted as data (never instructions); tool results are JSON, not prose-injected; system prompt pins refusal behavior; per-admin rate limits (reuse core ratelimit) + daily token budget + usage logging.
- **UI**: chat panel inside the admin dashboard shell (right-side drawer + full page), streaming responses, conversation history with 30-day retention, mobile-responsive per the shared design system.
- **Testing (brief §11)**: pytest suite for authz (customer token → 403/404), tool scoping (cross-tenant denial), injection fixtures, malformed tool args, rate limits; browser tests for streaming/errors/mobile.

## Quality gates — recommended stack (brief §13)

- **Playwright** (E2E + mobile emulation + traces) — chosen over BackstopJS for maintainability; visual regression via Playwright snapshots with reviewed baselines.
- **axe-core** via `@axe-core/playwright` for a11y in the same E2E runs.
- **Lighthouse CI** for perf/SEO/PWA budgets on the storefront.
- Backend: existing pytest suite (extended with assistant authz tests). All in GitHub Actions, pinned to the Docker scratch DB (CI cannot reach production — enforced by env allowlist guard).

## Phased roadmap

1. **Phase 4a — Quick defects** (D1, D3, D4, D8): parent-route 404s, support h1, admin copy, robots.
2. **Phase 4b — Design system** (tokens + admin unification + EMIVO sweep).
3. **Phase 4c — PWA service worker** (D2).
4. **Phase 5 — Admin AI assistant** (read-only tools → tested → write actions with confirmation+audit).
5. **Phase 6 — Quality gates** (Playwright+axe+LHCI in CI, payment matrix behind Easebuzz sandbox, staging env).
6. **Ongoing** — authenticated admin audit (needs credentials), physical-device PWA pass (needs devices).

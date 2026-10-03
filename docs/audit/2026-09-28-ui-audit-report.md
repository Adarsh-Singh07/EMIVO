# ELEKTRIX — UI Audit Report (Phase 2, 2026-09-28)

Mobile-first browser audit per the implementation brief. Method: programmatic
crawl of every public storefront route at 390×844 (horizontal overflow, broken
images, heading presence, auth gating) + manual visual inspection of key pages
(home, register, admin login, admin forgot-password) at mobile and desktop
widths. Screenshots from the live session are referenced by route; severe
findings reproduced twice.

## Verified working (no action needed)

- **Zero horizontal overflow and zero broken images on all 22 public storefront routes** at mobile width.
- `/checkout` and `/notifications` correctly gate unauthenticated visitors.
- Register flow (post-2026-09-28 work): aligned First/Last row, numeric keypad, live email format + duplicate checks, email-OTP verification gate — all verified end to end with real accounts.
- Admin login → "Forgot password?" → email reset link flow — verified live; reset emails deliver via Resend (outbox `processed`).
- Guest chatbot answers with real catalog/offers and enforces the privacy gate; guest complaints file tickets.

## Defects found (prioritized)

| ID | Severity | Area | Finding | Fix |
|---|---|---|---|---|
| D1 | Medium | `/feeds`, `/pay` | Parent paths of folder-style routes (`/feeds/google.xml`, `/pay/[orderId]`) render Vercel static **directory listings** ("Files within /feeds/") — untidy info disclosure. | Add `notFound()`/redirect pages for `/feeds` and `/pay` parents. |
| D2 | Medium | PWA | Manifest + icons exist, **no service worker** → no offline shell, no update flow; PwaInstallPrompt advertises installability the app only half-honors. | Add a minimal SW (precache shell, stale-while-revalidate for catalog images) + update handling. |
| D3 | Low | `/support` | Page renders without an `<h1>` (heading hierarchy/a11y). | Add page heading. |
| D4 | Low | Admin landing | User-visible sentence references the internal DB role name (`emivo_app`) — technical name must stay in code, not in marketing copy. | Reword visible copy; keep the role name in code. |
| D5 | Medium | Admin dashboard | Authenticated admin surfaces not yet audited (no credentials available to the agent this round). Visual consistency vs. storefront brand unverified beyond the auth pages. | Audit with admin credentials; apply shared design tokens (Phase 4). |
| D6 | High (process) | Staging | No staging Supabase project exists; the brief's fail-closed staging requirement is unmet. Tests currently use throwaway Docker infra (safe but not staging). | Provision staging Supabase project + separate env file + fail-closed guard that checks the host against an allowlist. |
| D7 | Medium | Payments | Easebuzz is live in production but **sandbox credentials for staging tests are absent**; payment success/failure/retry matrix untested this round. | Configure Easebuzz sandbox in staging env; build the payment test matrix (success, failure, cancelled, pending, retry, duplicate-submit). |
| D8 | Low | SEO | `/feeds` listing is crawlable; ensure `Disallow: /feeds`, `/pay` in robots and check sitemap coverage. | robots.ts update + sitemap audit. |
| D9 | Medium | Search | Searching "charger" on /shop returns an electric kettle — weak relevance matching on the catalog search. | Tune the search query (tokenization/synonyms) in catalog.py. |
| D10 | Low | Checkout (mobile) | Payment step can show the previous step's "Continue to offers" button in a disabled state — confusing step labeling. | Fix checkout step state/labels. |

## Gaps requiring the owner (cannot be self-served)

1. **Staging Supabase project** (D6) — needs a second Supabase project + credentials.
2. **Admin dashboard credentials** for the authenticated audit (D5) — or provision a staff test account.
3. **Easebuzz sandbox** merchant key/salt (D7).
4. **Physical-device PWA tests** (brief §5): Android/iOS install flows require real devices or device-cloud; desktop emulation cannot prove iOS standalone behavior.

## Tooling used (brief §1)

- ZCode Browser Use (agent.browsers): mobile viewport crawl, visual inspection, end-to-end flow verification — used for every browser finding above.
- Programmatic in-page evaluation: overflow/broken-image/heading/auth-gate checks across all routes (cheaper and more complete than screenshots alone).
- Backend integration suite (Docker scratch Postgres+Redis, RLS on): 106/106 passing at audit time.
- Repo inspection (grep/tree) for the inventory; no new test framework installed yet — Playwright + axe-core are the recommended stack for Phase 4 quality gates (rationale in the roadmap doc).

## Mock-data cleanup ledger (production, owner-approved 2026-09-29)

Per owner instruction, testing ran against the production database with
synthetic records. All of the following can be deleted later:

| Record | Detail |
|---|---|
| Users | `qa.register.9281@example.com`, `qa.register.9282@example.com`, `qa.register.9283@example.com`, `qa.verify.7001@example.com` (the latter is verified, owns a cart + a draft address) |
| Address | "Test Residency, Ward 7, Vijayipur, Gopalganj 841508" on `qa.verify.7001` (if persisted during checkout continue) |
| Cart | 1 × Havells Vesta kettle in the qa.verify.7001 user cart |
| Outbox events | `auth.otp_login` ×4, `auth.password_reset` ×1 (admin@), `auth.welcome` ×4 — historic rows, harmless |
| Emails delivered externally | 1 password-reset email to admin@elektrix.in (expired, single-use) |

No orders, payments, refunds or customer data were created. Payment testing
was intentionally skipped per owner instruction (2026-09-29).


**Addendum 2026-10-04 — Cashfree gateway sandbox verification (owner-directed).**
Payment testing was explicitly re-enabled by the owner for the Cashfree
integration (sandbox keys only; Easebuzz production keys untouched). Rows
created on production, all test orders CANCELLED (stock released):
- 4 orders (`payment_method=ONLINE`, status PENDING→cancelled) placed by
  admin@elektrix.in: 1 Easebuzz-initiated, 1 Cashfree-initiated (sandbox
  payment_session_id verified, never paid), 2 abandoned e2e probes.
- 2 payment rows: provider CASHFREE (CREATED) + EASEBUZZ (CREATED) — no
  money moved, no webhooks processed.

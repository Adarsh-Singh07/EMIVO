# ELEKTRIX — Full Product Audit, UI Unification & Admin AI (Implementation Brief)

> Received from the product owner on 2026-09-28. Source of truth for the audit phases.

ELEKTRIX — Full Product Audit, UI Unification & Admin AI
Implementation brief

Copy the entire brief below into your new Zcode session. It assumes Zcode has access to the repository, local workspace and configured tools.

Your role and objective

Act as a coordinated team of senior UI/UX designers, frontend engineers, backend engineers, accessibility specialists, mobile/PWA engineers, security reviewers and QA automation engineers.

Perform a comprehensive audit and improvement of ELEKTRIX, covering the entire customer storefront, administrator dashboard, authentication flows, checkout, policies and all other existing features.

This is not a request to redesign a few pages or run a few automated tests. The goal is a consistent, polished, mobile-first, fully functioning e-commerce application in which every visible feature is supported by working backend functionality.

Think through the architecture, research the appropriate tools, inspect the existing implementation, establish a baseline, and then systematically implement and verify improvements.

1. Discover and use your tools

Before starting, discover every relevant installed MCP server, plugin, skill, browser tool and testing capability available in your environment.

Read the relevant skill instructions and use the tools that materially improve this task. Do not merely list tools or claim to have used them. Record which tools were actually used and what each contributed.

Research established open-source UI testing, browser automation, accessibility, visual regression and PWA testing repositories. Inspect their documentation, maintenance status, compatibility and licenses before selecting a testing stack.

Start by evaluating these projects:

Microsoft Playwright
 — real browser testing, device emulation and visual regression.

Playwright MCP
 — browser interaction for AI agents.

axe-core
 — automated accessibility checks.

Lighthouse
 — performance, accessibility, SEO and PWA-related audits.

BackstopJS
 — screenshot-based visual regression, if useful alongside Playwright.

Lighthouse CI
 — repeatable quality checks.

Prefer an integrated, maintainable test architecture rather than installing every tool unnecessarily. Use real browser sessions and inspect screenshots yourself.

2. Safety: staging database only

Local development and all automated tests must use the staging Supabase database, never production.

Before running tests or starting the application:

Inspect the existing environment-variable configuration.

Verify the staging Supabase project identity and database host.

Establish separate staging authentication, storage, API credentials and test accounts where required.

Configure Easebuzz sandbox credentials for payment tests.

Fail closed if the database environment cannot be verified as staging.

Never run destructive tests, migrations, resets or test-data generation against production.

Never copy production customer information into staging.

Use synthetic customers, products, orders, refunds and payment records. Ensure tests can be repeated without corrupting shared staging data.

Do not expose secrets in browser logs, screenshots, reports, Git commits or AI conversations.

3. Audit every route and UI state

Build a complete route and feature inventory from the actual codebase.

Crawl and manually inspect every accessible storefront and admin route using the browser. Include authenticated, unauthenticated, empty, loading, populated, error, offline and permission-denied states wherever relevant.

Audit every component and visible element, including navigation, menus, search, filters, product cards, product details, images, cart, wishlist if present, checkout, payments, orders, account settings, authentication, forms, notifications, dialogs, tooltips, pagination, banners, footers, policies and administrative controls.

Check for broken links, missing assets, incorrect routes, placeholder text, dead buttons, inconsistent spacing, duplicate UI patterns, missing feedback, incorrect loading indicators, layout shifts and overflowing content.

Create a route-by-route audit report with screenshots, severity, reproduction steps and proposed fixes.

4. Establish one ELEKTRIX design system

The storefront and admin dashboard currently have inconsistent colors, logos and other visual elements. Fix this comprehensively.

Inspect existing brand assets and identify the intended ELEKTRIX visual identity. Do not invent a new brand direction without justification.

Establish a shared design system containing:

Official logos, wordmarks, icons and favicon variants.

Brand colors and semantic status colors.

Typography, font weights and type scale.

Spacing, radii, borders, shadows and elevation.

Buttons, inputs, dropdowns, switches and checkboxes.

Navigation, cards, tables, dialogs, drawers and notifications.

Empty, loading, success, warning and error states.

Consistent responsive behavior and accessible interaction patterns.

Use reusable tokens and shared components wherever practical. Eliminate duplicated hardcoded styles.

The admin dashboard should have its own information architecture appropriate for administration, but it must clearly belong to the same ELEKTRIX brand.

Replace outdated EMIVO branding in user-facing interfaces and applicable metadata. Preserve technical names or compatibility paths where changing them would break existing functionality.

5. Mobile-first and PWA testing

Mobile is the primary platform. Design and test mobile first, then tablet and desktop.

Test representative small and large Android and iPhone viewports, including narrow screens, landscape orientation, browser zoom and large text.

Inspect every page for touch-target sizing, thumb-friendly navigation, fixed elements, safe-area insets, keyboard overlap, sticky headers, bottom navigation, scroll locking, image cropping, modal behavior and horizontal overflow.

Test installed PWA behavior where supported, including:

Installation and launch.

Standalone display mode.

Manifest and app icons.

Service worker registration and update behavior.

Cache invalidation.

Offline and reconnect states.

Navigation and browser-history behavior.

Session persistence.

Push notifications, if implemented.

Deep links and payment handoffs.

Use actual Android/iOS devices or device-cloud testing where available. Clearly distinguish physical-device testing from browser emulation.

Do not claim full iOS PWA verification based only on desktop WebKit emulation.

6. Browser-based visual and interaction audit

Use browser automation to navigate the entire application like a real customer and administrator.

Capture screenshots for all major pages and interactive states at mobile, tablet and desktop sizes.

Compare screenshots for visual consistency. Inspect alignment, spacing, typography, color, contrast, icons, image quality, responsive layouts and interaction feedback.

Build visual regression tests for shared components and critical pages. Maintain reviewed screenshot baselines and avoid approving regressions automatically.

Run automated accessibility checks and supplement them with keyboard, focus-management and manual usability testing.

Target WCAG 2.2 AA where applicable, including contrast, labels, error messages, focus visibility, semantic structure and touch-target accessibility.

7. Every UI feature must work end to end

Do not assume a feature works because its button is visible or its API returns HTTP 200.

For every visible feature, trace:

UI action → frontend handler → API request → authentication/authorization → backend logic → database or external service → response → updated UI

Create a feature-to-API traceability matrix for storefront and admin.

Identify dead buttons, mocked responses, incomplete APIs, missing authorization, incorrect state updates and features that appear successful without actually persisting changes.

Implement missing backend functionality for existing intended features where feasible. Do not silently remove UI features to make tests pass.

Test both successful and unsuccessful operations, including validation errors, expired sessions, insufficient permissions, network failures, duplicate submissions and concurrent updates.

For critical mutations, verify the actual staging database result rather than relying solely on the UI message.

8. Comprehensive storefront audit

Test the complete customer journey from landing on the website to receiving an order confirmation.

Include product discovery, search, filtering, sorting, product variants, stock availability, cart management, promotions, addresses, shipping, checkout, payment, order history, cancellation, returns and refunds wherever those capabilities exist.

Verify price and inventory consistency between frontend, API and staging database.

Test the existing embedded Easebuzz checkout using sandbox credentials. The main payment experience must remain within ELEKTRIX without unnecessary external browser redirects.

Confirm payment success through server-side verification rather than frontend callbacks alone. Test failed, cancelled, pending and retried payments without creating duplicate charges or orders.

9. Comprehensive admin dashboard audit

Inspect every administrative route and role.

Apply the ELEKTRIX design system consistently to the sidebar, navigation, logo, colors, icons, tables, charts, forms, filters, buttons, dialogs and status indicators.

Audit all implemented administrative workflows, including product management, inventory, categories, orders, customers, payments, refunds, promotions, analytics, settings and staff permissions where present.

Verify that displayed metrics correspond to actual staging data. Test every action through the backend and database.

Confirm that administrative actions enforce authorization server-side, not merely through hidden UI controls.

10. Implement a separate admin-only AI chatbot

Design and implement an AI assistant exclusively for authenticated, authorized ELEKTRIX administrators.

This is not the customer-support chatbot. It must not be exposed to storefront customers or included in public customer-facing bundles unnecessarily.

Research the available AI models, agent frameworks, skills, MCP integrations and existing project infrastructure before selecting the architecture.

The admin assistant should understand ELEKTRIX's authorized operational data and support useful administrative workflows, such as answering questions about orders, inventory, product performance, operational trends and application documentation.

Where suitable, provide structured tools for searching and retrieving live staging or production data according to the current environment and the administrator's permissions.

Implement administrative actions only after explicitly defining their permissions and safety requirements. Sensitive actions such as refunds, bulk price changes, deleting products, changing user permissions or exporting customer data must require explicit confirmation and appropriate authorization.

Requirements:

Server-side authentication and role-based authorization for every AI request and tool call.

No access for ordinary customers.

No unrestricted database or shell access for the model.

Explicitly scoped, validated backend tools.

Protection against prompt injection and unauthorized data disclosure.

Clear distinction between retrieved facts and AI-generated suggestions.

Audit logs for administrative AI actions.

Rate limits, usage monitoring and cost controls.

Streaming responses where appropriate.

Responsive chat interface consistent with the ELEKTRIX admin design.

Helpful error handling and conversation history with an appropriate retention policy.

Start with read-only operational tools. Introduce write actions only after authorization, confirmation and audit logging have been implemented and tested.

Do not allow the AI to bypass existing business rules or directly mutate production data.

11. Test the admin AI thoroughly

Test the assistant against the staging environment using synthetic operational data.

Verify that it can answer supported questions accurately, invoke the correct authorized tools, handle missing data, refuse unauthorized actions and distinguish uncertainty from verified results.

Test prompt injection, attempts to access other users' data, role escalation, malformed tool arguments, sensitive-data exposure, excessive requests and attempts to trigger destructive actions without confirmation.

Test its UI on mobile and desktop, including long conversations, streaming, errors, reconnects and narrow screens.

12. Performance, SEO and policy pages

Audit page performance, image optimization, loading behavior, caching, bundle size, Core Web Vitals and unnecessary API requests.

Review SEO metadata, canonical URLs, structured data, robots configuration and sitemap behavior where applicable.

Audit all existing customer-facing policy and informational pages for branding, layout, navigation, working links, consistency and alignment with actual application functionality.

Identify missing or outdated legal/policy content, but do not invent legal commitments, refund rights, shipping guarantees or privacy practices. Flag these for business/legal approval.

13. Automated quality gates

Establish a maintainable automated test suite covering:

Unit and component tests.

Backend API and authorization tests.

End-to-end customer and administrator workflows.

Mobile browser testing.

Visual regression.

Accessibility.

PWA functionality.

Performance regression.

Admin AI authorization and tool behavior.

Integrate appropriate checks into GitHub Actions. Use synthetic staging fixtures and ensure CI cannot accidentally target production.

Keep screenshot artifacts, traces, logs and failure reports for debugging, with sensitive information redacted.

14. Execution process

Work in the following order:

Inspect the repository and discover available skills, MCPs and tools.

Verify local and staging environment isolation.

Research and select the testing stack.

Inventory every route, component, API and feature.

Perform the initial browser-based audit, prioritizing mobile.

Produce a prioritized defect report and shared design-system specification.

Implement and test the storefront and admin consistency fixes.

Repair incomplete frontend-to-backend functionality.

Design, implement and secure the admin-only AI assistant.

Run comprehensive regression, accessibility, visual, performance and PWA tests.

Review the complete changeset, commit and push the verified work.

Deploy the tested commit to Azure and perform non-destructive production smoke tests.

Do not skip the initial audit or start redesigning components before understanding their current behavior.

Keep all important source-code changes local and version-controlled. Do not create undocumented VPS-only fixes.

15. Required deliverables

Produce a route and feature inventory, UI audit report with screenshots, shared design-system specification, frontend/backend traceability matrix, test suite, admin AI architecture and implementation, accessibility/performance reports, and deployment verification report.

Maintain a clear record of what was fixed, what was tested, what remains unresolved and which checks require physical devices, external services or human approval.

Do not claim that everything works unless the relevant tests have actually passed.

Prioritize a complete, cohesive ELEKTRIX experience rather than isolated cosmetic improvements.
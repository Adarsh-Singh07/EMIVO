import { defineConfig, devices } from "@playwright/test";

/**
 * ELEKTRIX storefront UI quality gate (Phase 6).
 *
 * Runs read-only checks (page loads + axe accessibility scans) against
 * BASE_URL — default production. No logins, no cart mutations: this is safe
 * to run in CI on every push. Deeper authenticated journeys belong to the
 * staging stack once it exists.
 *
 *   npx playwright test                # against https://elektrix.in
 *   BASE_URL=http://localhost:3000 npx playwright test
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.BASE_URL || "https://elektrix.in",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 850 } } },
  ],
});

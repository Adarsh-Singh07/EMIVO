import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Read-only smoke + accessibility gate (Phase 6).
 * Safe to run against production: GET navigations only, no auth, no mutations.
 * axe fails on serious/critical violations (WCAG 2.2 AA focus per brief §6).
 */

const KEY_PAGES = [
  { path: "/", name: "home" },
  { path: "/shop", name: "shop" },
  { path: "/cart", name: "cart" },
  { path: "/login", name: "login" },
  { path: "/register", name: "register" },
  { path: "/support", name: "support" },
  { path: "/compare", name: "compare" },
  { path: "/offline", name: "offline" },
];

async function axeScan(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations.filter((v) => ["serious", "critical"].includes(v.impact || ""));
}

for (const { path, name } of KEY_PAGES) {
  test(`page loads: ${name}`, async ({ page }) => {
    const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), `${path} should return 200`).toBeLessThan(400);
    // Every page must render the site header — a blank shell means the app broke.
    await expect(page.locator("header").first()).toBeVisible();
  });

  test(`axe: no serious/critical violations on ${name}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500); // let client components hydrate
    const violations = await axeScan(page);
    const summary = violations
      .map((v) => `${v.id}(${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`)
      .join(" | ");
    expect(violations, `a11y violations on ${path}: ${summary}`).toHaveLength(0);
  });
}

test("axe: PDP renders with clean layout and no critical violations", async ({ page }) => {
  // Pick any in-stock product from the shop grid (read-only).
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  const productLink = page.locator('a[href^="/product/"]').filter({ visible: true }).first();
  await productLink.waitFor({ state: "visible", timeout: 15_000 });
  const href = await productLink.getAttribute("href");
  expect(href, "shop grid should link to a product").toBeTruthy();

  await page.goto(href!, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // The regression that shipped to phones on 2026-10-03: CTAs stretched past
  // the viewport. Assert every primary CTA is fully on-screen.
  const addToCart = page.getByRole("button", { name: /add to cart/i }).first();
  await addToCart.scrollIntoViewIfNeeded();
  const box = await addToCart.boundingBox();
  expect(box, "Add to Cart must be visible").not.toBeNull();
  const vw = await page.evaluate(() => document.documentElement.clientWidth);
  expect(box!.x, "Add to Cart left edge inside viewport").toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, "Add to Cart right edge inside viewport").toBeLessThanOrEqual(vw + 1);

  // No unreachable horizontal overflow anywhere on the PDP (mobile project).
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "no horizontal overflow on PDP").toBeLessThanOrEqual(2);

  const violations = await axeScan(page);
  const summary = violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`).join(" | ");
  expect(violations, `a11y violations on PDP: ${summary}`).toHaveLength(0);
});

import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://elektrix.in";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface SitemapProduct {
  slug?: string;
  id: string;
  created_at?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/shop",
    "/about",
    "/faq",
    "/blog",
    "/contact",
    "/cart",
    "/login",
    "/register",
    "/order-tracking",
    "/compare",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/shop" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.5,
  }));

  // Product URLs from the live catalog (best-effort; static routes still ship
  // when the API is unreachable).
  let extra: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/store/products?page_size=100`, {
      next: { revalidate: 3600 },
      // Bound the call so a black-holed API host can never stall the build.
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { items?: SitemapProduct[] };
      const products = Array.isArray(data.items) ? data.items : [];
      extra = extra.concat(
        products.map((p) => ({
          url: `${SITE_URL}/product/${p.slug || p.id}`,
          lastModified: p.created_at ? new Date(p.created_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }))
      );
    }
  } catch {
    /* fall through to static routes */
  }

  // Category landing pages (root categories only; they carry their subtree).
  try {
    const cRes = await fetch(`${API_URL}/store/categories`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (cRes.ok) {
      const cats = (await cRes.json()) as Array<{ slug?: string; name?: string }>;
      extra = extra.concat(
        cats
          .filter((c) => c && c.slug && c.name)
          .map((c) => ({
            url: `${SITE_URL}/categories/${c.slug}`,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.85,
          }))
      );
    }
  } catch {
    /* ignore — ship what we have */
  }

  return [...staticRoutes, ...extra];
}

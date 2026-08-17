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
  try {
    const res = await fetch(`${API_URL}/store/products?page_size=100`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return staticRoutes;
    const data = (await res.json()) as { items?: SitemapProduct[] };
    const products = Array.isArray(data.items) ? data.items : [];
    return [
      ...staticRoutes,
      ...products.map((p) => ({
        url: `${SITE_URL}/product/${p.slug || p.id}`,
        lastModified: p.created_at ? new Date(p.created_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}

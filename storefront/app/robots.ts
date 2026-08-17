import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://elektrix.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Account, checkout and API-ish pages hold no SEO value.
        disallow: ["/account/", "/checkout", "/notifications"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

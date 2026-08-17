import { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/config/branding";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/preview", "/health"],
    },
    sitemap: `${BRAND_CONFIG.officialUrl}/sitemap.xml`,
  };
}

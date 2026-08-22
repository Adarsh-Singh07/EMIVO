import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",

  // Disable source maps in production builds to prevent code exposure.
  productionBrowserSourceMaps: false,

  // Pin tracing root to this project so a stray lockfile in a parent dir
  // (e.g. C:\Users\dheer\package-lock.json) isn't picked as the workspace root.
  outputFileTracingRoot: process.env.VERCEL ? undefined : path.join(__dirname),

  // Allow next/image to serve optimized images from these domains.
  // media.elektrix.in = Cloudflare R2 CDN (product images)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "media.elektrix.in" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;

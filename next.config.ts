import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin tracing root to this project so a stray lockfile in a parent dir
  // (e.g. C:\Users\dheer\package-lock.json) isn't picked as the workspace root.
  outputFileTracingRoot: path.join(__dirname),

  // Images are served from GitHub raw + Unsplash. Allowed for future next/image use.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;

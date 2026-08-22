/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.VERCEL ? undefined : 'standalone',
  // Disable source maps in production to prevent code exposure in DevTools.
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;

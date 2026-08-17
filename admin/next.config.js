/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Disable source maps in production to prevent code exposure in DevTools.
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;

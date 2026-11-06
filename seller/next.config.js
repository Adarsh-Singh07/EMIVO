/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.VERCEL ? undefined : 'standalone',
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;

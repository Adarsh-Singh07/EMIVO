import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "store.storeimages.cdn-apple.com" },
      { protocol: "https", hostname: "images.samsung.com" },
      { protocol: "https", hostname: "oasis.opstatics.com" },
      { protocol: "https", hostname: "sony.scene7.com" },
      { protocol: "https", hostname: "www.lg.com" },
      { protocol: "https", hostname: "image01.realme.net" },
      { protocol: "https", hostname: "in-media.apjonlinecdn.com" },
      { protocol: "https", hostname: "i.dell.com" },
      { protocol: "https", hostname: "dlcdnwebimgs.asus.com" },
    ],
  },
};

export default nextConfig;

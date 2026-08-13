/**
 * ELEKTRIX — Centralized Branding System Configuration
 * All application components must import branding tokens from here.
 */

export const BRAND_CONFIG = {
  name: "ELEKTRIX",
  productName: "ELEKTRIX Platform",
  tagline: "Autonomous B2B Commerce & Operating Infrastructure",
  domain: "elektrix.in",
  officialUrl: "https://elektrix.in",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  company: {
    name: "APANA ENTERPRISES",
    supportEmail: "support@elektrix.in",
    contactEmail: "hello@elektrix.in",
    address: "DS1, 109, Near Indian Petrol Pump, Vijayipur, Gopalganj, Bihar - 841508",
    gstNumber: "10COMPG4070G1ZB",
    contactPhone: "+91 79059 35908",
  },
  assets: {
    iconLogo: "/branding/icon.svg",
    wordmarkLogo: "/branding/wordmark.svg",
    favicon: "/branding/icon.svg",
  },
  theme: {
    primaryGradient: "from-amber-500 via-orange-500 to-amber-600",
    accentColor: "#f59e0b",
    darkBackground: "bg-neutral-950",
  },
  socials: {
    twitter: "https://twitter.com/elektrix_in",
    github: "https://github.com/elektrix",
    linkedin: "https://linkedin.com/company/elektrix-in",
  },
  meta: {
    defaultTitle: "ELEKTRIX — Autonomous B2B Commerce Platform",
    titleTemplate: "%s | ELEKTRIX",
    description:
      "Unified multi-tenant B2B commerce platform with automated POS, order processing, inventory, checkout payments, and analytics.",
    keywords: [
      "ELEKTRIX",
      "B2B Commerce",
      "SaaS",
      "POS",
      "Multi-tenant Platform",
      "Inventory Management",
      "Checkout Payments",
    ],
  },
};

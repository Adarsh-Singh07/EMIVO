/**
 * ELEKTRIX — brand facts shared by the admin console.
 * Visual language (type, colour, radius) lives in app/globals.css, not here.
 */

export const BRAND_CONFIG = {
  name: "ELEKTRIX",
  domain: "elektrix.in",
  officialUrl: "https://elektrix.in",
  sellerUrl: "https://sell.elektrix.in",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  company: {
    name: "M/S APANA ENTERPRISES",
    supportEmail: "support@elektrix.in",
    contactEmail: "hello@elektrix.in",
    address: "DS1, 109, Near Indian Petrol Pump, Vijayipur, Gopalganj, Bihar - 841508",
    gstNumber: "10COMPG4070G1ZB",
    contactPhone: "+91 80920 24066",
  },
  assets: {
    iconLogo: "/branding/icon.png",
    wordmarkLogo: "/branding/wordmark.png",
    favicon: "/branding/icon.png",
  },
  meta: {
    defaultTitle: "Elektrix Admin",
    titleTemplate: "%s · Elektrix Admin",
    description: "Orders, catalog, inventory and customers for elektrix.in",
  },
};

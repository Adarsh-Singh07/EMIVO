import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/site/CartProvider";
import { AuthProvider } from "@/lib/auth-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { toJsonLd } from "@/lib/format";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { Toaster } from "sonner";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import CookieConsent from "@/components/site/CookieConsent";
import LenisProvider from "@/components/site/LenisProvider";
import SupportChatWidget from "@/components/site/SupportChatWidget";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://elektrix.in";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ELEKTRIX",
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-192.png`,
  description:
    "India's premium electronics store — mobiles, laptops, appliances, audio and wearables.",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-80920-24066",
    email: "support@elektrix.in",
    contactType: "customer support",
    areaServed: "IN",
    availableLanguage: ["en", "hi"],
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "DS1, 109, Near Indian Petrol Pump, Vijayipur, Gopalganj",
    addressLocality: "Gopalganj",
    addressRegion: "Bihar",
    postalCode: "841508",
    addressCountry: "IN",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ELEKTRIX — Premium Electronics Store",
    template: "%s — ELEKTRIX",
  },
  applicationName: "ELEKTRIX",
  description:
    "Shop genuine smartphones, laptops, appliances, audio and wearables at ELEKTRIX. Brand warranty, no-cost EMI and fast delivery across India.",
  keywords: ["electronics", "laptops", "mobiles", "audio", "wearables", "elektrix"],
  openGraph: {
    title: "ELEKTRIX — Premium Electronics Store",
    description:
      "Shop genuine smartphones, laptops, appliances, audio and wearables at ELEKTRIX. Brand warranty, no-cost EMI and fast delivery across India.",
    siteName: "ELEKTRIX",
    type: "website",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "ELEKTRIX",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ELEKTRIX — Premium Electronics Store",
    description:
      "Shop genuine smartphones, laptops, appliances, audio and wearables at ELEKTRIX. Brand warranty, no-cost EMI and fast delivery across India.",
    images: ["/icons/icon-512.png"],
  },
  // PWA — installable app with standalone display, icons and manifest.
  manifest: "/manifest.webmanifest?v=3",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ELEKTRIX",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
  // Extends the layout viewport into the notch/home-indicator area so the
  // mobile bottom nav can add `env(safe-area-inset-bottom)` padding on iPhones.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-white text-neutral-900 overflow-x-hidden">
        <a
          href="#main-content"
          className="skip-link bg-neutral-950 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg"
        >
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(organizationJsonLd) }}
        />
        <LenisProvider>
        <AuthProvider>
        <SupportChatWidget />
          <WishlistProvider>
            <CartProvider>
              <Header />
              <main
                id="main-content"
                tabIndex={-1}
                className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 focus:outline-none"
              >
                {children}
              </main>
              <Footer />
              <MobileBottomNav />

              <PwaInstallPrompt />
              <Toaster
                position="bottom-right"
                richColors
                expand={false}
                toastOptions={{
                  duration: 2500,
                  closeButton: true,
                  className: "mb-[calc(env(safe-area-inset-bottom)+3.5rem)] md:mb-0",
                  style: {
                    pointerEvents: "auto",
                  },
                }}
              />
              <CookieConsent />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
        </LenisProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/site/CartProvider";
import { AuthProvider } from "@/lib/auth-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { Toaster } from "sonner";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import CookieConsent from "@/components/site/CookieConsent";
import LenisProvider from "@/components/site/LenisProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
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
  title: "ELEKTRIX — Premium Electronics Store",
  applicationName: "ELEKTRIX",
  description:
    "Shop the latest electronics and manage your autonomous commerce operations at ELEKTRIX.",
  keywords: ["electronics", "laptops", "mobiles", "audio", "elektrix", "autonomous commerce"],
  openGraph: {
    title: "ELEKTRIX",
    description: "Shop the latest electronics and manage your autonomous commerce operations at ELEKTRIX.",
    siteName: "ELEKTRIX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ELEKTRIX",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-white text-neutral-900" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <LenisProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Header />
              <main className="min-h-screen pb-28 lg:pb-0">{children}</main>
              <Footer />
              <MobileBottomNav />
              {/* Spacer on mobile so the fixed bottom nav never covers footer or page content */}
              <div className="h-[calc(env(safe-area-inset-bottom)+5rem)] lg:hidden" aria-hidden />
              
        
        <PwaInstallPrompt />
        <Toaster
                position="bottom-right"
                richColors
                expand={false}
                toastOptions={{
                  duration: 2500,
                  closeButton: true,
                  className: "mb-[calc(env(safe-area-inset-bottom)+3.5rem)] lg:mb-0",
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

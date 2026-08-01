import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "EMIVO | Premium Electronics on Easy EMI",
    template: "%s | EMIVO",
  },
  description:
    "India's AI-first electronics storefront. Premium gadgets, transparent pricing, instant EMI financing.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: { url: "/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EMIVO",
  },
};

export const viewport: Viewport = {
  themeColor: "#12213B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          spaceGrotesk.variable,
          ibmPlexSans.variable,
          ibmPlexMono.variable,
          "min-h-screen font-sans antialiased flex flex-col"
        )}
      >
        <Providers>
          <SiteHeader />
          <main className="flex-1 w-full bg-background">{children}</main>
          <SiteFooter />
          <CartDrawer />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
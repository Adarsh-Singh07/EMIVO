import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartDrawer } from "@/components/layout/cart-drawer";

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
        </Providers>
      </body>
    </html>
  );
}
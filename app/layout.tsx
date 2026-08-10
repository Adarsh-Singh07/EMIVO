import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/site/CartProvider";
import { AuthProvider } from "@/lib/auth-context";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "ELEKTRIX — Autonomous Commerce & Operating Infrastructure",
  description: "Shop the latest electronics and manage your autonomous commerce operations at ELEKTRIX.",
  keywords: ["electronics", "laptops", "mobiles", "audio", "elektrix", "autonomous commerce"],
  openGraph: {
    title: "ELEKTRIX",
    description: "Shop the latest electronics and manage your autonomous commerce operations at ELEKTRIX.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ELEKTRIX",
  },
  // PWA — installable app with standalone display, icons and manifest.
  manifest: "/manifest.webmanifest",
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
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="min-h-screen pb-20 lg:pb-0">{children}</main>
            <Footer />
            <MobileBottomNav />
            {/* Spacer on mobile so the fixed bottom nav never covers footer text */}
            <div className="h-[calc(env(safe-area-inset-bottom)+3.5rem)] lg:hidden" aria-hidden />
            <Toaster position="top-right" richColors />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

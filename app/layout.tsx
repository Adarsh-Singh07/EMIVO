import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/site/CartProvider";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileBottomNav from "@/components/site/MobileBottomNav";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EMIVO — Premium Electronics Store",
  description: "Shop the latest mobiles, laptops, appliances and accessories at EMIVO.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        <CartProvider>
          <Header />
          <main className="min-h-screen pb-20 lg:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
          {/* Spacer on mobile so the fixed bottom nav never covers footer text */}
          <div className="h-[calc(env(safe-area-inset-bottom)+3.5rem)] lg:hidden" aria-hidden />
          <Toaster position="top-right" richColors />
        </CartProvider>
      </body>
    </html>
  );
}

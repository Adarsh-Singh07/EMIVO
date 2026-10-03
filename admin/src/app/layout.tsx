import "@/app/globals.css";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";
import { BRAND_CONFIG } from "@/config/branding";
import { Metadata } from "next";

// Same brand typeface as the storefront (design-system Phase 4b).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: BRAND_CONFIG.meta.defaultTitle,
    template: BRAND_CONFIG.meta.titleTemplate,
  },
  description: BRAND_CONFIG.meta.description,
  keywords: BRAND_CONFIG.meta.keywords,
  icons: {
    icon: BRAND_CONFIG.assets.favicon,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="bg-neutral-950 font-sans text-white antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-right" theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}

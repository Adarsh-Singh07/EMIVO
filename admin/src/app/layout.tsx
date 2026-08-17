import "@/app/globals.css";
import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";
import { BRAND_CONFIG } from "@/config/branding";
import { Metadata } from "next";

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
    <html lang="en" className="dark">
      <body className="bg-neutral-950 font-sans text-white antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-right" theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}

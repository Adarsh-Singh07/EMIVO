import "@/app/globals.css";
import { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";
import { BRAND_CONFIG } from "@/config/branding";
import { Metadata } from "next";

// Plex Sans carries tabular figures, which the order and stock columns rely on.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: BRAND_CONFIG.meta.defaultTitle,
    template: BRAND_CONFIG.meta.titleTemplate,
  },
  description: BRAND_CONFIG.meta.description,
  icons: {
    icon: BRAND_CONFIG.assets.favicon,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-right" theme="light" />
        </AuthProvider>
      </body>
    </html>
  );
}

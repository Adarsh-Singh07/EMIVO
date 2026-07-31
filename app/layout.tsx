import type { Metadata } from "next";
import { Inter, Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

// Typography: Strict adherence to Inter for structural UI, as per EMIVO Design Bible
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "EMIVO | Premium Electronics",
  description: "India's premium AI-powered electronics shopping platform.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EMIVO",
  },
};

export const viewport = {
  themeColor: "#ffffff",
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
          inter.variable,
          "font-sans antialiased min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)]"
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


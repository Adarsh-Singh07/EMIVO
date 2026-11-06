import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elektrix Seller Central | Marketplace Partner Portal",
  description: "Official seller management portal for Elektrix marketplace partners. Manage inventory, process orders, and grow your e-commerce business.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-slate-50 text-slate-900">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

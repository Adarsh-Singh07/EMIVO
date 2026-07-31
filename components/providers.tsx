"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="flex-1 relative">
        {children}
      </main>
      <Footer />
    </>
  );
}

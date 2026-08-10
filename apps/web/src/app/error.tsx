"use client";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { BRAND_CONFIG } from "@/config/branding";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center antialiased">
      <div className="mb-6">
        <BrandLogo variant="icon" size={64} />
      </div>
      <h1 className="text-4xl font-bold mb-2">Application Error</h1>
      <p className="text-neutral-400 max-w-md mb-8 text-sm">
        An unexpected error occurred in {BRAND_CONFIG.name}.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/25"
      >
        Try Again
      </button>
    </div>
  );
}

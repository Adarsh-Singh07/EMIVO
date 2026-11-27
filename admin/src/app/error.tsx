"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { BrandLogo } from "@/components/branding/BrandLogo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <BrandLogo size={36} showText={false} />
      <div className="mt-6 w-full max-w-md rounded-md border border-neutral-200 bg-white p-6">
        <h1 className="text-base font-semibold text-neutral-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}

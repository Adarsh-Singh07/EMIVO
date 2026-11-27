"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function DashboardError({
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
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-md rounded-md border border-neutral-200 bg-white p-6 text-center">
        <AlertCircle className="mx-auto h-5 w-5 text-red-600" aria-hidden />
        <h2 className="mt-2 text-base font-semibold text-neutral-900">Something went wrong</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <button
          onClick={reset}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}

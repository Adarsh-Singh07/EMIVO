"use client";

import { RefreshCw } from "lucide-react";

export default function OfflineRetry() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
    >
      <RefreshCw className="h-4 w-4" /> Retry
    </button>
  );
}

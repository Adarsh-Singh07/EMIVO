import Link from "next/link";
import { WifiOff, Home } from "lucide-react";
import OfflineRetry from "./OfflineRetry";

export const metadata = {
  title: "You're offline — ELEKTRIX",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
        <WifiOff className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
        You&apos;re offline
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
        ELEKTRIX needs a connection to show live prices and stock. Check your
        network and try again — your cart is safe.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <OfflineRetry />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          <Home className="h-4 w-4" /> Go to homepage
        </Link>
      </div>
    </div>
  );
}

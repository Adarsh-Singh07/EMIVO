import Link from "next/link";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { BRAND_CONFIG } from "@/config/branding";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white p-6 text-center">
      <div className="mb-6">
        <BrandLogo variant="icon" size={64} />
      </div>
      <h1 className="text-6xl font-black text-amber-500 mb-2">404</h1>
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-neutral-400 max-w-md mb-8 text-sm">
        The requested resource on {BRAND_CONFIG.name} could not be located.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/25"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

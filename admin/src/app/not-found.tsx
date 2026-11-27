import Link from "next/link";
import { BrandLogo } from "@/components/branding/BrandLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <BrandLogo size={48} showText={false} />
      <h1 className="mt-6 text-2xl font-semibold text-neutral-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-600">
        The page you asked for does not exist or has moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-9 items-center rounded-md border border-neutral-900 bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

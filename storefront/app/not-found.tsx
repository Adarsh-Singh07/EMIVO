import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-32 text-center">
      <p className="text-7xl font-bold text-neutral-200 mb-4">404</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-3">Page not found</h1>
      <p className="text-neutral-500 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/"
          className="h-12 inline-flex items-center px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
        >
          Back to Home
        </Link>
        <Link
          href="/shop"
          className="h-12 inline-flex items-center px-8 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
        >
          Browse Shop
        </Link>
      </div>
    </div>
  );
}

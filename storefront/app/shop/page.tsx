import type { Metadata } from "next";
import { Suspense } from "react";
import ShopContent from "./ShopContent";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Category display names for metadata. Static map on purpose: metadata must
// resolve without an API round-trip so TTFB stays fast. Unknown slugs fall
// back to the slug itself.
const CATEGORY_NAMES: Record<string, string> = {
  mobiles: "Mobiles",
  laptops: "Laptops",
  appliances: "Appliances",
  audio: "Audio",
  wearables: "Wearables",
  accessories: "Accessories",
};

/**
 * Per-category metadata with canonical URLs.
 * - Category pages  → canonical to themselves (`/shop?category=x` is the
 *   intended indexable URL for that collection).
 * - Filtered/sorted/search views → canonical to `/shop` so facet combinations
 *   don't create thousands of duplicate indexable URLs.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : "";
  const q = typeof sp.q === "string" ? sp.q : "";
  const name = category ? CATEGORY_NAMES[category] || category : "";

  if (q) {
    return {
      title: `Search results for “${q}”`,
      description: `Browse “${q}” at ELEKTRIX — genuine electronics with brand warranty, open-box delivery and fast shipping across India.`,
      robots: { index: false },
      alternates: { canonical: "/shop" },
    };
  }

  if (name) {
    return {
      title: `${name}`,
      description: `Buy ${name.toLowerCase()} online at ELEKTRIX. Genuine products with brand warranty, no-cost EMI, open-box delivery and fast shipping across India.`,
      alternates: { canonical: `/shop?category=${encodeURIComponent(category)}` },
      openGraph: {
        title: `${name} — ELEKTRIX`,
        description: `Shop genuine ${name.toLowerCase()} at ELEKTRIX with brand warranty and fast delivery across India.`,
        siteName: "ELEKTRIX",
      },
    };
  }

  return {
    title: "Shop All Products",
    description:
      "Browse genuine smartphones, laptops, appliances, audio and wearables at ELEKTRIX. Brand warranty, no-cost EMI, open-box delivery and fast shipping across India.",
    alternates: { canonical: "/shop" },
  };
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1400px] mx-auto px-4 py-24 text-center text-neutral-500">
          Loading shop…
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CategoryLanding from "@/components/site/CategoryLanding";
import { getCategoryPageServer } from "@/lib/products";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: { params: Props["params"] }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCategoryPageServer(slug).catch(() => null);
  if (!page) {
    return { title: "Category", robots: { index: false } };
  }
  const o = page.overrides || {};
  const name = page.category.name;
  const title = o.seo_title?.trim() || `Buy ${name} Online at Best Prices | ELEKTRIX`;
  const description =
    o.seo_description?.trim() ||
    `Shop ${name} at ELEKTRIX — ${page.brands.length} brands, top deals and exclusive offers. Filter by brand and price.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: o.hero_image ? [{ url: o.hero_image }] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const page = await getCategoryPageServer(slug).catch(() => null);
  if (!page) notFound();
  return (
    <Suspense fallback={null}>
      <CategoryLanding slug={slug} initial={page} />
    </Suspense>
  );
}

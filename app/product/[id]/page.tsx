import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/site/ProductDetail";
import { getApiProductById, getRelatedProducts } from "@/lib/products";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getApiProductById(id);
  if (!product) {
    return { title: "Product not found — ELEKTRIX" };
  }

  const description =
    product.description?.slice(0, 160) ||
    `${product.name} by ${product.brand} at ELEKTRIX — genuine products, fast delivery and easy returns.`;

  return {
    title: `${product.name} — ELEKTRIX`,
    description,
    alternates: {
      canonical: `/product/${product.slug}`,
    },
    openGraph: {
      title: product.name,
      description,
      images: [{ url: product.img, alt: product.name }],
      type: "website",
      siteName: "ELEKTRIX",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [product.img],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const [product, related] = await Promise.all([
    getApiProductById(id),
    getRelatedProducts(id, 8),
  ]);

  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.slice(0, 4),
    description: product.description || product.tagline,
    sku: product.sku || product.id,
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      url: `/product/${product.slug}`,
      priceCurrency: "INR",
      price: (product.price / 100).toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} related={related} />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/site/ProductDetail";
import { getApiProductById, getRelatedProducts } from "@/lib/products";
import { toJsonLd } from "@/lib/format";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getApiProductById(slug);
  if (!product) {
    return { title: "Product not found — ELEKTRIX" };
  }

  // Meta descriptions must be plain text — product.description is WYSIWYG HTML.
  const plainDescription = product.description
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const description =
    plainDescription?.slice(0, 160) ||
    `${product.name} by ${product.brand} at ELEKTRIX — genuine products, fast delivery with Easy Replacement.`;

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
  const { slug } = await params;
  const [product, related] = await Promise.all([
    getApiProductById(slug),
    getRelatedProducts(slug, 8),
  ]);

  if (!product) notFound();

  const plainDescription = product.description
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.slice(0, 4),
    description: plainDescription || product.tagline,
    sku: product.sku || product.id,
    brand: { "@type": "Brand", name: product.brand },
    // No aggregateRating/review markup: the platform has no review system
    // yet, and fabricated ratings in structured data violate search-engine
    // structured-data policies.
    offers: {
      "@type": "Offer",
      url: `${process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://elektrix.in'}/product/${product.slug}`,
      priceCurrency: "INR",
      price: (product.price / 100).toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn"
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "INR"
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN"
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "d"
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 5,
            unitCode: "d"
          }
        }
      }
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }}
      />
      <ProductDetail product={product} related={related} />
    </>
  );
}

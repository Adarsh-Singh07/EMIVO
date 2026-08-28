import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/site/ProductDetail";
import { getApiProductById, getRelatedProducts } from "@/lib/products";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getApiProductById(slug);
  if (!product) {
    return { title: "Product not found — ELEKTRIX" };
  }

  const description =
    product.description?.slice(0, 160) ||
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.slice(0, 4),
    description: product.description || product.tagline,
    sku: product.sku || product.id,
    brand: { "@type": "Brand", name: product.brand },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "24"
    },
    review: [
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5"
        },
        author: {
          "@type": "Person",
          name: "Verified Buyer"
        }
      }
    ],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} related={related} />
    </>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { 
  Package, 
  ArrowLeft, 
  Store, 
  ExternalLink, 
  AlertCircle, 
  Star, 
  Layers, 
  Tag, 
  ShieldCheck 
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";

interface ProductDetail {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  price: number;
  sale_price?: number | null;
  mrp?: number | null;
  status: string;
  featured: boolean;
  seller_id?: string | null;
  seller_name?: string | null;
  description?: string | null;
  category_id?: string | null;
  specs?: Array<{ name: string; value: string }> | null;
  media?: Array<{ media_url: string; position: number }>;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<ProductDetail>(`/products/${id}`);
        setProduct(data);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load product details";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-neutral-200 animate-pulse rounded-lg" />
        <div className="h-96 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-neutral-900">Product Not Found</h2>
        <p className="text-sm text-neutral-500">{error || "The requested product does not exist."}</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  const primaryImage = product.media && product.media.length > 0 ? product.media[0].media_url : null;
  const sellerDisplayName = product.seller_name || "Apana Enterprises";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace Catalog
        </Link>
        <div className="flex items-center gap-3">
          <a
            href={`https://elektrix.in/product/${product.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <span>View on Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://sell.elektrix.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>Manage in Seller Central</span>
          </a>
        </div>
      </div>

      {/* Governance Notice Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start sm:items-center gap-3 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-950">Read-Only Catalog Inspection:</strong> Direct modification of this item is disabled in the Admin Console. Product pricing, stock levels, and specs are managed exclusively by the owning merchant (<strong>{sellerDisplayName}</strong>) via <strong>Seller Central (sell.elektrix.in)</strong>.
        </p>
      </div>

      {/* Product Summary Card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-full sm:w-48 h-48 rounded-xl bg-neutral-50 border border-neutral-200 shrink-0 overflow-hidden flex items-center justify-center">
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={primaryImage} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <Package className="w-12 h-12 text-neutral-300" />
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 border border-amber-200/80">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  Sold by: {sellerDisplayName}
                </span>
                {product.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> Featured
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-neutral-900">{product.name}</h1>
              <p className="text-xs text-neutral-500 mt-1">
                SKU: <span className="font-mono text-neutral-700">{product.sku || "N/A"}</span> &bull; Brand: <span className="font-medium text-neutral-700">{product.brand || "ELEKTRIX"}</span>
              </p>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-2xl font-bold text-neutral-900">
                {formatINR(product.sale_price && product.sale_price > 0 ? product.sale_price : product.price)}
              </span>
              {product.mrp && product.mrp > product.price && (
                <span className="text-sm text-neutral-400 line-through">
                  {formatINR(product.mrp)}
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-neutral-100 flex items-center gap-6 text-xs text-neutral-600">
              <div>
                <span className="text-neutral-400 uppercase tracking-wider block text-[10px]">Status</span>
                <span className="font-semibold text-neutral-900">{product.status}</span>
              </div>
              <div>
                <span className="text-neutral-400 uppercase tracking-wider block text-[10px]">Product ID</span>
                <span className="font-mono text-neutral-700">{product.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Specifications */}
      {product.description && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">Description</h2>
          <p className="text-sm text-neutral-600 whitespace-pre-line leading-relaxed">
            {product.description}
          </p>
        </div>
      )}

      {product.specs && product.specs.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">Specifications</h2>
          <div className="divide-y divide-neutral-100 text-sm">
            {product.specs.map((spec, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 font-medium">{spec.name}</span>
                <span className="text-neutral-900 font-semibold">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

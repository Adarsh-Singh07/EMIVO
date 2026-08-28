"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  X,
  ShoppingBag,
  Zap,
  Heart,
  RefreshCw,
  Share2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Minus,
  Plus,
  Check,
  ChevronRight,
  Loader2,
  Star,
} from "lucide-react";
import PincodeChecker from "./PincodeChecker";
import ProductCard from "./ProductCard";
import { useCart } from "./CartProvider";
import { useWishlist } from "@/lib/wishlist-context";
import { COMPARE_MAX, toggleCompare, useCompareIds, pushRecent } from "@/lib/compare";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { type Product } from "@/lib/products";

const TABS = [
  { id: "description", label: "Description" },
  { id: "specs", label: "Specifications" },
  { id: "reviews", label: "Reviews" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { add } = useCart();
  const { user } = useAuth();
  const wishlist = useWishlist();
  const compareIds = useCompareIds();

  useEffect(() => {
    // Next.js client-side router caches payloads. Force a refresh on mount
    // so if the user hits the browser Back button after checkout, they see accurate stock.
    router.refresh();
  }, [router]);

  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const dist = touchStart - touchEnd;
    const isLeftSwipe = dist > 50;
    const isRightSwipe = dist < -50;
    const n = images.length;
    if (isLeftSwipe) setActiveImg((v) => (v + 1) % n);
    if (isRightSwipe) setActiveImg((v) => (v - 1 + n) % n);
    setTouchStart(null);
    setTouchEnd(null);
  };
  const [variantIdx, setVariantIdx] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<TabId>("description");
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  // Reset per-product state on client-side navigation between products.
  useEffect(() => {
    setActiveImg(0);
    setVariantIdx(null);
    setQty(1);
    setTab("description");
  }, [product.id]);

  const [orderedOrderId, setOrderedOrderId] = useState<string | null>(null);
  useEffect(() => {
    if (user) {
      import("@/lib/store-api").then(({ storeApi }) => {
        storeApi.listOrders({ page: 1, page_size: 50 }).then((res) => {
          for (const order of (res.items || [])) {
            if (["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status?.toUpperCase() || "")) {
              if (order.items?.some((i: any) => i.product_id === product.id)) {
                setOrderedOrderId(order.order_number || order.id);
                break;
              }
            }
          }
        }).catch(() => {}); // silent fail
      });
    }
  }, [user, product.id]);

  // Recently-viewed tracker.
  useEffect(() => {
    pushRecent({
      id: product.id,
      slug: product.slug,
      name: product.name,
      img: product.img,
      price: product.price,
    });
  }, [product.id, product.slug, product.name, product.img, product.price]);

  const hasVariants = (product.variants?.length ?? 0) > 0;
  const selectedVariant = hasVariants && variantIdx != null ? product.variants![variantIdx] : null;
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;

  const stockAvailable = product.stockAvailable;
  const isComingSoon = product.status === "COMING_SOON";
  const outOfStock = !isComingSoon && (!product.inStock || stockAvailable === 0);
  const lowStock = !outOfStock && stockAvailable != null && stockAvailable > 0 && stockAvailable <= 5;
  const maxQty = stockAvailable != null && stockAvailable > 0 ? stockAvailable : 10;

  const images = useMemo(
    () => (product.images.length > 0 ? product.images : [product.img]),
    [product.images, product.img]
  );

  const wished = wishlist.has(product.id);
  const comparing = compareIds.includes(product.id);

  const addToCart = async () => {
    if (outOfStock) return;
    setAdding(true);
    const ok = await add({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: displayPrice,
      mrp: product.mrp,
      img: product.img,
      variantId: selectedVariant?.id,
    });
    if (ok) toast.success("Added to cart");
    setAdding(false);
    return ok;
  };

  const buyNow = async () => {
    if (outOfStock) return;
    setBuying(true);
    const ok = await add({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: displayPrice,
      mrp: product.mrp,
      img: product.img,
      variantId: selectedVariant?.id,
    });
    setBuying(false);
    if (ok) router.push("/checkout");
  };

  const handleWishlist = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    try {
      const result = await wishlist.toggle(product.id);
      toast.success(result === "added" ? "Added to wishlist" : "Removed from wishlist");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update wishlist");
    }
  };

  const handleCompare = () => {
    const wasIn = compareIds.includes(product.id);
    const { ids } = toggleCompare(product.id);
    if (!wasIn && ids.includes(product.id)) {
      toast.success("Added to compare");
      if (ids.length >= COMPARE_MAX) toast.info(`Compare holds up to ${COMPARE_MAX} products`);
    } else if (wasIn && !ids.includes(product.id)) {
      toast.success("Removed from compare");
    } else {
      toast.error(`You can compare up to ${COMPARE_MAX} products`);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-xs sm:text-sm text-neutral-500 mb-6 flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar">
        <Link href="/">Home</Link> <ChevronRight className="w-3 h-3" />
        <Link href="/shop" className="hover:text-neutral-900">
          Shop
        </Link>{" "}
        <ChevronRight className="w-3 h-3" />
        <Link
          href={`/shop?category=${product.category}`}
          className="capitalize hover:text-neutral-900"
        >
          {product.categoryName || product.category}
        </Link>{" "}
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-900">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div className="flex flex-col-reverse sm:flex-row gap-4">
          <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 no-scrollbar snap-x snap-mandatory">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                onClick={() => setActiveImg(i)}
                className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 snap-center transition-all ${
                  activeImg === i
                    ? "border-neutral-950"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
                aria-label={`View image ${i + 1}`}
              >
                <Image src={src} alt={`${product.name} — image ${i + 1}`} fill sizes="80px" className="object-contain p-1" />
              </button>
            ))}
          </div>
          <div 
            className="relative flex-1 aspect-square rounded-3xl overflow-hidden bg-white border border-neutral-100 cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndHandler}
          >
            <Image
              src={images[activeImg] || product.img}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-4"
            />
            {product.discount > 0 && !selectedVariant && (
              <span className="absolute top-4 left-4 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                {product.discount}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <p className="text-[15px] uppercase tracking-[0.15em] text-neutral-500 font-medium">
            {product.brand}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-2">{product.name}</h1>

          <p className="text-neutral-600 mt-3">{product.tagline}</p>

          <div className="flex items-end gap-3 mt-5">
            <span className="text-3xl font-semibold">{inr(displayPrice)}</span>
            {product.mrp > displayPrice && (
              <span className="text-neutral-400 line-through text-lg">{inr(product.mrp)}</span>
            )}
            {!selectedVariant && product.discount > 0 && (
              <span className="text-green-600 text-sm font-medium mb-1">
                {product.discount}% off
              </span>
            )}
          </div>
          {!selectedVariant && product.onOffer && (
            <div className="mt-1">
              <span className="inline-flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 border border-amber-200/50">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {product.offerName || "Festival Offer"} Active
              </span>
            </div>
          )}

          {/* Stock badge */}
          <p className="mt-2">
            {outOfStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Out of stock
              </span>
            ) : lowStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Only {stockAvailable} left
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500" /> In stock
              </span>
            )}
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            Inclusive of all taxes &nbsp;·&nbsp; Dispatched in 24-48 hrs
          </p>

          <PincodeChecker />

          {/* Variant selector */}
          {hasVariants && (
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">
                Variant:{" "}
                <span className="font-normal text-neutral-500">{selectedVariant?.name || "Standard"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setVariantIdx(null)}
                  className={`h-10 px-4 rounded-full border text-sm font-medium transition-all ${
                    variantIdx == null
                      ? "border-neutral-950 ring-1 ring-neutral-950"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  Standard · {inr(product.price)}
                </button>
                {product.variants!.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantIdx(i)}
                    className={`h-10 px-4 rounded-full border text-sm font-medium transition-all ${
                      variantIdx === i
                        ? "border-neutral-950 ring-1 ring-neutral-950"
                        : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {v.name} · {inr(v.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty + CTAs */}
          <div className="flex items-center gap-3 mt-7">
            <div className="inline-flex items-center border border-neutral-200 rounded-full">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 hover:bg-neutral-100 rounded-l-full"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-medium">{qty}</span>
              <button
                onClick={() =>
                  setQty((q) => {
                    if (q + 1 > maxQty) {
                      toast.error(
                        stockAvailable != null ? `Only ${stockAvailable} available` : "Quantity limit reached"
                      );
                      return q;
                    }
                    return q + 1;
                  })
                }
                disabled={outOfStock || qty >= maxQty}
                className="p-3 hover:bg-neutral-100 rounded-r-full disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {outOfStock && <span className="text-sm font-medium text-red-600">Out of stock</span>}
          </div>

          <div className="flex gap-2 sm:gap-4 mt-6">
            {orderedOrderId ? (
              <Link
                href={`/order-tracking?order=${orderedOrderId}`}
                className="flex-1 h-16 inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Truck className="w-5 h-5" /> Track Your Order
              </Link>
            ) : null}
            <button
              onClick={addToCart}
              disabled={outOfStock || adding}
              className="flex-1 h-16 inline-flex items-center justify-center gap-2 bg-neutral-950 text-white rounded-2xl text-lg font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-[0.98]"
            >
              {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
              Add to Cart
            </button>
            <button
              onClick={buyNow}
              disabled={outOfStock || buying}
              className="flex-1 h-16 inline-flex items-center justify-center gap-2 bg-amber-400 text-amber-950 rounded-2xl text-lg font-bold hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-[0.98]"
            >
              {buying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Buy Now
            </button>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 ">
            <button
              onClick={handleWishlist}
              aria-pressed={wished}
              className={`shrink-0 min-w-[100px] h-11 inline-flex items-center justify-center gap-2 border rounded-full text-sm hover:bg-neutral-50 snap-start ${
                wished ? "border-red-200 text-red-600" : "border-neutral-200"
              }`}
            >
              <Heart className={`w-4 h-4 ${wished ? "fill-red-500 text-red-500" : ""}`} />{" "}
              {wished ? "Wishlisted" : "Wishlist"}
            </button>
            <button
              onClick={handleCompare}
              aria-pressed={comparing}
              className={`shrink-0 min-w-[100px] h-11 inline-flex items-center justify-center gap-2 border rounded-full text-sm hover:bg-neutral-50 snap-start ${
                comparing ? "border-neutral-950" : "border-neutral-200"
              }`}
            >
              <RefreshCw className="w-4 h-4" /> {comparing ? "In compare" : "Compare"}
            </button>
            <button
              className="shrink-0 min-w-[100px] h-11 inline-flex items-center justify-center gap-2 border border-neutral-200 rounded-full text-sm hover:bg-neutral-50 snap-start"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success("Link copied to clipboard");
              }}
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex gap-6 mt-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 ">
            <div className="flex items-center gap-2 text-xs text-neutral-600 shrink-0 snap-start">
              <Truck className="w-5 h-5 text-neutral-400 shrink-0" /> Free shipping over ₹999
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600 shrink-0 snap-start">
              <RotateCcw className="w-5 h-5 text-neutral-400 shrink-0" /> {product.return_policy || "Easy Replacement on Damaged/Defective Delivery"}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600 shrink-0 snap-start">
              <ShieldCheck className="w-5 h-5 text-neutral-400 shrink-0" /> {product.warranty_info || "1-year warranty"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16">
        <div className="flex gap-6 border-b border-neutral-200 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium -mb-px border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-neutral-950 text-neutral-950"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="py-8 max-w-3xl">
          {tab === "description" && (
            <div className="space-y-4 text-neutral-600">
              {product.description ? (
                <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
              ) : (
                <p>{product.tagline}</p>
              )}
              {product.highlights.length > 0 && (
                <ul className="space-y-2">
                  {product.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              <ul className="space-y-2 mt-4 pt-4 border-t border-neutral-100">
                {[
                  "Genuine product with manufacturer warranty",
                  "Free & fast shipping on orders above ₹999",
                  "Easy Replacement on Damaged/Defective Delivery",
                  "Secure encrypted checkout",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "specs" && (
            <div className="border border-neutral-200 rounded-2xl overflow-hidden text-sm">
              {[
                ["Brand", product.brand],
                ["Category", product.categoryName || product.category],
                ["SKU", product.sku || "—"],
                ["Availability", outOfStock ? "Out of stock" : lowStock ? `Only ${stockAvailable} left` : "In stock"],
                ...(product.variants?.map((v) => [`Variant — ${v.name}`, inr(v.price)] as [string, string]) || []),
                ...(product.specs || []).map((s) => [s.name, s.value] as [string, string]),
              ].map(([k, v], i) => (
                <div key={`${k}-${i}`} className={`flex justify-between gap-4 px-4 py-3 ${i % 2 ? "bg-neutral-50" : ""}`}>
                  <span className="text-neutral-500 capitalize">{k}</span>
                  <span className="font-medium text-neutral-900 text-right">{v}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "reviews" && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-500">
                No reviews have been written for this product yet. Purchased it? Your feedback
                helps other shoppers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related products carousel */}
      {related.length > 0 && (
        <section className="mt-10" aria-label="Related products">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">You may also like</h2>
            <Link href="/shop" className="text-sm font-medium hover:text-neutral-500">
              View all →
            </Link>
          </div>
          <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 ">
            {related.map((p) => (
              <div key={p.id} className="w-[70vw] sm:w-64 shrink-0 snap-start">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 text-white absolute top-0 w-full z-10">
            <span className="text-sm font-medium">{activeImg + 1} / {images.length}</span>
            <button onClick={() => setLightboxOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 relative flex items-center justify-center">
             <div className="flex overflow-x-auto snap-x snap-mandatory h-full w-full scrollbar-hide items-center">
               {images.map((img, idx) => (
                 <div key={idx} className="w-full shrink-0 h-full relative snap-center flex items-center justify-center">
                   <div className="relative w-full h-[80vh] max-w-4xl max-h-4xl">
                     <Image src={img} alt="" fill className="object-contain" sizes="100vw" />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Heart, RefreshCw, Eye, Star, ShoppingBag, Loader2 } from "lucide-react";
import { useCart } from "./CartProvider";
import { useWishlist } from "@/lib/wishlist-context";
import { COMPARE_MAX, toggleCompare, useCompareIds } from "@/lib/compare";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { productHref, type Product } from "@/lib/products";

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { user } = useAuth();
  const wishlist = useWishlist();
  const compareIds = useCompareIds();
  const router = useRouter();
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);

  const href = productHref(product);
  const wished = wishlist.has(product.id);
  const comparing = compareIds.includes(product.id);
  const outOfStock = !product.inStock;

  const handleWishlist = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname || "/shop")}`);
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

  const handleAdd = async () => {
    if (outOfStock) return;
    setAdding(true);
    const ok = await add({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      mrp: product.mrp,
      img: product.img,
    });
    if (ok) toast.success("Added to cart");
    setAdding(false);
  };

  return (
    <div className="group flex h-full flex-col bg-white rounded-2xl border border-neutral-100 p-2 sm:p-3">
      {/* Image */}
      <div className="relative overflow-hidden rounded-xl bg-neutral-100 hover-swap aspect-square">
        <Link href={href} aria-label={product.name}>
          <span className="img-primary absolute inset-0 block">
            <Image
              src={product.img}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          </span>
          <span className="img-secondary absolute inset-0 block">
            <Image
              src={product.imgHover || product.img}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          </span>
        </Link>

        {product.discount > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-green-600 text-white text-[11px] font-semibold px-2 py-1 rounded-md z-10">
            {product.discount}% OFF
          </span>
        )}
        {outOfStock && (
          <span className="absolute top-2.5 left-2.5 bg-neutral-900/90 text-white text-[11px] font-semibold px-2 py-1 rounded-md z-10">
            Out of stock
          </span>
        )}

        {/* Wishlist — always visible */}
        <button
          onClick={handleWishlist}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className={`absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full grid place-items-center shadow-sm transition-colors ${
            wished ? "bg-red-500 text-white" : "bg-white/90 text-neutral-700 hover:text-red-500"
          }`}
        >
          <Heart className={`w-4 h-4 ${wished ? "fill-white" : ""}`} />
        </button>

        {/* Compare + quick view — hover reveal on desktop, always on mobile */}
        <div className="absolute right-2.5 top-14 flex flex-col gap-2 lg:opacity-0 lg:translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 lg:transition-all z-10">
          <button
            onClick={handleCompare}
            aria-label={comparing ? "Remove from compare" : "Add to compare"}
            aria-pressed={comparing}
            className={`w-8 h-8 rounded-full grid place-items-center shadow-sm transition-colors ${
              comparing ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link
            href={href}
            aria-label="Quick view"
            className="w-8 h-8 rounded-full grid place-items-center bg-white text-neutral-700 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2 min-h-[24px]">
          <p className="text-sm uppercase tracking-wider text-neutral-500 pt-0.5 truncate">
            {product.brand}
          </p>
          {typeof product.rating === "number" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 text-[11px] font-semibold text-green-600 shrink-0">
              <Star className="w-3 h-3 fill-green-600 text-green-600" />
              {product.rating}
              {!!product.reviews && <span className="text-green-500">({product.reviews})</span>}
            </span>
          )}
        </div>

        <Link
          href={href}
          className="block mt-1 font-medium text-[15px] leading-snug line-clamp-2 hover:text-neutral-500"
        >
          {product.name}
        </Link>

        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-[15px]">{inr(product.price)}</span>
          {product.mrp > product.price && (
            <span className="text-neutral-400 line-through text-xs">{inr(product.mrp)}</span>
          )}
          {product.discount > 0 && (
            <span className="text-green-600 text-xs font-semibold">{product.discount}% OFF</span>
          )}
        </div>

        {product.stockAvailable != null && product.stockAvailable > 0 && product.stockAvailable <= 5 && (
          <p className="text-[11px] text-amber-600 mt-1">Only {product.stockAvailable} left</p>
        )}

        <p className="text-[11px] text-neutral-500 mt-1">Dispatched in 24-48 hrs</p>

        <div className="mt-auto pt-3">
          <button
            onClick={handleAdd}
            disabled={outOfStock || adding}
            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
            {outOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

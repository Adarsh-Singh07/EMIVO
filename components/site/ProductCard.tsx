"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, RefreshCw, Eye, Star, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { toast } from "sonner";
import type { Product } from "@/lib/products";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [wish, setWish] = useState(false);

  return (
    <div className="group bg-white rounded-2xl border border-neutral-100 p-2 sm:p-3">
      {/* Image */}
      <div className="relative overflow-hidden rounded-xl bg-neutral-50 hover-swap aspect-square">
        <Link href={`/product/${product.id}`}>
          <img
            src={product.img}
            alt={product.name}
            className="img-primary absolute inset-0 w-full h-full object-cover"
          />
          <img
            src={product.imgHover || product.img}
            alt=""
            className="img-secondary absolute inset-0 w-full h-full object-cover"
          />
        </Link>

        {product.discount > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-green-600 text-white text-[11px] font-semibold px-2 py-1 rounded-md">
            {product.discount}% OFF
          </span>
        )}

        {/* Wishlist — always visible */}
        <button
          onClick={() => setWish((v) => !v)}
          aria-label={wish ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wish}
          className={`absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full grid place-items-center shadow-sm transition-colors ${
            wish ? "bg-red-500 text-white" : "bg-white/90 text-neutral-700 hover:text-red-500"
          }`}
        >
          <Heart className={`w-4 h-4 ${wish ? "fill-white" : ""}`} />
        </button>

        {/* Compare + quick view — hover reveal on desktop, always on mobile */}
        <div className="absolute right-2.5 top-14 flex flex-col gap-2 lg:opacity-0 lg:translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 lg:transition-all">
          <button
            aria-label="Compare"
            className="w-8 h-8 rounded-full grid place-items-center bg-white text-neutral-700 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link
            href={`/product/${product.id}`}
            aria-label="Quick view"
            className="w-8 h-8 rounded-full grid place-items-center bg-white text-neutral-700 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500 pt-0.5">
            {product.brand}
          </p>
          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 text-[11px] font-semibold text-green-600 shrink-0">
            <Star className="w-3 h-3 fill-green-600 text-green-600" />
            {product.rating}
            <span className="text-green-500">({product.reviews})</span>
          </span>
        </div>

        <Link
          href={`/product/${product.id}`}
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

        <p className="text-[11px] text-neutral-500 mt-1">Dispatched in 24-48 hrs</p>

        <button
          onClick={() => {
            add(product);
            toast.success("Added to cart");
          }}
          className="mt-3 w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          <ShoppingBag className="w-4 h-4" /> Add to Cart
        </button>
      </div>
    </div>
  );
}

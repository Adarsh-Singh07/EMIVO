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
    <div className="group">
      <div className="relative overflow-hidden rounded-2xl bg-neutral-50 hover-swap aspect-square">
        <Link href={`/product/${product.id}`}>
          <img
            src={product.img}
            alt={product.name}
            className="img-primary absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <img
            src={product.imgHover || product.img}
            alt=""
            className="img-secondary absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {product.discount > 0 && (
          <span className="absolute top-3 left-3 bg-neutral-950 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            {product.discount}%
          </span>
        )}
        {product.rating >= 4.5 && (
          <span className="absolute top-3 right-3 bg-white text-neutral-900 text-[11px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {product.rating}
          </span>
        )}

        <div className="absolute right-3 top-14 flex flex-col gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
          <button
            onClick={() => setWish((v) => !v)}
            aria-label="Add to wishlist"
            className={`w-9 h-9 rounded-full grid place-items-center shadow-sm ${
              wish ? "bg-neutral-950 text-white" : "bg-white text-neutral-800"
            }`}
          >
            <Heart className="w-4 h-4" />
          </button>
          <button
            aria-label="Compare"
            className="w-9 h-9 rounded-full grid place-items-center bg-white text-neutral-800 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href={`/product/${product.id}`}
            aria-label="Quick view"
            className="w-9 h-9 rounded-full grid place-items-center bg-white text-neutral-800 shadow-sm"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>

        <button
          onClick={() => {
            add(product);
            toast.success("Added to cart");
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] h-10 rounded-full bg-neutral-950 text-white text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all inline-flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" /> Add to cart
        </button>
      </div>

      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-wider text-neutral-500">{product.brand}</p>
        <Link
          href={`/product/${product.id}`}
          className="block mt-1 font-medium text-[15px] line-clamp-1 hover:text-neutral-500"
        >
          {product.name}
        </Link>
        <div className="mt-1.5 flex items-baseline gap-2">
          {product.mrp > product.price && (
            <span className="text-neutral-400 line-through text-sm">{inr(product.mrp)}</span>
          )}
          <span className="font-semibold">{inr(product.price)}</span>
        </div>
      </div>
    </div>
  );
}

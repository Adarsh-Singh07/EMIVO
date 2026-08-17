"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { useRecentlyViewed } from "@/lib/compare";
import { inr } from "@/lib/format";
import { productHref } from "@/lib/products";

/** Horizontal strip of recently-viewed products (localStorage-backed). */
export default function RecentlyViewedStrip() {
  const items = useRecentlyViewed();

  if (items.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-label="Recently viewed">
      <div className="flex items-end justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-neutral-400" />
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Recently viewed</h2>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {items.map((p) => (
          <Link
            key={p.id}
            href={productHref({ id: p.id, slug: p.slug })}
            className="group w-40 sm:w-48 shrink-0 snap-start"
          >
            <span className="relative block aspect-square rounded-2xl overflow-hidden bg-neutral-100 mb-2">
              {p.img ? (
                <Image
                  src={p.img}
                  alt={p.name}
                  fill
                  sizes="192px"
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              ) : null}
            </span>
            <span className="block text-sm font-medium leading-snug line-clamp-2">{p.name}</span>
            <span className="block text-sm font-semibold mt-1">{inr(p.price)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

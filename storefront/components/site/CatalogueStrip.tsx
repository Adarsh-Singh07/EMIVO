"use client";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/site/ProductCard";
import { type Product } from "@/lib/products";

interface CatalogueStripProps {
  id: string;
  title: string;
  eyebrow?: string | null;
  subtitle?: string | null;
  category_link?: string | null;
  products: Product[];
}

export default function CatalogueStrip({ title, eyebrow, subtitle, category_link, products }: CatalogueStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">{eyebrow}</p>
          )}
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
        </div>
        {category_link && (
          <Link
            href={category_link}
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900 flex items-center gap-1.5 shrink-0 transition-colors"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Horizontal scroll strip */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="snap-start flex-shrink-0 w-[175px] sm:w-[210px] md:w-[230px] lg:w-[240px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { Product } from "@/types/product";
import { MOCK_PRODUCTS } from "@/lib/data";
import Image from "next/image";
import { ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";

interface SimilarProductsProps {
  product: Product;
}

export function SimilarProducts({ product }: SimilarProductsProps) {
  if (!product.recommendations || product.recommendations.length === 0) return null;

  // Resolve recommended products from the catalog
  const recommendations = product.recommendations.map(rec => {
    const matchedProduct = MOCK_PRODUCTS.find(p => p.id === rec.productId);
    return {
      product: matchedProduct,
      reason: rec.reason
    };
  }).filter(rec => rec.product !== undefined);

  if (recommendations.length === 0) return null;

  return (
    <section className="py-16 md:py-24 border-t border-[var(--color-border)]">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">You may also like</h3>
          <p className="text-[var(--color-secondary)] text-lg md:text-xl max-w-xl">
            We've analyzed your selection. Here are some alternatives that might fit your needs perfectly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {recommendations.map((rec, idx) => {
          const p = rec.product!;
          return (
            <div key={p.id} className="group relative flex flex-col sm:flex-row bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] overflow-hidden hover:border-[var(--color-foreground)] transition-colors">
              
              {/* Product Image */}
              <div className="relative w-full sm:w-2/5 aspect-square sm:aspect-auto bg-black/5 p-6 flex items-center justify-center">
                <div className="relative w-full h-full">
                  <Image 
                    src={p.gallery[0]?.url || ""} 
                    alt={p.title} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] mix-blend-multiply" 
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col p-6 md:p-8 flex-1">
                
                {/* AI Reason Badge */}
                <div className="flex items-start gap-2 mb-6 p-3 bg-[var(--color-foreground)] text-[var(--color-background)] rounded-xl">
                  <Lightbulb className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Why we recommend this</div>
                    <div className="text-sm font-semibold">{rec.reason}</div>
                  </div>
                </div>

                <span className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--color-secondary)] mb-2">
                  {p.brand}
                </span>
                
                <h4 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
                  {p.title}
                </h4>

                <div className="text-lg font-semibold mt-auto mb-6">
                  ₹{p.basePrice.toLocaleString('en-IN')}
                </div>

                <Link 
                  href={`/product/${p.id}`}
                  className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--color-primary)] hover:gap-4 transition-all"
                >
                  View details <ArrowRight className="w-4 h-4" />
                </Link>

              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}

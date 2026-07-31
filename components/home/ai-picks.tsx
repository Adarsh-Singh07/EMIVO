"use client";

import { MOCK_PRODUCTS } from "@/lib/data";
import { ProductCard } from "@/components/product-card";
import { Sparkles } from "lucide-react";

export function AiPicks() {
  // Taking a few products to simulate AI recommendations
  const recommended = MOCK_PRODUCTS.slice(0, 4);

  return (
    <section className="py-24 bg-[var(--color-background)]">
      <div className="container-emivo">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-3 rounded-full ai-glass shadow-sm inline-flex">
            <Sparkles className="w-6 h-6 text-[var(--color-accent)]" />
          </div>
          <div>
            <span className="text-eyebrow text-[var(--color-accent)] block mb-1">EMIVO Intelligence</span>
            <h2 className="text-heading">Curated for you.</h2>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommended.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, CompareModel } from "@/types/product";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CompareModelsProps {
  product: Product;
}

export function CompareModels({ product }: CompareModelsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!product.compareModels || product.compareModels.length === 0) return null;

  // Include current product in comparison (simulated format)
  const currentModel: CompareModel = {
    id: product.id,
    name: product.title,
    image: product.gallery[0]?.url || "",
    price: product.basePrice,
    baseEMI: product.baseEMI,
    quickSpecs: {
      camera: "Advanced Pro Camera System",
      display: "Premium OLED Display",
      battery: "All-day battery life",
      performance: "Latest Gen Processor"
    },
    fullSpecs: {
      "Display Size": "Various",
      "Resolution": "High Definition",
      "Weight": "Optimized",
      "Material": "Premium"
    }
  };

  const allModels = [currentModel, ...product.compareModels];
  
  // Extract all unique spec keys for the full table
  const allSpecKeys = Array.from(new Set(
    allModels.flatMap(m => Object.keys(m.fullSpecs))
  ));

  return (
    <section className="py-16 md:py-24 border-t border-[var(--color-border)]">
      <div className="mb-12 md:mb-16 text-center max-w-2xl mx-auto">
        <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Which model is right for you?</h3>
        <p className="text-[var(--color-secondary)] text-lg md:text-xl">Compare specs, features and pricing to find your perfect match.</p>
      </div>

      {/* Level 1: Large Comparison Cards */}
      <div className="flex overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-4 md:gap-8 w-max mx-auto">
          {allModels.map((model, idx) => {
            const isCurrent = idx === 0;
            return (
              <div key={model.id} className={`snap-center shrink-0 w-[280px] md:w-[320px] flex flex-col p-6 rounded-3xl ${isCurrent ? 'bg-[var(--color-surface)] border-2 border-[var(--color-foreground)]' : 'bg-black/5 border border-transparent'}`}>
                
                {isCurrent && (
                  <div className="mb-4">
                    <span className="bg-[var(--color-foreground)] text-[var(--color-background)] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Current Selection
                    </span>
                  </div>
                )}
                
                {/* Image */}
                <div className={`relative aspect-[3/4] w-full mb-8 ${!isCurrent && 'mt-8'}`}>
                  <Image 
                    src={model.image} 
                    alt={model.name} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-contain drop-shadow-2xl mix-blend-multiply" 
                  />
                </div>

                {/* Header info */}
                <div className="text-center mb-8">
                  <h4 className="text-xl md:text-2xl font-bold mb-2">{model.name}</h4>
                  <div className="text-lg font-semibold">From ₹{model.price.toLocaleString('en-IN')}</div>
                  <div className="text-sm text-[var(--color-secondary)]">or ₹{model.baseEMI.toLocaleString('en-IN')}/mo.</div>
                </div>

                {/* Quick Specs */}
                <div className="space-y-6 mt-auto">
                  <div className="flex flex-col items-center text-center gap-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-secondary)]">Display</span>
                    <span className="text-base font-semibold">{model.quickSpecs.display}</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-secondary)]">Camera</span>
                    <span className="text-base font-semibold">{model.quickSpecs.camera}</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-secondary)]">Performance</span>
                    <span className="text-base font-semibold">{model.quickSpecs.performance}</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-secondary)]">Battery</span>
                    <span className="text-base font-semibold">{model.quickSpecs.battery}</span>
                  </div>
                </div>

                <div className="mt-10">
                  <a href={`/product/${model.id}`} className={`block w-full text-center py-3 rounded-full font-bold transition-transform hover:scale-105 active:scale-95 ${isCurrent ? 'bg-transparent border border-[var(--color-border)] text-[var(--color-foreground)]' : 'bg-[var(--color-foreground)] text-[var(--color-background)]'}`}>
                    {isCurrent ? 'Buy Now' : 'View Product'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level 2: Full Technical Comparison */}
      <div className="mt-8 flex justify-center">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-[var(--color-primary)] font-bold hover:underline"
        >
          {isExpanded ? 'Hide Technical Details' : 'View Full Technical Comparison'}
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-12 max-w-5xl mx-auto overflow-x-auto pb-4">
              <table className="w-full min-w-[600px] border-collapse">
                <tbody>
                  {allSpecKeys.map((key, i) => (
                    <tr key={key} className={i % 2 === 0 ? 'bg-black/5' : ''}>
                      <td className="py-4 px-6 font-bold text-sm text-[var(--color-secondary)] w-1/4 border-r border-[var(--color-border)]">
                        {key}
                      </td>
                      {allModels.map(model => (
                        <td key={model.id} className="py-4 px-6 font-medium text-sm text-center w-1/4">
                          {model.fullSpecs[key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, BundleAccessory } from "@/types/product";
import Image from "next/image";
import { Plus, Check, ShoppingBag } from "lucide-react";

interface AccessoriesBundleProps {
  product: Product;
}

export function AccessoriesBundle({ product }: AccessoriesBundleProps) {
  if (!product.accessories || product.accessories.length === 0) return null;

  // By default, let's select the first accessory to show how the bundle works
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set([product.accessories[0].id])
  );

  const toggleAccessory = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectedAccessories = product.accessories.filter((a) => selectedIds.has(a.id));
  
  // Calculate totals
  const productPrice = product.basePrice;
  const accessoriesTotal = selectedAccessories.reduce((sum, a) => sum + a.price, 0);
  const accessoriesMrpTotal = selectedAccessories.reduce((sum, a) => sum + a.mrp, 0);
  
  // Bundle math
  const bundleDiscount = 1500; // Mock 1500 Rs off when buying as a bundle
  const isBundleActive = selectedAccessories.length > 0;
  
  const finalPrice = productPrice + accessoriesTotal - (isBundleActive ? bundleDiscount : 0);
  const originalTotal = productPrice + accessoriesMrpTotal;
  const savings = originalTotal - finalPrice;
  
  // EMI calculation (Mock: 12 months at 15% interest simplified)
  const monthlyEMI = Math.round(finalPrice / 12);
  const emiDifference = isBundleActive ? Math.round((accessoriesTotal - bundleDiscount) / 12) : 0;

  return (
    <section className="py-12 border-t border-[var(--color-border)]">
      <div className="mb-10">
        <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Complete Your Setup</h3>
        <p className="text-[var(--color-secondary)] text-lg">Add perfectly matched accessories to get more out of your {product.title}.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left: Visual Bundle Builder */}
        <div className="lg:col-span-8 flex flex-wrap items-center gap-4 md:gap-6 p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl overflow-hidden">
          
          {/* Main Product */}
          <div className="relative flex flex-col items-center gap-4 group">
            <div className="relative w-24 h-24 md:w-32 md:h-32 bg-black/5 rounded-2xl flex items-center justify-center p-3">
              <Image 
                src={product.gallery[0]?.url || ""} 
                alt={product.title} 
                fill 
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain p-4 drop-shadow-xl" 
              />
            </div>
            <span className="text-xs font-bold text-center tracking-wide">This Item</span>
          </div>

          {/* Plus Sign */}
          <div className="flex items-center justify-center">
            <Plus className="w-6 h-6 md:w-8 md:h-8 text-[var(--color-secondary)] opacity-50" />
          </div>

          {/* Accessories List */}
          {product.accessories.map((acc, idx) => {
            const isSelected = selectedIds.has(acc.id);
            return (
              <div key={acc.id} className="flex items-center gap-4 md:gap-6">
                <button 
                  onClick={() => toggleAccessory(acc.id)}
                  className={`relative flex flex-col items-center gap-4 group transition-all ${isSelected ? 'opacity-100 scale-105' : 'opacity-50 hover:opacity-80 scale-95'}`}
                >
                  <div className={`relative w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center p-3 transition-colors ${isSelected ? 'bg-[var(--color-foreground)]/5 border-2 border-[var(--color-foreground)]' : 'bg-black/5 border-2 border-transparent'}`}>
                    <Image 
                      src={acc.image} 
                      alt={acc.name} 
                      fill 
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-contain p-4 drop-shadow-md mix-blend-multiply" 
                    />
                    
                    {/* Selection Checkmark */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute -top-3 -right-3 w-8 h-8 bg-[var(--color-foreground)] text-[var(--color-background)] rounded-full flex items-center justify-center shadow-lg z-10"
                        >
                          <Check className="w-4 h-4" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="text-xs font-semibold text-center max-w-[100px] truncate leading-tight">{acc.name}</span>
                </button>

                {/* Show plus sign if not the last accessory */}
                {idx < product.accessories!.length - 1 && (
                  <div className="flex items-center justify-center">
                    <Plus className="w-6 h-6 md:w-8 md:h-8 text-[var(--color-secondary)] opacity-30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Price Calculation & CTA */}
        <div className="lg:col-span-4 sticky top-32 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 shadow-sm">
          <h4 className="text-xl font-bold tracking-tight mb-6">Bundle Summary</h4>
          
          <div className="space-y-4 mb-6 text-sm md:text-base font-medium">
            <div className="flex justify-between items-center text-[var(--color-secondary)]">
              <span>{product.title}</span>
              <span>₹{productPrice.toLocaleString('en-IN')}</span>
            </div>
            
            <AnimatePresence>
              {selectedAccessories.map(acc => (
                <motion.div 
                  key={acc.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex justify-between items-center text-[var(--color-secondary)] overflow-hidden"
                >
                  <span className="truncate pr-4">+ {acc.name}</span>
                  <span className="shrink-0">₹{acc.price.toLocaleString('en-IN')}</span>
                </motion.div>
              ))}
            </AnimatePresence>

            {isBundleActive && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="flex justify-between items-center text-[var(--color-accent)] pt-2 border-t border-[var(--color-border)] border-dashed"
              >
                <span>Bundle Discount</span>
                <span>- ₹{bundleDiscount.toLocaleString('en-IN')}</span>
              </motion.div>
            )}
          </div>

          <div className="pt-6 border-t border-[var(--color-border)]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-bold text-lg">Total</span>
              <span className="text-3xl font-bold tracking-tight">₹{finalPrice.toLocaleString('en-IN')}</span>
            </div>
            
            {savings > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-secondary)] line-through">₹{originalTotal.toLocaleString('en-IN')}</span>
                <span className="text-[var(--color-accent)] font-semibold border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-2 py-0.5 rounded">
                  Save ₹{savings.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          <div className="mt-8 mb-6 p-4 bg-black/5 rounded-2xl flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Monthly EMI</span>
              <span className="text-xs text-[var(--color-secondary)]">12 months • No Cost</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold">₹{monthlyEMI.toLocaleString('en-IN')}/mo</span>
              {emiDifference > 0 && (
                <span className="text-xs text-[var(--color-accent)] font-medium">Just +₹{emiDifference.toLocaleString('en-IN')}/mo extra</span>
              )}
            </div>
          </div>

          <button className="w-full h-14 bg-[var(--color-foreground)] text-[var(--color-background)] rounded-full font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Add Bundle to Order
          </button>
        </div>

      </div>
    </section>
  );
}

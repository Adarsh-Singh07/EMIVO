"use client";

import { useProduct } from "./product-context";
import { ShieldCheck, Zap, Truck, Store, Gift, ChevronDown, Check } from "lucide-react";
import { LedgerFigure } from "@/components/ui/ledger-figure";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart";
import { toast } from "sonner";

export function PurchasePanel() {
  const {
    product,
    selectedColor, setSelectedColor,
    selectedStorage, setSelectedStorage,
    dynamicPrice, dynamicEMI
  } = useProduct();

  const addItem = useCartStore((state) => state.addItem);
  const selectedColorVariant = product.colors.find(c => c.id === selectedColor);
  const selectedStorageVariant = product.storageOptions.find(s => s.id === selectedStorage);

  const handleAddToCart = () => {
    addItem({
      product,
      quantity: 1,
      selectedColor: selectedColorVariant,
      selectedStorage: selectedStorageVariant,
    });
    toast.success(`${product.title} added to cart!`);
  };

  return (
    <div className="bg-[var(--color-surface)]/80 backdrop-blur-2xl border border-[var(--color-border)] rounded-[2rem] shadow-[var(--shadow-xl)] flex flex-col lg:max-h-[calc(100vh-8rem)] relative lg:overflow-hidden">
      
      {/* Scrollable Content */}
      <div className="p-6 md:p-8 flex flex-col gap-8 lg:overflow-y-auto scrollbar-hide flex-1 lg:pb-32">
        {/* 1. Hierarchy: Brand -> Name -> Price -> EMI */}
        <div className="space-y-2">
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--color-secondary)]">
            {product.brand}
          </span>
          
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-foreground)]">
            {product.title}
          </h1>
          
          <div className="pt-4 pb-2">
            <div className="flex items-baseline gap-3">
              <LedgerFigure paisa={dynamicPrice} size="xl" />
              <span className="text-sm text-[var(--color-secondary)] line-through">
                MRP <LedgerFigure paisa={product.mrp + (dynamicPrice - product.basePrice)} noLine />
              </span>
            </div>
          </div>

          <div className="p-4 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-xl font-bold text-[var(--color-foreground)]">0% EMI Available</span>
              <span className="text-xs font-medium text-[var(--color-secondary)]">No Hidden Charges • Instant Approval</span>
            </div>
            <Zap className="w-6 h-6 text-[var(--color-accent)]" />
          </div>
        </div>

        {/* 2. Configuration Selectors */}
        <div className="space-y-6 border-t border-[var(--color-border)] pt-6">
          
          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[var(--color-secondary)] uppercase tracking-wider text-xs">Color</span>
                <span className="font-medium">{product.colors.find(c => c.id === selectedColor)?.name}</span>
              </div>
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <button 
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`w-10 h-10 rounded-full border-2 ${selectedColor === color.id ? 'border-[var(--color-foreground)]' : 'border-transparent'} ring-1 ring-[var(--color-border)] hover:scale-110 transition-transform`} 
                    style={{ backgroundColor: color.hex || '#ccc' }} 
                    aria-label={`Select ${color.name}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Storage */}
          {product.storageOptions && product.storageOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-[var(--color-secondary)] uppercase tracking-wider text-xs">Storage</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {product.storageOptions.map((storage) => (
                  <button 
                    key={storage.id}
                    onClick={() => setSelectedStorage(storage.id)}
                    className={`py-3 rounded-xl border font-medium text-sm transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedStorage === storage.id
                        ? 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)] shadow-md' 
                        : 'border-[var(--color-border)] hover:border-[var(--color-foreground)] bg-[var(--color-surface)]'
                    }`}
                  >
                    <span>{storage.name}</span>
                    {storage.priceModifier !== undefined && storage.priceModifier > 0 && (
                      <LedgerFigure
                        paisa={storage.priceModifier}
                        size="xs"
                        noLine
                        className={selectedStorage === storage.id ? 'text-[var(--color-background)] opacity-80' : 'text-[var(--color-secondary)]'}
                        aria-label={`Additional ${storage.priceModifier} paisa`}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* 3. Finance & Offers */}
        <div className="space-y-4 border-t border-[var(--color-border)] pt-6">
          {/* Bank Offers */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/50">
            <Gift className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold mb-1">Bank Offers Available</div>
              <div className="text-xs text-[var(--color-secondary)] leading-relaxed">
                Up to ₹5,000 instant discount on HDFC & ICICI Credit Cards.
              </div>
              <button className="text-xs font-semibold text-[var(--color-primary)] mt-2 hover:underline">View 8 more offers</button>
            </div>
          </div>

          {/* Exchange */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/50 cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
            <div>
              <div className="text-sm font-bold">Trade in your old device</div>
              <div className="text-xs text-[var(--color-secondary)]">Get up to ₹25,000 off</div>
            </div>
            <ChevronDown className="w-5 h-5 text-[var(--color-secondary)]" />
          </div>
        </div>

        {/* 4. Logistics & Trust */}
        <div className="space-y-4 border-t border-[var(--color-border)] pt-6">
          
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-[var(--color-secondary)] shrink-0" />
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                Order within 2h 14m
                <span className="px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded text-[10px] font-bold uppercase tracking-wider">Fast</span>
              </div>
              <div className="text-xs font-semibold mt-0.5">{product.deliveryEstimate}</div>
              <button className="text-[10px] font-medium text-[var(--color-primary)] hover:underline mt-1">Check another PIN</button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Store className="w-5 h-5 text-[var(--color-secondary)] shrink-0" />
            <div>
              <div className="text-sm font-bold">Available at Sharma Electronics</div>
              <div className="text-xs font-medium text-[var(--color-secondary)] mt-0.5">2.8 km away • Pickup Today</div>
              <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-semibold">
                <Check className="w-3.5 h-3.5" /> In Stock
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[var(--color-secondary)] shrink-0" />
            <div>
              <div className="text-sm font-bold">Warranty & Protection</div>
              <div className="text-xs text-[var(--color-secondary)] mt-0.5">{product.warranty}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. CTAs (Inline on mobile, Absolute sticky on desktop) */}
      <div className="mt-8 lg:mt-0 lg:absolute lg:bottom-0 left-0 right-0 p-6 md:p-8 lg:pt-4 bg-transparent lg:bg-gradient-to-t lg:from-[var(--color-surface)] lg:via-[var(--color-surface)] lg:to-transparent space-y-3 lg:border-t lg:border-[var(--color-border)]/50 z-20 lg:shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <Button variant="accent" size="lg" className="w-full rounded-full text-base font-bold">
          Buy on EMI @ <LedgerFigure paisa={dynamicEMI} size="sm" noLine suffix="/mo" tone="on-dark" />
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleAddToCart} className="flex-1 rounded-full">
            Add to Cart
          </Button>
          <Button variant="outline" asChild className="flex-1 rounded-full">
            <a href="#compare">Compare</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

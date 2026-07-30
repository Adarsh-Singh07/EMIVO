"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { mockProducts } from "@/lib/mock/products";
import { formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Star, Shield, Truck, RotateCcw, Heart, Share2, Info } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const product = mockProducts.find(p => p.id === slug) || mockProducts[0]; // fallback for demo
  
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface-elevated)] border border-[var(--color-border)] relative">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage}
                src={product.images[activeImage]}
                alt={product.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute top-4 right-4 flex gap-2">
              <button className="p-3 rounded-full bg-white/80 backdrop-blur text-gray-600 hover:text-red-500 shadow-sm transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-full bg-white/80 backdrop-blur text-gray-600 hover:text-blue-500 shadow-sm transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`aspect-square rounded-[var(--radius-md)] overflow-hidden border-2 transition-colors ${activeImage === idx ? 'border-[var(--color-primary)]' : 'border-transparent hover:border-[var(--color-border)]'}`}
              >
                <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-2 text-sm font-bold text-[var(--color-accent)] tracking-wider uppercase">
            {product.brand}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
            {product.name}
          </h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-600 px-2 py-1 rounded">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="font-bold">{product.rating}</span>
            </div>
            <span className="text-[var(--color-text-secondary)] underline decoration-dotted underline-offset-4 cursor-pointer">
              {product.review_count} Ratings & Reviews
            </span>
          </div>

          <div className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-8">
            {formatINR(product.price_paisa)}
          </div>

          {/* EMI Options Panel */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)]">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg">Compare EMI Options</h3>
            </div>
            
            <div className="space-y-4">
              {product.emi_providers.map((emi, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
                  <div className="mb-3 sm:mb-0">
                    <div className="font-bold text-[var(--color-text-primary)]">{emi.name}</div>
                    <div className="text-sm text-[var(--color-text-secondary)]">
                      {emi.tenure} Months • Processing Fee: ₹{emi.processing_fee}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-lg text-[var(--color-accent)]">₹{emi.monthly_amount}/mo</div>
                    </div>
                    <Button size="sm" variant="outline">Apply</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <Button size="lg" className="flex-1 h-14 text-lg">Add to Cart</Button>
            <Button size="lg" variant="secondary" className="flex-1 h-14 text-lg">Buy Now</Button>
          </div>

          {/* Trust Signals */}
          <div className="grid grid-cols-3 gap-4 border-t border-b border-[var(--color-border)] py-6 mb-8">
            <div className="flex flex-col items-center text-center gap-2 text-[var(--color-text-secondary)]">
              <Truck className="w-6 h-6" />
              <span className="text-sm font-medium">Free Delivery</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2 text-[var(--color-text-secondary)]">
              <RotateCcw className="w-6 h-6" />
              <span className="text-sm font-medium">7 Days Return</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2 text-[var(--color-text-secondary)]">
              <Shield className="w-6 h-6" />
              <span className="text-sm font-medium">1 Year Warranty</span>
            </div>
          </div>

          {/* Specs */}
          <div>
            <h3 className="font-bold text-lg mb-4">Key Specifications</h3>
            <div className="grid gap-y-2">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="flex py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="w-1/3 text-[var(--color-text-secondary)] font-medium">{key}</span>
                  <span className="w-2/3 font-semibold text-[var(--color-text-primary)]">{value as React.ReactNode}</span>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "@/components/product-card";
import { MOCK_PRODUCTS } from "@/lib/data";
import { Sparkles, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  
  const categories = ["All", "Smartphone", "Laptop", "TV", "Audio", "Accessories"];
  
  const filteredProducts = activeCategory === "All" 
    ? MOCK_PRODUCTS 
    : MOCK_PRODUCTS.filter(p => p.category === activeCategory);

  const transitionConfig = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: transitionConfig
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] pt-24 pb-20">
      <div className="container-emivo flex flex-col lg:flex-row gap-12">
        
        {/* Left Sidebar: Sticky Filter Architecture */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="sticky top-24">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-foreground)] mb-8">
              The Catalog.
            </h1>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-eyebrow mb-4">Categories</h3>
                <ul className="space-y-1">
                  {categories.map((cat) => (
                    <li key={cat}>
                      <button
                        onClick={() => setActiveCategory(cat)}
                        className={`w-full text-left px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors flex items-center justify-between ${
                          activeCategory === cat 
                            ? "bg-black text-white" 
                            : "text-[var(--color-secondary)] hover:bg-black/5 hover:text-black"
                        }`}
                      >
                        {cat}
                        {activeCategory === cat && <Check className="w-4 h-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8 border-t border-[var(--color-border)]">
                <h3 className="text-eyebrow mb-4">Price</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[var(--color-surface)] rounded-md px-3 py-2 text-sm text-[var(--color-secondary)]">Min</div>
                  <span className="text-[var(--color-secondary)]">-</span>
                  <div className="flex-1 bg-[var(--color-surface)] rounded-md px-3 py-2 text-sm text-[var(--color-secondary)]">Max</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content: AI Injection + Dense Grid */}
        <div className="flex-1 min-w-0">
          
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            {/* AI Summary Pill */}
            <div className="ai-glass px-5 py-4 rounded-[var(--radius-card)] flex gap-4 items-start max-w-2xl">
              <Sparkles className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-bold block mb-1">EMIVO Intelligence</span>
                <p className="text-sm text-[var(--color-secondary)] leading-relaxed">
                  {activeCategory === "All" 
                    ? "Currently showing our entire premium collection. Many of these flagship devices feature high-margin exchange offers today."
                    : activeCategory === "Smartphone"
                    ? "Most smartphones in this range focus on camera parity. If you prioritize video, lean towards Apple; for zoom and stylus, lean towards Samsung."
                    : `Showing the best in ${activeCategory}. Consider balancing performance specs with battery longevity based on your usage.`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm text-[var(--color-secondary)]">{filteredProducts.length} Results</span>
              <Button variant="outline" className="rounded-full">
                Sort by: Featured <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Product Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, index) => (
                <React.Fragment key={product.id}>
                  <motion.div
                    variants={itemVariants}
                    layout
                    className="col-span-1"
                  >
                    <ProductCard product={product} />
                  </motion.div>
                  
                  {/* Editorial Break after 4th product */}
                  {index === 3 && activeCategory === "All" && (
                    <motion.div 
                      layout
                      variants={itemVariants}
                      className="col-span-full my-8 bg-black text-white rounded-2xl overflow-hidden relative"
                    >
                      <div className="absolute inset-0 z-0">
                        <img 
                          src="https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=2000&auto=format&fit=crop" 
                          alt="MacBook Campaign"
                          className="w-full h-full object-cover opacity-50 mix-blend-luminosity"
                        />
                      </div>
                      <div className="relative z-10 p-12 md:p-20 text-center max-w-3xl mx-auto">
                        <span className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4 block">Apple Silicon</span>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">M3. Scary fast.</h2>
                        <p className="text-lg text-gray-300 mb-8">MacBook Air sails through work and play — and the M3 chip brings even greater capabilities and advanced AI features to this super-portable laptop.</p>
                        <Button variant="outline" className="rounded-full bg-white text-black hover:bg-gray-200 border-none px-8">
                          Shop Mac
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </React.Fragment>
              ))}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

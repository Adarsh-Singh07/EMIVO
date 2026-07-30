"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/product-card";
import { mockProducts } from "@/lib/mock/products";
import { Filter, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Smartphone", "Laptop", "TV", "Audio", "Appliance"];
  
  const filteredProducts = activeCategory === "All" 
    ? mockProducts 
    : mockProducts.filter(p => p.category === activeCategory);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">Shop Electronics</h1>
          <p className="text-[var(--color-text-secondary)]">Showing {filteredProducts.length} products</p>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <Button variant="outline" className="shrink-0">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <div className="h-8 w-px bg-[var(--color-border)] mx-2 shrink-0" />
          
          {categories.map((cat) => (
            <Button 
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat)}
              className="shrink-0 rounded-[var(--radius-full)]"
            >
              {cat}
            </Button>
          ))}
          
          <Button variant="outline" className="shrink-0 ml-auto md:ml-4">
            Sort by: Popular <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Product Grid */}
      <motion.div 
        layout
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
      >
        {filteredProducts.map((product) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </motion.div>

      {/* Pagination (UI Only) */}
      <div className="flex justify-center mt-12 gap-2">
        <Button variant="outline" disabled>Previous</Button>
        <Button variant="default">1</Button>
        <Button variant="outline">2</Button>
        <Button variant="outline">3</Button>
        <Button variant="outline">Next</Button>
      </div>
    </div>
  );
}

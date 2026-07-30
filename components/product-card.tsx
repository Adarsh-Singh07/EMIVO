"use client";

import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    brand: string;
    price_paisa: number;
    images: string[];
    emi_providers: any[];
    rating: number;
    review_count: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { theme } = useTheme();
  
  // Theme A has subtle hover, Theme B has pop-out hover
  const hoverAnimation = theme === "a" 
    ? { scale: 1.02, transition: { duration: 0.2 } }
    : { scale: 1.05, y: -4, transition: { duration: 0.3, type: "spring", stiffness: 300 } };

  const minEmi = Math.min(...product.emi_providers.map(p => p.monthly_amount));

  return (
    <Link href={`/products/${product.id}`}>
      <motion.div 
        whileHover={hoverAnimation}
        className="group relative flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow h-full"
      >
        <div className="absolute top-3 right-3 z-10">
          <button 
            className="p-2 rounded-full bg-white/80 backdrop-blur text-gray-600 hover:text-red-500 hover:bg-white transition-colors"
            onClick={(e) => {
              e.preventDefault();
              // Add to wishlist logic
            }}
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>
        
        <div className="relative aspect-square overflow-hidden bg-[var(--color-surface-elevated)]">
          <img 
            src={product.images[0]} 
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        <div className="p-4 flex flex-col flex-1">
          <div className="text-xs font-semibold text-[var(--color-accent)] mb-1 uppercase tracking-wider">{product.brand}</div>
          <h3 className="font-semibold text-[var(--color-text-primary)] line-clamp-2 leading-tight mb-2 flex-1">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium">{product.rating}</span>
            <span className="text-xs text-[var(--color-text-muted)]">({product.review_count})</span>
          </div>

          <div className="space-y-1">
            <div className="text-lg font-bold text-[var(--color-text-primary)]">
              {formatINR(product.price_paisa)}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] font-medium p-2 bg-[var(--color-accent)]/10 rounded-[var(--radius-sm)] border border-[var(--color-accent)]/20">
              EMI from <span className="text-[var(--color-accent)] font-bold">₹{minEmi}/mo</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

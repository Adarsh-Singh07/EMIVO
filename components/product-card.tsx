"use client";

import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { Heart, Plus, Sparkles, Repeat } from "lucide-react";
import { Product } from "@/types/product";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
  isFeatured?: boolean;
}

export function ProductCard({ product, isFeatured = false }: ProductCardProps) {
  const minEmi = product.baseEMI;
  const primaryImage = product.gallery[0]?.url || "";
  const secondaryImage = product.gallery[1]?.url || primaryImage;

  return (
    <div className="group relative flex flex-col h-full w-full rounded-2xl bg-[var(--color-surface)] hover:bg-white transition-colors duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-transparent hover:border-black/5">
      
      {/* Link Wrap */}
      <Link href={`/product/${product.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">View {product.title}</span>
      </Link>

      {/* Top Badges */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 items-start pointer-events-none">
        {isFeatured && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white text-[10px] font-bold tracking-widest uppercase shadow-sm">
            <Sparkles className="w-3 h-3 text-yellow-400" /> AI Pick
          </div>
        )}
        {minEmi > 0 && (
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold tracking-widest uppercase">
            0% EMI
          </div>
        )}
      </div>

      {/* Hover Actions (Right Side) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <button 
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] delay-75"
          aria-label="Add to wishlist"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <Heart className="w-4 h-4" />
        </button>
        <button 
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all shadow-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] delay-100"
          aria-label="Compare"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>
      
      {/* Massive Product Canvas (80% of card visual weight) */}
      <div className="relative w-full pt-[100%] bg-[#F5F5F7] group-hover:bg-transparent transition-colors duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] rounded-t-2xl overflow-hidden flex-shrink-0">
        
        {/* Primary Image */}
        <img 
          src={primaryImage} 
          alt={product.title}
          className="absolute inset-0 w-full h-full object-contain p-8 scale-100 group-hover:scale-105 group-hover:opacity-0 transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] mix-blend-multiply"
        />
        
        {/* Secondary Image (Crossfade) */}
        <img 
          src={secondaryImage} 
          alt={`${product.title} alternate view`}
          className="absolute inset-0 w-full h-full object-contain p-8 scale-95 opacity-0 group-hover:scale-105 group-hover:opacity-100 transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] mix-blend-multiply"
        />

      </div>

      {/* Typography & Merchandising Container */}
      <div className="flex flex-col flex-1 p-6 relative bg-white">
        <div className="mb-1 text-[11px] font-bold tracking-widest text-gray-400 uppercase letter-spacing-1">{product.brand}</div>
        <h3 className="font-bold text-[17px] leading-snug tracking-tight text-gray-900 mb-2 line-clamp-2">
          {product.title}
        </h3>
        
        <div className="mt-auto pt-4 flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-900">
            {formatINR(product.basePrice * 100)}
          </span>
          {minEmi > 0 && (
            <span className="text-xs font-medium text-gray-500">
              From ₹{minEmi.toLocaleString('en-IN')}/mo.
            </span>
          )}
        </div>

        {/* Add to Cart Slide-up */}
        <div className="absolute bottom-0 left-0 w-full p-6 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] bg-gradient-to-t from-white via-white to-transparent pointer-events-auto z-20">
           <button 
            className="w-full h-11 bg-black text-white rounded-full text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
           >
             Add to Bag
           </button>
        </div>
      </div>
      
    </div>
  );
}

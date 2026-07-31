"use client";

import { useProduct } from "./product-context";
import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ProductClientLayout({ children }: { children: ReactNode }) {
  const { product, selectedColor } = useProduct();
  
  const activeVariant = product.colors?.find(c => c.id === selectedColor);
  const glowHex = activeVariant?.hex || "transparent";

  return (
    <div className="relative min-h-screen text-[var(--color-foreground)] bg-[var(--color-background)] transition-colors duration-1000">
      
      {/* Ambient Wow Factor Background */}
      <AnimatePresence>
        <motion.div
          key={glowHex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.04 }} // Extremely subtle <5% as requested
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${glowHex} 0%, transparent 70%)`
          }}
        />
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

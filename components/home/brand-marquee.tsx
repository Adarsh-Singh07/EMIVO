"use client";

import { motion } from "framer-motion";

const brands = [
  "Apple", "Samsung", "Sony", "Nothing", "Bose", "Dell", "ASUS ROG", "Canon", "Nikon", "Microsoft", "OnePlus"
];

export function BrandMarquee() {
  return (
    <div className="w-full bg-[var(--color-background)] border-b border-[var(--color-border)] py-8 overflow-hidden flex items-center">
      {/* Decorative animated strip — aria-hidden so the 3× duplication isn't
          read aloud; brand names appear in the static logo grid on this page. */}
      <div className="flex w-fit animate-marquee hover:[animation-play-state:paused]" aria-hidden="true">
        {/* Duplicate array for seamless infinite scroll */}
        {[...brands, ...brands, ...brands].map((brand, i) => (
          <span 
            key={i} 
            className="mx-12 text-2xl font-bold tracking-tighter uppercase text-[var(--color-foreground)] opacity-20 hover:opacity-100 transition-opacity duration-300 cursor-default"
          >
            {brand}
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

/**
 * Fynode product carousel rows — horizontally scrollable tracks with
 * prev/next arrows. Rendered per entry in PRODUCT_CAROUSELS.
 */

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ProductCarousel, PRODUCT_CAROUSELS } from "@/lib/fynode";
import { FynodeProductCard } from "./fynode-product-card";
import { FynodeSectionHeading } from "./fynode-section-heading";

export function FynodeCarousels() {
  return (
    <div className="space-y-16">
      {PRODUCT_CAROUSELS.map((carousel) => (
        <CarouselRow key={carousel.id} carousel={carousel} />
      ))}
    </div>
  );
}

function CarouselRow({ carousel }: { carousel: ProductCarousel }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const nudge = (dir: 1 | -1) =>
    trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <FynodeSectionHeading
          eyebrow="Featured"
          title={carousel.title}
          subtitle={carousel.subtitle}
        />
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Scroll left"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-foreground)] transition hover:bg-[var(--color-foreground)] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Scroll right"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-foreground)] transition hover:bg-[var(--color-foreground)] hover:text-white"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="scrollbar-hide mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2"
      >
        {carousel.products.map((p) => (
          <div
            key={p.id}
            className="w-[240px] shrink-0 snap-start sm:w-[260px]"
          >
            <FynodeProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

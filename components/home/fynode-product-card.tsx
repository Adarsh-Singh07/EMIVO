"use client";

/**
 * Fynode-style product card: image crossfade on hover, sale badge, star
 * rating, USD price + strike-through, and an Add-to-cart / Select-options bar.
 */

import { Star } from "lucide-react";
import { FYNODE_CURRENCY, type FynodeProduct } from "@/lib/fynode";

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < filled
              ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
              : "h-3.5 w-3.5 fill-zinc-200 text-zinc-200"
          }
        />
      ))}
    </div>
  );
}

export function FynodeProductCard({ product }: { product: FynodeProduct }) {
  const primary = product.images[0];
  const secondary = product.images[1] ?? product.images[0];
  const hasSale = product.salePercent != null && product.salePercent > 0;

  return (
    <div className="fynode-product-group group relative flex h-full flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-white transition-shadow duration-300 hover:shadow-[0_14px_36px_-10px_rgba(0,0,0,0.14)]">
      {/* Image */}
      <a
        href={`/product/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-[var(--color-surface)]"
      >
        {hasSale && (
          <span className="absolute left-3 top-3 z-10 rounded-sm bg-[var(--color-fynode-accent)] px-2 py-0.5 text-[11px] font-bold text-white">
            -{product.salePercent}%
          </span>
        )}
        <img
          src={primary}
          alt={product.title}
          loading="lazy"
          className="fynode-img-primary absolute inset-0 h-full w-full object-cover p-4 transition-opacity duration-500"
        />
        {secondary !== primary && (
          <img
            src={secondary}
            alt=""
            loading="lazy"
            className="fynode-img-secondary absolute inset-0 h-full w-full object-cover p-4 opacity-0 transition-opacity duration-500"
          />
        )}
      </a>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
          {product.brand}
        </div>
        <h3 className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--color-foreground)]">
          <a
            href={`/product/${product.id}`}
            className="transition-colors hover:text-[var(--color-fynode-accent)]"
          >
            {product.title}
          </a>
        </h3>

        <div className="mt-2 flex items-center gap-1.5">
          <Stars rating={product.rating} />
          <span className="text-[12px] text-[var(--color-secondary)]">
            ({product.rating})
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          {product.price != null ? (
            <>
              <span className="text-[16px] font-bold text-[var(--color-foreground)]">
                {FYNODE_CURRENCY}
                {product.price.toFixed(2)}
              </span>
              {product.originalPrice != null && (
                <span className="text-[13px] text-[var(--color-secondary)] line-through">
                  {FYNODE_CURRENCY}
                  {product.originalPrice.toFixed(2)}
                </span>
              )}
            </>
          ) : (
            <span className="text-[14px] font-bold text-[var(--color-fynode-accent)]">
              Select options
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="p-4 pt-0">
        <button
          type="button"
          className="w-full rounded-sm border border-[var(--color-foreground)] py-2.5 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-foreground)] hover:text-white"
        >
          {product.buttonLabel}
        </button>
      </div>
    </div>
  );
}

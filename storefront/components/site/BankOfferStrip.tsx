"use client";

import { Landmark, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { BankOffer } from "@/lib/products";

/**
 * Homepage bank-offer cards. Poster images use plain <img> + object-cover —
 * same convention as the promo tiles and festival banner (Vercel image
 * optimization is disabled for this deployment; see next.config.ts).
 */
export default function BankOfferStrip({ offers }: { offers: BankOffer[] }) {
  if (!offers || offers.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-amber-500" /> Bank Offers
        </h2>
        <span className="text-xs text-neutral-400">{offers.length} live</span>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
        {offers.map((o) => {
          const cardType = o.card_type === "ALL" ? "Credit & Debit" : `${o.card_type.charAt(0)}${o.card_type.slice(1).toLowerCase()} Cards`;
          const inner = (
            <>
              {o.poster_url ? (
                <img
                  src={o.poster_url}
                  alt={`${o.bank_name} offer`}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="inline-block rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-900">
                  {cardType}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 p-4">
                <p className="flex items-center gap-1.5 text-white">
                  <Landmark className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">{o.bank_name}</span>
                </p>
                <p className="text-sm font-semibold text-white mt-1 line-clamp-2 drop-shadow">{o.discount_text}</p>
              </div>
              <ChevronRight className="absolute bottom-4 right-3 w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
            </>
          );
          const cls =
            "group relative h-44 w-[260px] sm:w-[300px] flex-shrink-0 snap-start rounded-2xl overflow-hidden block bg-neutral-900";
          return o.link ? (
            <Link key={o.id} href={o.link} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={o.id} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}

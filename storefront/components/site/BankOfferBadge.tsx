"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { API_URL } from "@/lib/api-client";
import { isBankOfferEligible, type BankOffer } from "@/lib/products";

/**
 * PDP bank-offer badge: "₹X off with <bank> cards" for products eligible via
 * /store/bank-offers. Fetches once on mount; renders nothing when no offer
 * applies (and silently nothing when the API is unreachable).
 */
export default function BankOfferBadge({ productId }: { productId: string }) {
  const [offers, setOffers] = useState<BankOffer[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/store/bank-offers`, { headers: { "Content-Type": "application/json" } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setOffers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!offers || offers.length === 0) return null;
  const eligible = offers.filter((o) => isBankOfferEligible(o, productId)).slice(0, 2);
  if (eligible.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {eligible.map((o) => {
        const cardType =
          o.card_type === "ALL" ? "cards" : o.card_type === "CREDIT" ? "credit cards" : "debit cards";
        return (
          <div
            key={o.id}
            className="inline-flex items-start gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800 border border-blue-200/60"
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
            <span>
              {o.discount_text} with <span className="font-bold">{o.bank_name}</span> {cardType}
            </span>
          </div>
        );
      })}
    </div>
  );
}

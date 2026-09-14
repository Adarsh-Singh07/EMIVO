"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { API_URL } from "@/lib/api-client";
import { isBankOfferEligible, type BankOffer } from "@/lib/products";

/**
 * Checkout hint: bank-card offers that apply to something currently in the
 * cart (or sitewide offers). Informational only — the discount is settled by
 * the bank during card payment.
 */
export default function BankOfferHint({ productIds }: { productIds: string[] }) {
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
  const relevant = offers
    .filter((o) => productIds.length === 0 || productIds.some((pid) => isBankOfferEligible(o, pid)))
    .slice(0, 3);
  if (relevant.length === 0) return null;

  return (
    <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
      <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
      <div className="text-sm text-blue-800">
        <p className="font-semibold">Bank offers available</p>
        <ul className="mt-1 space-y-0.5">
          {relevant.map((o) => {
            const cardType =
              o.card_type === "ALL" ? "cards" : o.card_type === "CREDIT" ? "credit cards" : "debit cards";
            return (
              <li key={o.id}>
                {o.discount_text} with <span className="font-semibold">{o.bank_name}</span> {cardType}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

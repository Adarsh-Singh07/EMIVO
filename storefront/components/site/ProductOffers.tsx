"use client";

import { useEffect, useState } from "react";
import { Tag, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { storeApi } from "@/lib/store-api";

type Coupon = {
  code: string;
  description?: string;
  discount_type?: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value?: number;
  min_order_amount?: number;
};

/** Available offers under the PDP price (Myntra/AJIO pattern). Display-only:
 *  codes are applied at the cart or checkout. */
export default function ProductOffers() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    storeApi
      .listCoupons()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setCoupons(list.slice(0, 3));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (coupons.length === 0) return null;

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      toast.success(`Code ${code} copied — apply it at cart or checkout`);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 mb-2.5">
        <Tag className="w-3.5 h-3.5" /> Available offers
      </p>
      <ul className="space-y-2">
        {coupons.map((c) => (
          <li key={c.code} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 truncate">{c.code}</p>
              {c.description && (
                <p className="text-xs text-neutral-500 truncate">{c.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => copy(c.code)}
              className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full border border-amber-400 bg-white text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
              aria-label={`Copy coupon code ${c.code}`}
            >
              {copied === c.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied === c.code ? "Copied" : "Copy"}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-neutral-500 mt-2.5">
        Apply a code at the cart or checkout to see your discount.
      </p>
    </div>
  );
}

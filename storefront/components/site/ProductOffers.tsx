"use client";

import { useEffect, useState } from "react";
import { Tag, Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { storeApi } from "@/lib/store-api";
import { inr } from "@/lib/format";

type Coupon = {
  code: string;
  description?: string;
  discount_type?: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value?: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  terms_conditions?: string;
};

function benefitLabel(c: Coupon): string | null {
  if (c.discount_type === "PERCENTAGE" && c.discount_value) {
    return `${c.discount_value}% off${c.max_discount_amount ? ` up to ${inr(c.max_discount_amount)}` : ""}`;
  }
  return null;
}

function termsLines(c: Coupon): string[] {
  if (c.terms_conditions && c.terms_conditions.trim()) {
    return c.terms_conditions
      .split(/\r?\n|•|\*/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  const lines: string[] = [];
  if (c.description) lines.push(c.description);
  if (c.min_order_amount) lines.push(`Valid on orders above ${inr(c.min_order_amount)}.`);
  if (c.discount_type === "PERCENTAGE" && c.max_discount_amount)
    lines.push(`Maximum discount ${inr(c.max_discount_amount)}.`);
  lines.push("One coupon per order. Cannot be combined with other coupons.");
  lines.push("Applicable on the ELEKTRIX store only. The offer may be withdrawn at any time.");
  return lines;
}

/** Available offers under the PDP price. Owner review 2026-10-20: every
 *  offer is its OWN card (not crammed into one box), and tapping a card
 *  opens its terms & conditions. Codes are applied at the cart. */
export default function ProductOffers() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    storeApi
      .listCoupons()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setCoupons(list.slice(0, 3) as Coupon[]);
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
      toast.success(`Code ${code} copied — apply it in your cart`);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    });
  };

  return (
    <div className="mt-4">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 mb-2.5">
        <Tag className="w-3.5 h-3.5" /> Available offers
      </p>
      <ul className="space-y-2">
        {coupons.map((c) => {
          const open = openCode === c.code;
          const benefit = benefitLabel(c);
          return (
            <li
              key={c.code}
              className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenCode(open ? null : c.code)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-neutral-900 truncate">{c.code}</span>
                  {(benefit || c.description) && (
                    <span className="block text-xs text-neutral-500 truncate">
                      {benefit ?? c.description}
                    </span>
                  )}
                </span>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                  T&amp;C
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {open && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-amber-200/70">
                  <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-600">
                    {termsLines(c).map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => copy(c.code)}
                    className="mt-3 inline-flex items-center gap-1 h-8 px-3 rounded-full border border-amber-400 bg-white text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
                    aria-label={`Copy coupon code ${c.code}`}
                  >
                    {copied === c.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === c.code ? "Copied" : "Copy code"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-neutral-500 mt-2.5">
        Apply a code in your cart to see the discount.
      </p>
    </div>
  );
}

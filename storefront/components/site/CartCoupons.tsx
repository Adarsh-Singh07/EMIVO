"use client";

import { useEffect, useState } from "react";
import { Tag, X, Loader2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { storeApi } from "@/lib/store-api";
import { inr } from "@/lib/format";

/** Session key the checkout page reads on mount to auto-apply the coupon
 *  the buyer picked on the cart. */
export const CART_COUPON_KEY = "elektrix_applied_coupon";

export type CartCoupon = { code: string; discount: number; message: string };

export function readCartCoupon(): CartCoupon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_COUPON_KEY);
    return raw ? (JSON.parse(raw) as CartCoupon) : null;
  } catch {
    return null;
  }
}

export function clearCartCoupon() {
  try {
    sessionStorage.removeItem(CART_COUPON_KEY);
  } catch {
    /* ignore */
  }
}

type Coupon = {
  code: string;
  description?: string;
  discount_type?: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value?: number;
  min_order_amount?: number;
};

/** "Available coupons" on the cart (WS3): every active coupon, one-tap
 *  apply, totals update instantly. Validation is server-side. */
export default function CartCoupons({
  subtotal,
  applied,
  onApplied,
  onRemoved,
}: {
  subtotal: number;
  applied: CartCoupon | null;
  onApplied: (c: CartCoupon) => void;
  onRemoved: () => void;
}) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    storeApi
      .listCoupons()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setCoupons(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = async (code: string) => {
    setApplying(code);
    try {
      const result = await storeApi.validateCoupon(code, subtotal);
      if (result.is_valid) {
        const c = {
          code,
          discount: result.discount_amount || 0,
          message: result.message || "Coupon applied",
        };
        try {
          sessionStorage.setItem(CART_COUPON_KEY, JSON.stringify(c));
        } catch {
          /* ignore */
        }
        onApplied(c);
        toast.success(`${code} applied — you save ${inr(c.discount)}`);
      } else {
        toast.error(result.message || "This coupon is not valid for your cart");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply coupon");
    } finally {
      setApplying(null);
    }
  };

  const remove = () => {
    clearCartCoupon();
    onRemoved();
  };

  if (applied) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-3.5 mb-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
            <BadgeCheck className="w-4 h-4" /> {applied.code} applied
          </p>
          <button
            onClick={remove}
            className="p-1.5 hover:bg-green-100 rounded-full text-green-700"
            aria-label="Remove coupon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-green-700 mt-1">
          You save {inr(applied.discount)} — it will carry over to checkout.
        </p>
      </div>
    );
  }

  if (coupons.length === 0) return null;

  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-3.5 mb-4">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 mb-2.5">
        <Tag className="w-3.5 h-3.5" /> Available coupons
      </p>
      <ul className="space-y-2 max-h-44 overflow-y-auto">
        {coupons.map((c) => (
          <li
            key={c.code}
            className="flex items-center justify-between gap-2 bg-white rounded-xl border border-neutral-100 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900">{c.code}</p>
              {c.description && (
                <p className="text-[11px] text-neutral-500 truncate">{c.description}</p>
              )}
            </div>
            <button
              onClick={() => apply(c.code)}
              disabled={applying !== null}
              className="shrink-0 h-8 px-4 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {applying === c.code && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Apply
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

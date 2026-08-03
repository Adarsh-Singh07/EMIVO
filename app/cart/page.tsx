"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, Tag, X, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart, COUPONS } from "@/components/site/CartProvider";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function CartPage() {
  const { items, remove, setQty, subtotal, discount, shipping, total, applied, applyCoupon, removeCoupon } =
    useCart();
  const [code, setCode] = useState("");

  const submitCoupon = () => {
    const key = code.trim().toUpperCase();
    if (key && key in COUPONS) {
      applyCoupon(key);
      setCode("");
      toast.success("Coupon applied");
    } else {
      toast.error("Invalid coupon code");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-8">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-neutral-200 rounded-3xl">
          <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500 mb-6">Your cart is empty.</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-neutral-950 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-neutral-800"
          >
            Start Shopping <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
          {/* Items */}
          <div className="space-y-4">
            {items.map((i) => (
              <div key={i.id} className="flex gap-4 p-4 border border-neutral-200 rounded-2xl">
                <Link href={`/product/${i.id}`}>
                  <img src={i.img} alt={i.name} className="w-24 h-24 object-cover rounded-xl bg-neutral-50" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-neutral-500">{i.brand}</p>
                      <Link href={`/product/${i.id}`} className="font-medium line-clamp-2 hover:text-neutral-500">
                        {i.name}
                      </Link>
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      className="text-neutral-400 hover:text-red-600 shrink-0"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="inline-flex items-center border border-neutral-200 rounded-full">
                      <button
                        onClick={() => setQty(i.id, i.qty - 1)}
                        className="p-2 hover:bg-neutral-100 rounded-l-full"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-4 text-sm font-medium">{i.qty}</span>
                      <button
                        onClick={() => setQty(i.id, i.qty + 1)}
                        className="p-2 hover:bg-neutral-100 rounded-r-full"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{inr(i.price * i.qty)}</span>
                      {i.mrp > i.price && (
                        <p className="text-xs text-neutral-400 line-through">{inr(i.mrp * i.qty)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <aside className="border border-neutral-200 rounded-3xl p-6 lg:sticky lg:top-24">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

            {!applied && (
              <div className="mb-5">
                <label htmlFor="coupon" className="text-sm font-medium">Apply coupon</label>
                <div className="flex gap-2 mt-2">
                  <input
                    id="coupon"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitCoupon()}
                    placeholder="Try EMIVO10"
                    className="flex-1 h-11 border border-neutral-200 rounded-full px-4 text-sm focus:outline-none focus:border-neutral-950 uppercase"
                  />
                  <button
                    onClick={submitCoupon}
                    className="h-11 px-5 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {applied && (
              <div className="mb-5">
                <p className="text-sm font-medium">Coupon applied</p>
                <div
                  className={`mt-2 flex items-center justify-between gap-2 rounded-full pl-3 pr-1.5 py-1.5 border ${
                    applied.invalid
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-green-50 border-green-200 text-green-700"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium inline-flex items-center gap-1.5">
                      <Tag className="w-4 h-4 shrink-0" /> {applied.code}
                    </span>
                    {applied.invalid && (
                      <p className="text-xs truncate mt-0.5">{applied.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="p-1 hover:bg-neutral-100 rounded-full shrink-0"
                    aria-label="Remove coupon"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Subtotal</dt>
                <dd className="font-medium">{inr(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Discount</dt>
                  <dd className="font-medium">−{inr(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-neutral-500">Shipping</dt>
                <dd className="font-medium">{shipping === 0 ? <span className="text-green-600">FREE</span> : inr(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-3 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold">{inr(total)}</dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="mt-5 w-full h-12 grid place-items-center bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/shop"
              className="mt-3 w-full h-12 grid place-items-center border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Check } from "lucide-react";
import { useCart } from "@/components/site/CartProvider";
import RecentlyViewedStrip from "@/components/site/RecentlyViewedStrip";
import CartCoupons, { readCartCoupon, type CartCoupon } from "@/components/site/CartCoupons";
import { useStoreShippingConfig, computeShipping } from "@/lib/store-config";
import { inr } from "@/lib/format";
import { toast } from "sonner";

/** Skeleton for a cart line. */
function LineSkeleton() {
  return (
    <div className="flex gap-4 p-4 border border-neutral-200 rounded-2xl animate-pulse">
      <div className="w-24 h-24 rounded-xl bg-neutral-100" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-neutral-100 rounded w-3/4" />
        <div className="h-4 bg-neutral-100 rounded w-1/4" />
        <div className="h-8 bg-neutral-100 rounded-full w-32" />
      </div>
    </div>
  );
}

export default function CartPage() {
  const {
    lines,
    loading,
    setQty,
    removeLine,
    count,
    deselectedIds,
    toggleSelect,
    selectAll,
    selectedLines,
    selectedSubtotal,
    selectedCount,
  } = useCart();

  // Coupon picked here carries over to checkout via sessionStorage (read by
  // the checkout page on mount and re-validated server-side).
  const [appliedCoupon, setAppliedCoupon] = useState<CartCoupon | null>(() => readCartCoupon());
  const discount = appliedCoupon?.discount ?? 0;

  const shipCfg = useStoreShippingConfig();
  // WS4: summary reflects the SELECTION only; unselected lines stay in the
  // cart for later.
  const shipping = computeShipping(selectedSubtotal, discount, shipCfg);
  const total = Math.max(0, selectedSubtotal - discount) + shipping;
  const allSelected = deselectedIds.size === 0;

  const checkoutHref =
    selectedLines.length === 0
      ? "#"
      : allSelected
        ? "/checkout"
        : `/checkout?sel=${encodeURIComponent(selectedLines.map((l) => l.id).join(","))}`;

  if (loading && lines.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-8">Your Cart</h1>
        <div className="space-y-4">
          <LineSkeleton />
          <LineSkeleton />
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-8">Your Cart</h1>
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
        {/* Give the empty state a next step instead of dead space below the fold */}
        <RecentlyViewedStrip />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">Your Cart</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {selectedCount} of {count} {count === 1 ? "item" : "items"} selected
      </p>

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
        {/* Items */}
        <div className="space-y-4">
          {/* Select-all row (WS4) */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => (allSelected ? toast.info("Uncheck items to leave them for later") : selectAll())}
              className="inline-flex items-center gap-2.5 text-sm font-medium text-neutral-700 hover:text-neutral-950"
              aria-pressed={allSelected}
            >
              <span
                className={`w-5 h-5 rounded-md border-2 grid place-items-center transition-colors ${
                  allSelected ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300 bg-white"
                }`}
              >
                {allSelected && <Check className="w-3.5 h-3.5" />}
              </span>
              {allSelected ? "All selected" : "Select all"}
            </button>
            {!allSelected && (
              <p className="text-xs text-neutral-400">Unchecked items stay in your cart</p>
            )}
          </div>

          {lines.map((i) => {
            const stock = i.stock_available;
            const atStockCap = stock != null && stock > 0 && i.quantity >= stock;
            const overStock = stock != null && i.quantity > stock;
            const selected = !deselectedIds.has(i.id);
            return (
              <div
                key={i.id}
                className={`flex gap-3 sm:gap-4 p-3 sm:p-4 border rounded-2xl transition-opacity ${
                  overStock ? "border-red-200 bg-red-50/40" : "border-neutral-200"
                } ${selected ? "" : "opacity-60"}`}
              >
                {/* WS4: per-line checkout checkbox */}
                <button
                  onClick={() => toggleSelect(i.id)}
                  aria-pressed={selected}
                  aria-label={selected ? `Deselect ${i.product_name}` : `Select ${i.product_name}`}
                  className={`mt-1 w-5 h-5 rounded-md border-2 grid place-items-center shrink-0 transition-colors ${
                    selected ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300 bg-white"
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5" />}
                </button>
                <Link
                  href={i.product_id ? `/product/${i.product_id}` : "#"}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl bg-neutral-100 overflow-hidden"
                >
                  {i.img ? (
                    <Image
                      src={i.img}
                      alt={i.product_name}
                      fill
                      sizes="96px"
                      className="object-contain"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-[10px] text-neutral-400 px-1 text-center leading-tight">
                      {i.product_name.slice(0, 20)}
                    </span>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={i.product_id ? `/product/${i.product_id}` : "#"}
                        className="font-medium line-clamp-2 hover:text-neutral-500"
                      >
                        {i.product_name}
                      </Link>
                      {i.variant_name && (
                        <p className="text-xs text-neutral-500 mt-0.5">{i.variant_name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeLine(i.id)}
                      className="text-neutral-400 hover:text-red-600 shrink-0"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stock warnings */}
                  {stock != null && stock === 0 && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      Out of stock — remove it to continue to checkout
                    </p>
                  )}
                  {stock != null && stock > 0 && stock <= 5 && (
                    <p className="text-xs text-amber-600 font-medium mt-1">Only {stock} left</p>
                  )}

                  <div className="flex items-center justify-between mt-3 gap-3">
                    <div className="inline-flex items-center border border-neutral-200 rounded-full">
                      <button
                        onClick={() =>
                          i.quantity <= 1 ? removeLine(i.id) : setQty(i.id, i.quantity - 1)
                        }
                        className="p-2 hover:bg-neutral-100 rounded-l-full"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-4 text-sm font-medium">{i.quantity}</span>
                      <button
                        onClick={() => setQty(i.id, i.quantity + 1)}
                        disabled={atStockCap || stock === 0}
                        className="p-2 hover:bg-neutral-100 rounded-r-full disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{inr(i.unit_price * i.quantity)}</span>
                      <p className="text-xs text-neutral-500">
                        {inr(i.unit_price)} each
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <aside className="border border-neutral-200 rounded-3xl p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

          <CartCoupons
            subtotal={selectedSubtotal}
            applied={appliedCoupon}
            onApplied={setAppliedCoupon}
            onRemoved={() => setAppliedCoupon(null)}
          />

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Subtotal ({selectedCount} selected)</dt>
              <dd className="font-medium">{inr(selectedSubtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <dt>Coupon discount{appliedCoupon ? ` (${appliedCoupon.code})` : ""}</dt>
                <dd className="font-medium">−{inr(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500">Shipping</dt>
              <dd className="font-medium">
                {shipping === 0 ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  inr(shipping)
                )}
              </dd>
            </div>
            {shipping > 0 && (
              <p className="text-xs text-neutral-400">
                Add {inr(Math.max(0, shipCfg.freeShippingThresholdPaise - (selectedSubtotal - discount)))} more for free shipping
              </p>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold">{inr(total)}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-neutral-400 mt-2">
            Final shipping and coupon validation are confirmed at checkout.
          </p>

          {selectedLines.length === 0 ? (
            <button
              onClick={() => toast.error("Select at least one item to check out")}
              className="mt-5 w-full h-12 grid place-items-center bg-neutral-300 text-white rounded-full text-sm font-medium cursor-not-allowed"
            >
              Select items to continue
            </button>
          ) : (
            <Link
              href={checkoutHref}
              className="mt-5 w-full h-12 grid place-items-center bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
            >
              Proceed to Checkout · {inr(total)}
            </Link>
          )}
          <Link
            href="/shop"
            className="mt-3 w-full h-12 grid place-items-center border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-50"
          >
            Continue Shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}

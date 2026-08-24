"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { inr } from "@/lib/format";
import { productHref } from "@/lib/products";

export default function CartDrawer() {
  const { lines, setQty, removeLine, subtotal, drawerOpen, setDrawerOpen, loading } = useCart();

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] max-w-full bg-white z-[60] shadow-2xl transform transition-transform ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        inert={!drawerOpen}
        aria-label="Shopping cart"
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-neutral-100">
            <h3 className="text-lg font-semibold">Your Cart ({lines.length})</h3>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 hover:bg-neutral-100 rounded-full"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {loading && lines.length === 0 && (
              <div className="space-y-5 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-neutral-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-neutral-100 rounded w-3/4" />
                      <div className="h-4 bg-neutral-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && lines.length === 0 && (
              <div className="text-center py-16 text-neutral-500">
                <ShoppingBag className="w-10 h-10 mx-auto mb-4 text-neutral-300" />
                <p className="mb-4">Your cart is empty.</p>
                <Link
                  href="/shop"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-block bg-neutral-950 text-white px-5 py-2.5 rounded-full text-sm"
                >
                  Start Shopping
                </Link>
              </div>
            )}

            {lines.map((i) => {
              const stock = i.stock_available;
              const atStockCap = stock != null && stock > 0 && i.quantity >= stock;
              return (
                <div key={i.id} className="flex gap-4">
                  <Link
                    href={i.product_id ? `/product/${i.product_id}` : "#"}
                    onClick={() => setDrawerOpen(false)}
                    className="relative w-20 h-20 shrink-0 rounded-xl bg-neutral-100 overflow-hidden"
                  >
                    {i.img ? (
                      <Image
                        src={i.img}
                        alt={i.product_name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-[10px] text-neutral-400 px-1 text-center leading-tight">
                        {i.product_name.slice(0, 18)}
                      </span>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{i.product_name}</p>
                    {i.variant_name && (
                      <p className="text-xs text-neutral-500 mt-0.5">{i.variant_name}</p>
                    )}
                    <p className="text-sm font-semibold mt-1">{inr(i.unit_price)}</p>
                    {stock != null && stock <= 5 && stock > 0 && (
                      <p className="text-[11px] text-amber-600 mt-0.5">Only {stock} left</p>
                    )}
                    {stock != null && stock === 0 && (
                      <p className="text-[11px] text-red-600 mt-0.5">Out of stock</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center border border-neutral-200 rounded-full">
                        <button
                          onClick={() =>
                            i.quantity <= 1 ? removeLine(i.id) : setQty(i.id, i.quantity - 1)
                          }
                          className="p-1.5 hover:bg-neutral-100 rounded-l-full"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-sm font-medium">{i.quantity}</span>
                        <button
                          onClick={() => setQty(i.id, i.quantity + 1)}
                          disabled={atStockCap}
                          className="p-1.5 hover:bg-neutral-100 rounded-r-full disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeLine(i.id)}
                        className="text-neutral-400 hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {lines.length > 0 && (
            <div className="border-t border-neutral-100 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Subtotal</span>
                <span className="text-lg font-semibold">{inr(subtotal)}</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Shipping and offers are calculated at checkout.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/cart"
                  onClick={() => setDrawerOpen(false)}
                  className="h-11 grid place-items-center border border-neutral-950 rounded-full text-sm font-medium hover:bg-neutral-50"
                >
                  View Cart
                </Link>
                <Link
                  href="/checkout"
                  onClick={() => setDrawerOpen(false)}
                  className="h-11 grid place-items-center bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
                >
                  Checkout
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

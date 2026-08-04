"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { X, Minus, Plus, Trash2 } from "lucide-react";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function CartDrawer() {
  const { items, remove, setQty, subtotal, drawerOpen, setDrawerOpen } = useCart();

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl transform transition-transform ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        inert={!drawerOpen}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-neutral-100">
            <h3 className="text-lg font-semibold">Your Cart ({items.length})</h3>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 hover:bg-neutral-100 rounded-full"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {items.length === 0 && (
              <div className="text-center py-16 text-neutral-500">
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

            {items.map((i) => (
              <div key={i.id} className="flex gap-4">
                <img
                  src={i.img}
                  alt={i.name}
                  className="w-20 h-20 object-cover rounded-xl bg-neutral-50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{i.name}</p>
                  <p className="text-sm font-semibold mt-1">{inr(i.price)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center border border-neutral-200 rounded-full">
                      <button
                        onClick={() => setQty(i.id, i.qty - 1)}
                        className="p-1.5 hover:bg-neutral-100 rounded-l-full"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-sm font-medium">{i.qty}</span>
                      <button
                        onClick={() => setQty(i.id, i.qty + 1)}
                        className="p-1.5 hover:bg-neutral-100 rounded-r-full"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      className="text-neutral-400 hover:text-red-600"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div className="border-t border-neutral-100 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Subtotal</span>
                <span className="text-lg font-semibold">{inr(subtotal)}</span>
              </div>
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

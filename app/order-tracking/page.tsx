"use client";

import { useState } from "react";
import { Search, Package, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { icon: Package, label: "Order placed" },
  { icon: Truck, label: "In transit" },
  { icon: CheckCircle2, label: "Delivered" },
];

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState("");
  const [searched, setSearched] = useState(false);

  const track = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      toast.error("Enter your order ID");
      return;
    }
    setSearched(true);
  };

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Track your order</p>
      <h1 className="text-4xl font-semibold tracking-tight mb-6">Where is my order?</h1>

      <form onSubmit={track} className="flex gap-2 max-w-lg">
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="e.g. EMIVO123456"
          className="h-12 flex-1 border border-neutral-200 rounded-full px-5 text-sm focus:outline-none focus:border-neutral-950"
        />
        <button
          type="submit"
          className="h-12 px-6 inline-flex items-center gap-2 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
        >
          <Search className="w-4 h-4" /> Track
        </button>
      </form>

      {searched && (
        <div className="mt-10 border border-neutral-200 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-neutral-500">Order</p>
              <p className="font-semibold">#{orderId.toUpperCase()}</p>
            </div>
            <span className="text-sm font-medium text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
              In transit
            </span>
          </div>
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.label} className={`flex items-center ${i < 2 ? "flex-1" : ""}`}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full grid place-items-center ${
                      i < 2 ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    <s.icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs mt-2 ${i < 2 ? "text-neutral-900 font-medium" : "text-neutral-400"}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < 1 ? "bg-neutral-950" : "bg-neutral-200"}`} />}
              </div>
            ))}
          </div>
          <p className="text-sm text-neutral-500 mt-6">
            Your order was dispatched from our Mumbai warehouse and is expected to arrive within 1–2 days.
          </p>
        </div>
      )}
    </div>
  );
}

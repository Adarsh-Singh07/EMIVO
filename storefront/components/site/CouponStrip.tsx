"use client";
import { useState } from "react";
import { Tag, Copy, Check, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  code: string;
  description?: string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number;
  min_order_amount?: number;
  terms?: string;
}

function CouponModal({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(coupon.code).then(() => {
      setCopied(true);
      toast.success(`Coupon "${coupon.code}" copied!`);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const discount = coupon.discount_type === "PERCENTAGE"
    ? `${coupon.discount_value}% OFF`
    : `₹${(coupon.discount_value / 100).toLocaleString("en-IN")} OFF`;

  const minOrder = coupon.min_order_amount
    ? `₹${(coupon.min_order_amount / 100).toLocaleString("en-IN")}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md mx-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 grid place-items-center">
              <Tag className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium">Coupon Code</p>
              <p className="text-xl font-black tracking-wider text-neutral-900">{coupon.code}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 grid place-items-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white text-center mb-5">
          <p className="text-4xl font-black mb-1">{discount}</p>
          {minOrder && <p className="text-sm text-white/80">on orders above {minOrder}</p>}
        </div>

        <button
          onClick={copy}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 font-bold tracking-wider text-sm hover:bg-amber-100 transition-colors mb-4"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : `Copy ${coupon.code}`}
        </button>

        <div className="text-xs text-neutral-500 space-y-1">
          <p className="font-semibold text-neutral-700 mb-2">Terms & Conditions</p>
          <p>• {discount} applied automatically at checkout when this code is used.</p>
          {minOrder && <p>• Minimum order value of {minOrder} required.</p>}
          <p>• One coupon per order. Cannot be combined with other offers.</p>
          <p>• Valid for a limited time only. ELEKTRIX reserves the right to modify or withdraw this offer.</p>
          <p>• Not applicable on already discounted items unless stated otherwise.</p>
        </div>
      </div>
    </div>
  );
}

export default function CouponStrip({ coupons }: { coupons: Coupon[] }) {
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  if (!coupons || coupons.length === 0) return null;

  return (
    <>
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500" /> Available Coupons
          </h2>
          <span className="text-xs text-neutral-400">{coupons.length} offers</span>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
          {coupons.map((c) => {
            const discount = c.discount_type === "PERCENTAGE"
              ? `${c.discount_value}%`
              : `₹${(c.discount_value / 100).toLocaleString("en-IN")}`;
            const minOrder = c.min_order_amount
              ? `Above ₹${(c.min_order_amount / 100).toLocaleString("en-IN")}`
              : "No minimum";
            return (
              <button
                key={c.code}
                onClick={() => setSelectedCoupon(c)}
                className="snap-start flex-shrink-0 w-[220px] sm:w-[240px] text-left bg-white border border-neutral-200 hover:border-amber-400 hover:shadow-md transition-all rounded-2xl overflow-hidden group"
              >
                {/* Colored top strip */}
                <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 flex items-center justify-between">
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider truncate mr-2">
                    {discount} OFF
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
                {/* Code box */}
                <div className="px-4 py-3">
                  <p className="font-mono font-black text-base tracking-wider text-neutral-900 border-2 border-dashed border-amber-300 bg-amber-50 rounded-lg px-3 py-1.5 inline-block mb-2">
                    {c.code}
                  </p>
                  <p className="text-[10px] text-neutral-500 leading-tight truncate">
                    {minOrder}
                  </p>
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">Tap to copy & view T&C →</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedCoupon && (
        <CouponModal coupon={selectedCoupon} onClose={() => setSelectedCoupon(null)} />
      )}
    </>
  );
}

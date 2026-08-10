"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How long does delivery take?",
    a: "Orders are dispatched same-day when placed before 6pm IST. Metro cities receive delivery in 1–2 days; most other locations in 2–4 days. Delivery is free on orders over ₹999.",
  },
  {
    q: "Do you offer EMI options?",
    a: "Yes. No-cost EMI is available on 3, 6 and 12-month tenures for cards above ₹5,000 on most products, including Apple devices.",
  },
  {
    q: "Is everything covered by warranty?",
    a: "Every product is 100% genuine and carries the manufacturer's official brand warranty. Accessories that carry no brand warranty are marked clearly on their product page.",
  },
  {
    q: "What is your return policy?",
    a: "You get 10 days from delivery for no-questions returns on unopened products. Opened products can be returned if they arrive defective or damaged — we'll arrange a replacement or refund.",
  },
  {
    q: "How do coupon codes work?",
    a: "Enter a valid code like ELEKTRIX10 at cart. Coupons stack with sale prices but apply to product subtotal before shipping. Only one coupon can be active per order.",
  },
  {
    q: "Can I track my order?",
    a: "Yes — use the order number from your confirmation email on the Order Tracking page. We update status at dispatch, in-transit and delivered milestones.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">FAQ</p>
      <h1 className="text-4xl font-semibold tracking-tight mb-10">Frequently asked questions</h1>

      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <div key={f.q} className="border border-neutral-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-medium hover:bg-neutral-50"
              aria-expanded={open === i}
            >
              {f.q}
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <p className="px-5 pb-5 text-sm text-neutral-600">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

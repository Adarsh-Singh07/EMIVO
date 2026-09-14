"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

/**
 * PDP flash-sale strip: live countdown to the offer end. Renders nothing
 * once the window closes (the next ISR/cart refresh flips is_flash_sale via
 * the worker anyway).
 */
export default function FlashSaleCountdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // `now === null` on the server render — render nothing there so the
  // countdown never mismatches hydration.
  if (now === null || !Number.isFinite(end) || now >= end) return null;

  const total = Math.floor((end - now) / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");

  return (
    <div className="mt-2 inline-flex w-full items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-3 py-2 text-white">
      <Zap className="h-4 w-4 shrink-0 fill-white" />
      <span className="text-xs font-bold uppercase tracking-wider">Flash sale</span>
      <span className="ml-auto font-mono text-sm font-bold tabular-nums">
        ends in {h}:{m}:{s}
      </span>
    </div>
  );
}

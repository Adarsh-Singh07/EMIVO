"use client";

/**
 * Retry/reorder actions for orders whose online payment failed.
 *
 * Product rules (mirrors backend OrderService.apply_payment_window):
 *   0–30 min   — stock is still held for this buyer; retry always works
 *   30 min–2 h — stock is back on sale; retry re-reserves, may be sold out
 *   > 2 h      — retry window over; the buyer can reorder to the cart
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CreditCard, Loader2, RotateCcw, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { storeApi, type OrderV2 } from "@/lib/store-api";
import { useCart } from "./CartProvider";
import { isSafeRedirectUrl, openPaymentGateway } from "@/lib/safe-redirect";

const RETRY_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
const STOCK_HOLD_MS = 30 * 60 * 1000; // 30 minutes

export default function PaymentRetryActions({
  order,
  onChanged,
}: {
  order: OrderV2;
  /** Called when the backend state changed (window expired / sold out) so the parent can refetch. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const { add } = useCart();
  const [busy, setBusy] = useState<"retry" | "reorder" | null>(null);
  const [soldOut, setSoldOut] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // 30s tick so the countdown/window state stays honest on a long-open page
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const failedAtMs = useMemo(() => {
    const ts = Date.parse(order.updated_at || order.created_at || "");
    return Number.isNaN(ts) ? null : ts;
  }, [order.updated_at, order.created_at]);

  const retryDeadlineMs = failedAtMs !== null ? failedAtMs + RETRY_WINDOW_MS : null;
  const stockHoldEndsMs = failedAtMs !== null ? failedAtMs + STOCK_HOLD_MS : null;
  const isRetryable =
    order.status?.toUpperCase() === "PAYMENT_FAILED" &&
    retryDeadlineMs !== null &&
    now < retryDeadlineMs;
  const stockReleased = stockHoldEndsMs !== null && now >= stockHoldEndsMs;
  const deadlineLabel = retryDeadlineMs
    ? new Date(retryDeadlineMs).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : "";

  if (order.status?.toUpperCase() !== "PAYMENT_FAILED") return null;

  const reorder = async () => {
    setBusy("reorder");
    try {
      let allAdded = true;
      for (const item of order.items) {
        const ok = await add(
          {
            id: item.product_id,
            name: item.product_name,
            price: item.unit_price,
            variantId: item.variant_id ?? undefined,
          },
          item.quantity
        );
        if (!ok) allAdded = false;
      }
      if (!allAdded) {
        toast.error("Some items couldn't be added — check the cart for what's available.");
      }
      router.push("/cart");
    } catch {
      toast.error("Could not start a reorder. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const retryPayment = async () => {
    setBusy("retry");
    try {
      // A retry needs a FRESH idempotency key — the order's original key
      // would return the already-failed payment record.
      const init = await storeApi.initiatePayment({
        order_id: order.id,
        idempotency_key: crypto.randomUUID(),
      });
      const url = init.checkout?.checkout_url;
      if (url && isSafeRedirectUrl(url)) {
        openPaymentGateway(url);
        return; // navigating away
      }
      throw new Error("Payment gateway did not return a checkout URL. Please try again.");
    } catch (err) {
      setBusy(null);
      if (err instanceof ApiError) {
        if (err.code === "STOCK_SOLD_OUT") {
          setSoldOut(true);
          toast.error("Some items sold out during the retry window.");
          return;
        }
        if (err.code === "PAYMENT_WINDOW_EXPIRED") {
          toast.error("The 2-hour retry window for this order has ended.");
          onChanged?.();
          return;
        }
      }
      toast.error(err instanceof Error ? err.message : "Could not start the payment. Please try again.");
    }
  };

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700">Payment failed — no money was charged</p>
          {isRetryable ? (
            <p className="text-xs text-red-600/80 mt-1">
              {soldOut || stockReleased
                ? "Stock was released to other buyers after 30 minutes — retry only if still available."
                : `Your items are reserved. Retry payment before ${deadlineLabel}.`}
            </p>
          ) : (
            <p className="text-xs text-red-600/80 mt-1">
              The 2-hour retry window has ended. Reorder the items below — they'll go to your cart.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 mt-4">
        {isRetryable && !soldOut && (
          <button
            onClick={retryPayment}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {busy === "retry" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Opening payment…
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Retry Payment
              </>
            )}
          </button>
        )}
        <button
          onClick={reorder}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-800 text-sm font-semibold hover:bg-white disabled:opacity-50 transition-colors"
        >
          {busy === "reorder" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Adding to cart…
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" /> Reorder Items
            </>
          )}
        </button>
      </div>
    </div>
  );
}

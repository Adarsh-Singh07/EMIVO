"use client";

/**
 * Dedicated payment page: the checkout hands off here the instant "Pay" is
 * clicked, so the buyer leaves the cart page immediately. This page owns
 * the whole payment lifecycle:
 *
 *   initiating → open the gateway (PWA-aware) → awaiting confirmation
 *   polls the order every few seconds until it resolves:
 *     CONFIRMED      → success screen
 *     PAYMENT_FAILED → failure screen with Retry (re-initiates)
 *     window over    → reorder CTA
 *
 * Accepts the order UUID (/pay/<uuid>) or order number (/pay/ELK-…).
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Package,
  RotateCcw,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { storeApi, type OrderV2 } from "@/lib/store-api";
import { useCart } from "@/components/site/CartProvider";
import { inr } from "@/lib/format";
import { openPaymentGateway } from "@/lib/safe-redirect";

const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_MS = 15 * 60 * 1000;

type Phase = "loading" | "opening" | "awaiting" | "confirmed" | "failed" | "expired" | "gone";

function isPaid(status: string) {
  return ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status.toUpperCase());
}

function PayPageInner() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = decodeURIComponent(params.orderId || "");
  const justPlaced = searchParams.get("placed") === "1";
  const { add } = useCart();

  const [order, setOrder] = useState<OrderV2 | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStart = useRef(0);
  const gatewayOpened = useRef(false);

  const stopPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
  };

  const refreshOrder = useCallback(async (id: string): Promise<OrderV2 | null> => {
    try {
      const o = id.startsWith("ELK-")
        ? await storeApi.trackOrder(id)
        : await storeApi.getOrder(id);
      setOrder(o);
      return o;
    } catch {
      return null;
    }
  }, []);

  // Initial load → resolve phase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const o = await refreshOrder(orderId);
      if (cancelled || !o) {
        if (!cancelled) setPhase("gone");
        return;
      }
      const status = o.status?.toUpperCase();
      if (isPaid(status)) {
        setPhase("confirmed");
      } else if (status === "PAYMENT_FAILED") {
        setPhase("failed");
      } else if (status === "CANCELLED" || status === "REFUNDED") {
        setPhase("expired");
      } else {
        setPhase("opening"); // PENDING → gateway handoff happens below
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const openGateway = useCallback(
    async (o: OrderV2) => {
      setBusy(true);
      setError("");
      try {
        // Fresh idempotency key each attempt — the order's original key
        // would return an already-failed payment record.
        const init = await storeApi.initiatePayment({
          order_id: o.id,
          idempotency_key: crypto.randomUUID(),
        });
        const url = init.checkout?.checkout_url;
        if (!url) throw new Error("Payment gateway did not return a checkout URL.");
        if (!openPaymentGateway(url)) {
          throw new Error("Could not open the payment gateway. Allow pop-ups and retry.");
        }
        setPhase("awaiting");
        pollStart.current = Date.now();
        stopPolling();
        pollTimer.current = setInterval(async () => {
          const fresh = await refreshOrder(o.id);
          if (!fresh) return;
          const st = fresh.status?.toUpperCase();
          if (isPaid(st)) {
            setPhase("confirmed");
            stopPolling();
          } else if (st === "PAYMENT_FAILED") {
            setPhase("failed");
            stopPolling();
          } else if (Date.now() - pollStart.current > POLL_MAX_MS) {
            stopPolling();
            toast.info("Still waiting on the gateway — keep this page open or check Order History later.");
          }
        }, POLL_INTERVAL_MS);
      } catch (err) {
        setPhase(o.status?.toUpperCase() === "PAYMENT_FAILED" ? "failed" : "awaiting");
        if (err instanceof ApiError && err.code === "STOCK_SOLD_OUT") {
          setError("Some items in this order sold out — use Reorder instead, while stock lasts.");
          setPhase("expired");
        } else if (err instanceof ApiError && err.code === "PAYMENT_WINDOW_EXPIRED") {
          setError("The 2-hour payment window for this order has ended.");
          setPhase("expired");
        } else {
          setError(err instanceof Error ? err.message : "Could not start the payment.");
        }
      } finally {
        setBusy(false);
      }
    },
    [refreshOrder]
  );

  // Auto-open the gateway exactly once for a pending order on arrival
  useEffect(() => {
    if (phase === "opening" && order && !gatewayOpened.current) {
      gatewayOpened.current = true;
      openGateway(order);
    }
  }, [phase, order, openGateway]);

  // Stop polling when leaving
  useEffect(() => stopPolling, []);

  const reorder = async () => {
    if (!order) return;
    setBusy(true);
    try {
      for (const item of order.items) {
        await add(
          {
            id: item.product_id,
            name: item.product_name,
            price: item.unit_price,
            variantId: item.variant_id ?? undefined,
          },
          item.quantity
        );
      }
      router.push("/cart");
    } catch {
      toast.error("Could not start a reorder. Please try again.");
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-16">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );

  if (phase === "loading") {
    return shell(
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-neutral-900 mx-auto" />
        <p className="mt-5 text-lg font-semibold tracking-tight">Loading your order…</p>
      </div>
    );
  }

  if (phase === "gone" || !order) {
    return shell(
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <Package className="w-10 h-10 text-neutral-300 mx-auto" />
        <p className="mt-4 text-lg font-semibold">Order not found</p>
        <p className="mt-1 text-sm text-neutral-500">Sign in with the account that placed it, or check Order History.</p>
        <Link
          href="/account/orders"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800"
        >
          Go to Order History
        </Link>
      </div>
    );
  }

  const summary = (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-400">Order</p>
          <p className="font-bold">{order.order_number || order.id.slice(0, 8)}</p>
        </div>
        <p className="text-lg font-bold">{inr(order.total)}</p>
      </div>
      <p className="text-xs text-neutral-500 mt-2">
        {order.items.reduce((s, i) => s + i.quantity, 0)} item(s) ·{" "}
        {(order.payment_method || "ONLINE") === "COD" ? "Cash on Delivery" : "Online payment"}
      </p>
    </div>
  );

  if (phase === "confirmed") {
    return shell(
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Payment successful</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your order {order.order_number} is confirmed. A confirmation email is on its way.
        </p>
        <div className="mt-6">{summary}</div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link
            href={`/order-tracking?orderId=${encodeURIComponent(order.order_number || order.id)}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800"
          >
            <Package className="w-4 h-4" /> Track Order
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-neutral-300 text-sm font-semibold hover:bg-white"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "failed" || phase === "expired") {
    const expired = phase === "expired";
    return shell(
      <div>
        <div className="text-center">
          <XCircle className={`w-16 h-16 mx-auto ${expired ? "text-neutral-400" : "text-red-500"}`} />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            {expired ? "Retry window has ended" : "Payment failed"}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {expired
              ? "You can reorder the items — they'll go straight to your cart."
              : "No money was charged. Retry now, or reorder the items later."}
          </p>
        </div>
        <div className="mt-6">{summary}</div>
        {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {!expired && (
            <button
              onClick={() => order && openGateway(order)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50"
            >
              {busy ? (
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
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-neutral-300 text-sm font-semibold hover:bg-white disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Reorder Items
          </button>
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-neutral-200 text-sm font-medium hover:bg-white"
          >
            Order History
          </Link>
        </div>
      </div>
    );
  }

  // "opening" (about to open the gateway) and "awaiting" (gateway open, polling)
  return shell(
    <div>
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-neutral-900 mx-auto" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          {phase === "opening" ? "Contacting secure payment gateway…" : "Waiting for payment confirmation"}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {phase === "opening"
            ? "This usually takes a few seconds. Don't close this page."
            : "Complete the payment in the gateway window/tab. This page updates automatically the moment it succeeds."}
        </p>
      </div>
      <div className="mt-6">{summary}</div>
      {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {phase === "awaiting" && (
          <button
            onClick={() => order && openGateway(order)}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-neutral-300 text-sm font-semibold hover:bg-white disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" /> Reopen payment window
          </button>
        )}
        <Link
          href="/account/orders"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-neutral-200 text-sm font-medium hover:bg-white"
        >
          Order History
        </Link>
      </div>
      {justPlaced && phase === "awaiting" && (
        <p className="text-xs text-neutral-400 text-center mt-6">
          Your order is safe — even if this tab closes, it stays in Order History.
        </p>
      )}
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <Loader2 className="w-10 h-10 animate-spin text-neutral-900" />
        </div>
      }
    >
      <PayPageInner />
    </Suspense>
  );
}

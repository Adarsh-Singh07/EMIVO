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
import { track } from "@/lib/analytics";
import { useCart } from "@/components/site/CartProvider";
import { inr } from "@/lib/format";
import PaymentGatewayModal, { type GatewayResult } from "@/components/site/PaymentGatewayModal";
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
  const [gateway, setGateway] = useState<{
    accessKey: string;
    merchantKey: string;
    env: "test" | "prod";
    checkoutUrl: string;
  } | null>(null);
  const paymentIdRef = useRef<string | null>(null);
  // This page also renders INSIDE the embedded gateway modal (the surl/furl
  // redirect lands here in the frame); then it reports to the parent instead
  // of driving its own full-screen UX.
  const [embedded, setEmbedded] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStart = useRef(0);
  const gatewayOpened = useRef(false);
  const purchaseTracked = useRef<string | null>(null);

  useEffect(() => {
    setEmbedded(window.self !== window.top);
  }, []);

  // purchase — fires exactly once per order when payment is confirmed,
  // regardless of whether confirmation arrives via initial load or polling.
  useEffect(() => {
    if (phase === "confirmed" && order && purchaseTracked.current !== order.id) {
      purchaseTracked.current = order.id;
      track("purchase", {
        transaction_id: order.order_number || order.id,
        currency: "INR",
        value: order.total / 100,
      });
    }
  }, [phase, order]);

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

  const startPolling = useCallback(
    (id: string) => {
      pollStart.current = Date.now();
      stopPolling();
      pollTimer.current = setInterval(async () => {
        const fresh = await refreshOrder(id);
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
    },
    [refreshOrder]
  );

  // Pick up a payment session pre-created by the checkout page (it starts
  // the initiation in parallel with the redirect and stashes it in
  // sessionStorage) so the lightbox opens with zero extra round-trips.
  // Waits briefly for the stash to land, then gives up (caller initiates).
  const takePaySession = useCallback(
    async (o: OrderV2): Promise<boolean> => {
      const KEY = "elektrix_pay_session";
      for (let waited = 0; waited <= 2500; waited += 250) {
        const raw = sessionStorage.getItem(KEY);
        if (raw) {
          sessionStorage.removeItem(KEY);
          try {
            const st = JSON.parse(raw) as {
              orderId: string;
              paymentId?: string | null;
              checkout?: {
                provider?: string;
                access_key?: string;
                key?: string;
                env?: string;
                checkout_url?: string;
              };
            };
            if (st.orderId !== o.id) return false;
            const co = st.checkout;
            if (co?.provider !== "easebuzz" || !co.access_key || !co.key || !co.env) return false;
            paymentIdRef.current = st.paymentId || null;
            setGateway({
              accessKey: co.access_key,
              merchantKey: co.key,
              env: co.env === "prod" ? "prod" : "test",
              checkoutUrl: co.checkout_url || "",
            });
            setPhase("awaiting");
            startPolling(o.id);
            return true;
          } catch {
            return false;
          }
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      return false;
    },
    [startPolling]
  );

  const openGateway = useCallback(
    async (o: OrderV2) => {
      // Never open a gateway from inside the gateway frame itself — that
      // instance only observes and reports the result to its host page.
      if (window.self !== window.top) return;
      setBusy(true);
      setError("");
      try {
        // Fresh idempotency key each attempt — the order's original key
        // would return an already-failed payment record.
        const init = await storeApi.initiatePayment({
          order_id: o.id,
          idempotency_key: crypto.randomUUID(),
        });
        const co = init.checkout;
        paymentIdRef.current = init.payment?.id || null;
        // Embedded checkout (official Easebuzz EaseCheckout SDK): the gateway
        // renders in a lightbox on THIS page — no redirect, no new tab.
        // Polling picks the result up as soon as the backend settles it.
        if (co.provider === "easebuzz") {
          if (!co.access_key || !co.key || !co.env) {
            throw new Error("Payment gateway did not return a checkout session.");
          }
          setGateway({
            accessKey: co.access_key,
            merchantKey: co.key,
            env: co.env === "prod" ? "prod" : "test",
            checkoutUrl: co.checkout_url || "",
          });
        } else {
          // Legacy provider fallback (redirect to the hosted checkout page).
          const url = co.checkout_url;
          if (!url) throw new Error("Payment gateway did not return a checkout URL.");
          if (!openPaymentGateway(url)) {
            throw new Error("Could not open the payment gateway. Allow pop-ups and retry.");
          }
        }
        setPhase("awaiting");
        startPolling(o.id);
      } catch (err) {
        setPhase(o.status?.toUpperCase() === "PAYMENT_FAILED" ? "failed" : "awaiting");
        if (err instanceof ApiError && err.code === "STOCK_SOLD_OUT") {
          setError("Some items in this order sold out — use Reorder instead, while stock lasts.");
          setPhase("expired");
        } else if (err instanceof ApiError && err.code === "PAYMENT_WINDOW_EXPIRED") {
          setError("The 2-hour payment window for this order has ended.");
          setPhase("expired");
        } else if (err instanceof ApiError && err.code === "ALREADY_PAID") {
          // The resume path just captured the payment server-side — show it.
          const fresh = await refreshOrder(o.id);
          if (fresh && isPaid(fresh.status?.toUpperCase() || "")) {
            setPhase("confirmed");
            stopPolling();
          } else {
            setError("Payment already completed — confirming…");
          }
        } else {
          setError(err instanceof Error ? err.message : "Could not start the payment.");
        }
      } finally {
        setBusy(false);
      }
    },
    [refreshOrder, startPolling]
  );

  // The embedded gateway frame reported the outcome (its final hop is our own
  // /pay page inside the frame). Re-fetch the order — the backend, not the
  // frame, decides the real state.
  const handleGatewayResult = useCallback(
    (result: GatewayResult) => {
      setGateway(null);
      (async () => {
        // The gateway reports the outcome client-side — ask OUR backend to
        // verify with the gateway's status API, so settlement (success OR
        // usercancel/failure) never depends on the gateway's redirect
        // reaching the surl endpoint.
        if (paymentIdRef.current) {
          try {
            await storeApi.verifyPaymentSuccess(paymentIdRef.current);
          } catch (err) {
            // ALREADY_PAID (captured) and PAYMENT_PENDING (unknown) are both
            // fine — the refresh below picks up the real state.
            if (!(err instanceof ApiError && ["ALREADY_PAID", "PAYMENT_PENDING", "BAD_REQUEST"].includes(err.code ?? ""))) {
              console.warn("verify-success failed; falling back to polling", err);
            }
          }
        }
        const fresh = await refreshOrder(orderId);
        const freshStatus = fresh?.status?.toUpperCase() || "";
        if (isPaid(freshStatus)) {
          setPhase("confirmed");
          stopPolling();
        } else if (freshStatus === "PAYMENT_FAILED") {
          setError(
            result.rawStatus?.toLowerCase().includes("cancel")
              ? "Payment was cancelled — no money was charged. You can retry now."
              : ""
          );
          setPhase("failed");
          stopPolling();
        } else if (result.status === "failed") {
          // Gateway says failed but backend hasn't reflected it yet — show
          // the failed screen so the buyer gets immediate, honest feedback.
          setError(
            result.rawStatus?.toLowerCase().includes("cancel")
              ? "Payment was cancelled — no money was charged. You can retry now."
              : "The payment attempt failed or was cancelled. You can retry now."
          );
          setPhase("failed");
          stopPolling();
        }
      })();
    },
    [orderId, refreshOrder]
  );

  // When rendering inside the gateway frame, tell the host page the outcome.
  useEffect(() => {
    if (!embedded || !order) return;
    if (phase === "confirmed" || phase === "failed" || phase === "expired") {
      window.parent.postMessage(
        {
          type: "ELEKTRIX_PAYMENT_RESULT",
          status: phase === "confirmed" ? "success" : "failed",
          order_number: order.order_number,
        },
        window.location.origin
      );
    }
  }, [embedded, phase, order]);

  // Auto-open the gateway exactly once for a pending order on arrival.
  // When embedded (this page IS the gateway frame's final hop), never open a
  // gateway — just poll until the backend settles, then report to the host.
  useEffect(() => {
    if (phase === "opening" && order && !gatewayOpened.current) {
      gatewayOpened.current = true;
      if (embedded) {
        startPolling(order.id);
        return;
      }
      (async () => {
        if (await takePaySession(order)) return;
        openGateway(order);
      })();
    }
  }, [phase, order, openGateway, startPolling, embedded, takePaySession]);

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
      <div className="w-full max-w-lg">
        {children}
        {gateway && !embedded && (
          <PaymentGatewayModal
            accessKey={gateway.accessKey}
            merchantKey={gateway.merchantKey}
            env={gateway.env}
            checkoutUrl={gateway.checkoutUrl}
            onClose={() => setGateway(null)}
            onGatewayResult={handleGatewayResult}
          />
        )}
      </div>
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

  // Inside the gateway frame (the surl/furl redirect lands here): show a
  // compact status card and let the host page take over via postMessage.
  if (embedded && phase !== "gone") {
    const ok = phase === "confirmed";
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-50 px-4">
        <div className="text-center">
          {ok ? (
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          ) : (
            <XCircle className={`w-12 h-12 mx-auto ${phase === "expired" ? "text-neutral-400" : "text-red-500"}`} />
          )}
          <p className="mt-4 text-lg font-semibold tracking-tight">
            {ok ? "Payment successful" : phase === "awaiting" || phase === "opening" ? "Waiting for payment…" : "Payment not completed"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">Returning to ELEKTRIX…</p>
        </div>
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
  const stepIndex = phase === "opening" ? 1 : 2;
  const steps = [
    { label: "Order placed", state: "done" },
    { label: "Contacting secure gateway", state: stepIndex === 1 ? "active" : "done" },
    { label: "Complete your payment", state: stepIndex === 2 ? "active" : "pending" },
    { label: "Confirmation", state: "pending" },
  ];
  return shell(
    <div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {phase === "opening" ? "Starting your secure payment…" : "Complete your payment"}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {phase === "opening"
            ? "One moment — connecting you to the secure payment window."
            : "The secure payment window is open on this page. It updates automatically the moment you pay."}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
        <ol className="space-y-0">
          {steps.map((st, i) => (
            <li key={st.label} className="flex gap-3 last:pb-0">
              <div className="flex flex-col items-center">
                <span
                  className={
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                    (st.state === "done"
                      ? "bg-green-100 text-green-700"
                      : st.state === "active"
                        ? "bg-neutral-950 text-white"
                        : "bg-neutral-100 text-neutral-400")
                  }
                >
                  {st.state === "done" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : st.state === "active" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                {i < steps.length - 1 && <span className="my-1 h-5 w-px bg-neutral-200" />}
              </div>
              <div className={"pb-4 last:pb-0 " + (st.state === "active" ? "animate-pulse" : "")}>
                <p className={"text-sm font-medium " + (st.state === "pending" ? "text-neutral-400" : "text-neutral-900")}>
                  {st.label}
                </p>
                {st.label === "Complete your payment" && st.state === "active" && (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Pay in the window — this page confirms itself automatically.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
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

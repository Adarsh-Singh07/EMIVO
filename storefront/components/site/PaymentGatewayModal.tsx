"use client";

/**
 * Embedded payment-gateway frame — the Easebuzz hosted checkout rendered
 * inside a full-screen modal so the buyer never leaves ELEKTRIX: no
 * full-page redirect, no new tab, no pop-up. Responsive on desktop, mobile
 * and the installed PWA.
 *
 * Flow: the host page passes the gateway `checkout_url` returned by
 * POST /payments/initiate. The gateway's page lives in the iframe; when the
 * buyer completes (or fails) the payment, Easebuzz POSTs our surl/furl and
 * the API redirects the frame back to our own /pay page, which posts an
 * `{ type: "ELEKTRIX_PAYMENT_RESULT" }` message to this window.
 * `onGatewayResult` fires and the host page closes the modal and refreshes
 * the order. The backend stays the single source of truth — the message only
 * tells the host to re-fetch.
 *
 * The frame URL is hard-restricted to the allow-listed gateway hosts in
 * lib/safe-redirect.ts; anything else is refused.
 */
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import { isSafeGatewayUrl } from "@/lib/safe-redirect";

export interface GatewayResult {
  status: "success" | "failed";
  orderNumber?: string;
}

export default function PaymentGatewayModal({
  url,
  onClose,
  onGatewayResult,
}: {
  url: string;
  onClose: () => void;
  onGatewayResult?: (result: GatewayResult) => void;
}) {
  const safe = isSafeGatewayUrl(url);
  const [frameLoading, setFrameLoading] = useState(true);

  // The gateway frame ends its journey on our own /pay page (the surl/furl
  // redirect target), which posts the outcome here. Same-origin messages only.
  useEffect(() => {
    if (!onGatewayResult) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | { type?: string; status?: string; order_number?: string }
        | null;
      if (data?.type !== "ELEKTRIX_PAYMENT_RESULT") return;
      onGatewayResult({
        status: data.status === "success" ? "success" : "failed",
        orderNumber: data.order_number,
      });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onGatewayResult]);

  // Lock the page scroll behind the modal
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!safe) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/70 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <ShieldCheck className="w-10 h-10 mx-auto text-neutral-400" />
          <p className="mt-4 font-semibold tracking-tight">Untrusted payment URL refused</p>
          <p className="mt-1 text-sm text-neutral-500">
            For your safety this payment session cannot be opened. Please retry the payment or use
            Cash on Delivery.
          </p>
          <button
            onClick={onClose}
            className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-neutral-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Complete your payment"
    >
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col p-0 sm:p-4">
        <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm sm:rounded-t-3xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            Secure payment — Easebuzz
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the payment page in a new tab if the embedded window does not load"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <ExternalLink className="w-3.5 h-3.5" /> New tab
            </a>
            <button
              onClick={onClose}
              aria-label="Close payment window"
              className="inline-flex items-center justify-center rounded-full border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden bg-white sm:rounded-b-3xl">
          {frameLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
              <Loader2 className="w-10 h-10 animate-spin text-neutral-900" />
              <p className="mt-4 text-sm text-neutral-500">Loading secure payment gateway…</p>
            </div>
          )}
          <iframe
            src={url}
            title="Easebuzz secure payment"
            className="h-full w-full border-0"
            onLoad={() => setFrameLoading(false)}
            allow="payment"
          />
        </div>
      </div>
    </div>
  );
}

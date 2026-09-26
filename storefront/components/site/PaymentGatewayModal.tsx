"use client";

/**
 * Embedded payment checkout — the official Easebuzz "EaseCheckout" JS SDK
 * (easebuzz-checkout-v2) rendering the gateway in its lightbox on this page,
 * so the buyer never leaves ELEKTRIX: no full-page redirect, no new tab, no
 * pop-up. Responsive on desktop, mobile and the installed PWA.
 *
 * NOTE: Easebuzz's hosted pay page sends `X-Frame-Options: DENY`, so it cannot
 * be iframed directly — the SDK is the official embedded mechanism.
 *
 * Flow: the host page passes the `access_key` / `key` / `env` returned by
 * POST /payments/initiate. The SDK's lightbox collects the payment; its
 * `onResponse` reports the outcome and the host page re-fetches the order —
 * the backend stays the single source of truth (hash verify + status API).
 * The surl/furl callback also hits the API independently of this widget.
 *
 * `checkoutUrl` (the hosted pay URL) is kept only as a manual "New tab"
 * fallback link if the lightbox cannot load. It is hard-restricted to the
 * allow-listed gateway hosts in lib/safe-redirect.ts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import { isSafeGatewayUrl } from "@/lib/safe-redirect";

const SDK_URL =
  "https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/v2.0.0/easebuzz-checkout-v2.min.js";

export interface GatewayResult {
  status: "success" | "failed";
  orderNumber?: string;
}

export default function PaymentGatewayModal({
  accessKey,
  merchantKey,
  env,
  checkoutUrl,
  onClose,
  onGatewayResult,
}: {
  accessKey: string;
  merchantKey: string;
  env: "test" | "prod";
  checkoutUrl?: string;
  onClose: () => void;
  onGatewayResult?: (result: GatewayResult) => void;
}) {
  const [sdkState, setSdkState] = useState<"loading" | "ready" | "error">("loading");
  const [sdkError, setSdkError] = useState("");
  const opened = useRef(false);
  const resultCb = useRef(onGatewayResult);
  resultCb.current = onGatewayResult;

  // Load the official SDK once, then open the lightbox.
  useEffect(() => {
    if (!accessKey || !merchantKey || !env) return;
    let cancelled = false;

    const openLightbox = () => {
      if (cancelled || opened.current) return;
      opened.current = true;
      try {
        const w = window as unknown as {
          EasebuzzCheckout?: new (key: string, env: string) => {
            initiatePayment: (opts: Record<string, unknown>) => void;
          };
        };
        if (!w.EasebuzzCheckout) throw new Error("EasebuzzCheckout SDK missing");
        const checkout = new w.EasebuzzCheckout(merchantKey, env);
        checkout.initiatePayment({
          access_key: accessKey,
          theme: "#111111",
          onResponse: (response: { status?: string }) => {
            // Backend is the source of truth — the host re-fetches the order.
            resultCb.current?.({
              status: response?.status === "success" ? "success" : "failed",
            });
          },
        });
        setSdkState("ready");
      } catch (err) {
        setSdkState("error");
        setSdkError(err instanceof Error ? err.message : "Could not open the payment window.");
      }
    };

    const existing = document.getElementById("easebuzz-checkout-sdk") as HTMLScriptElement | null;
    if (existing) {
      if ((window as { EasebuzzCheckout?: unknown }).EasebuzzCheckout) {
        openLightbox();
      } else {
        existing.addEventListener("load", openLightbox);
        existing.addEventListener("error", () => setSdkState("error"));
      }
    } else {
      const s = document.createElement("script");
      s.id = "easebuzz-checkout-sdk";
      s.src = SDK_URL;
      s.async = true;
      s.onload = openLightbox;
      s.onerror = () => {
        setSdkState("error");
        setSdkError("Could not load the Easebuzz payment SDK.");
      };
      document.body.appendChild(s);
    }

    return () => {
      cancelled = true;
    };
  }, [accessKey, merchantKey, env]);

  // Lock the page scroll behind the modal
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // The gateway frame ends its journey on our own /pay page (the surl/furl
  // redirect target), which posts the outcome here. Same-origin messages only.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | { type?: string; status?: string; order_number?: string }
        | null;
      if (data?.type !== "ELEKTRIX_PAYMENT_RESULT") return;
      onGatewayResult?.({
        status: data.status === "success" ? "success" : "failed",
        orderNumber: data.order_number,
      });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fallbackSafe = checkoutUrl ? isSafeGatewayUrl(checkoutUrl) : false;

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
            {fallbackSafe && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the payment page in a new tab if the embedded window does not load"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                <ExternalLink className="w-3.5 h-3.5" /> New tab
              </a>
            )}
            <button
              onClick={onClose}
              aria-label="Close payment window"
              className="inline-flex items-center justify-center rounded-full border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center bg-white sm:rounded-b-3xl">
          {sdkState !== "ready" && (
            <div className="flex flex-col items-center justify-center px-6 text-center">
              {sdkState === "error" ? (
                <>
                  <ShieldCheck className="w-10 h-10 text-neutral-300" />
                  <p className="mt-4 text-sm text-neutral-600">{sdkError || "The embedded payment window could not be opened."}</p>
                  {fallbackSafe && (
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
                    >
                      <ExternalLink className="w-4 h-4" /> Pay in a new tab instead
                    </a>
                  )}
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-neutral-900" />
                  <p className="mt-4 text-sm text-neutral-500">Opening secure payment gateway…</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

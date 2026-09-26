"use client";

/**
 * Shared loader for the official Easebuzz EaseCheckout JS SDK.
 *
 * Loading it once (and preconnecting to the gateway hosts) ahead of the
 * "Pay" click removes ~1-2s from the payment handoff: the script is cached
 * and the TLS sessions to the gateway are already established when the
 * lightbox opens.
 */
export const EASEBUZZ_SDK_URL =
  "https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/v2.0.0/easebuzz-checkout-v2.min.js";

const SDK_SCRIPT_ID = "easebuzz-checkout-sdk";

export function preconnectEasebuzz(): void {
  if (typeof document === "undefined") return;
  for (const href of ["https://pay.easebuzz.in", "https://ebz-static.s3.ap-south-1.amazonaws.com"]) {
    if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
      const l = document.createElement("link");
      l.rel = "preconnect";
      l.href = href;
      l.crossOrigin = "anonymous";
      document.head.appendChild(l);
    }
  }
}

/** Idempotently injects the EaseCheckout SDK; resolves when it is ready. */
export function loadEasebuzzSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  preconnectEasebuzz();
  const w = window as unknown as { EasebuzzCheckout?: unknown };
  if (w.EasebuzzCheckout) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;
    const s = existing ?? document.createElement("script");
    if (!existing) {
      s.id = SDK_SCRIPT_ID;
      s.src = EASEBUZZ_SDK_URL;
      s.async = true;
      document.body.appendChild(s);
    }
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
  });
}

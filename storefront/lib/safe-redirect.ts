/**
 * Guard for redirects to URLs that come from the API (payment gateways,
 * notification links). Only same-origin paths and https URLs on known
 * payment hosts may be navigated to — everything else is refused, so a
 * compromised API or a MITM cannot turn the app into an open redirect.
 */
const ALLOWED_REDIRECT_HOSTS = new Set([
  "pay.easebuzz.in",
  "testpay.easebuzz.in",
]);

export function isSafeRedirectUrl(url: string): boolean {
  if (!url) return false;
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const u = new URL(url, origin || "https://elektrix.in");
    if (origin && u.origin === origin) return true;
    return u.protocol === "https:" && ALLOWED_REDIRECT_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/** Navigate only to allow-listed targets; silently ignore anything else. */
export function safeNavigate(url: string): boolean {
  if (!isSafeRedirectUrl(url)) return false;
  window.location.assign(url);
  return true;
}

/**
 * Open a payment-gateway URL. In an installed PWA (standalone display),
 * same-window cross-origin navigations can fail silently — handing off to
 * the device browser always opens the gateway. Returns false if the URL
 * was refused by the allow-list.
 */
export function openPaymentGateway(url: string): boolean {
  if (!isSafeRedirectUrl(url)) return false;
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);
  if (standalone) {
    const win = window.open(url, "_blank", "noopener");
    if (win) return true;
    // Popup blocked — fall back to same-window navigation.
  }
  window.location.assign(url);
  return true;
}

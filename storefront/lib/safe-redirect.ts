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

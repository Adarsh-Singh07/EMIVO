/**
 * Shared formatting helpers.
 *
 * IMPORTANT: all money values crossing the v0.2 API boundary are integer
 * PAISE (₹2,700 = 270000). The UI Product shape also carries paise, so every
 * rupee render must go through `inr()`. Never multiply/divide prices anywhere
 * else (line totals = unit_price × qty are computed where displayed).
 */

/** Format integer paise as an Indian-rupee string, e.g. 270000 → "₹2,700". */
export const inr = (paise: number): string =>
  `₹${(paise / 100).toLocaleString("en-IN")}`;

/** Format an ISO timestamp as a short Indian date, e.g. "12 Aug 2026". */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

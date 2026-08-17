/**
 * Money helpers. ALL amounts crossing the API are integer paise.
 * Display: ₹ (paise/100).toLocaleString("en-IN"); inputs in ₹ convert ×100.
 */

/** Format integer paise as an INR display string, e.g. 270000 -> "₹2,700". */
export function formatINR(paise: number | null | undefined, opts?: { decimals?: boolean }): string {
  const value = (paise ?? 0) / 100;
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  })}`;
}

/** Convert a rupee input string ("1,299.50", "1299") to integer paise. Returns null when invalid/empty. */
export function rupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Format paise for an <input> in rupees, e.g. 129900 -> "1299" (no trailing zeros trimmed beyond cents). */
export function paiseToRupeeInput(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "";
  return (paise / 100).toString();
}

/** ISO datetime (UTC) -> value usable in <input type="datetime-local"> (local time). */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value -> ISO string (or null when empty). */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

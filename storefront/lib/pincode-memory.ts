"use client";

/**
 * Single source of truth for the buyer's delivery PIN code.
 *
 * Flipkart/Amazon style: whichever surface the buyer interacts with (site
 * header "Delivering to", a product page delivery checker, or the checkout
 * address form) reads and writes ONE shared key, so a PIN chosen anywhere is
 * remembered everywhere for the next visit.
 *
 * The key is namespaced "elektrix_pincode". Two pre-existing keys are honored
 * as fallbacks so buyers who set a PIN before this change keep it.
 */

const CANONICAL_KEY = "elektrix_pincode";
const LEGACY_KEYS = ["elektrix-pincode", "elektrix_delivery_pincode"];
const PINCODE_RE = /^\d{6}$/;

export function getRememberedPincode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const direct = localStorage.getItem(CANONICAL_KEY);
    if (direct && PINCODE_RE.test(direct)) return direct;
    for (const k of LEGACY_KEYS) {
      const legacy = localStorage.getItem(k);
      if (legacy && PINCODE_RE.test(legacy)) return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function rememberPincode(pin: string): void {
  if (typeof window === "undefined") return;
  const clean = pin.replace(/\D/g, "").slice(0, 6);
  if (!PINCODE_RE.test(clean)) return;
  try {
    localStorage.setItem(CANONICAL_KEY, clean);
    // Clear the legacy keys so the canonical one is the only source of truth.
    for (const k of LEGACY_KEYS) {
      localStorage.removeItem(k);
    }
  } catch {
    /* storage unavailable (private mode) — silently skip */
  }
}

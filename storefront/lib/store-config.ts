"use client";

/**
 * Live store shipping/commerce rules. The checkout and cart used to read
 * HARDCODED thresholds while the backend computed the authoritative values
 * from admin settings — the displayed shipping disagreed with the charged
 * amount. Now both sides read the same store config; it refreshes on every
 * checkout/cart mount (cache TTL 60s) so admin updates appear immediately.
 */
import { useEffect, useState } from "react";
import { API_URL } from "./api-client";

export interface StoreShippingConfig {
  freeShippingThresholdPaise: number;
  flatShippingPaise: number;
  minOrderPaise: number;
}

const DEFAULTS: StoreShippingConfig = {
  freeShippingThresholdPaise: 99900,
  flatShippingPaise: 9900,
  minOrderPaise: 0,
};

let cache: (StoreShippingConfig & { fetchedAt: number }) | null = null;
const TTL_MS = 60_000;

export async function fetchStoreShippingConfig(force = false): Promise<StoreShippingConfig> {
  if (!force && cache && Date.now() - cache.fetchedAt < TTL_MS) return cache;
  try {
    const res = await fetch(`${API_URL}/store/config`, { cache: "no-store" });
    const d = await res.json();
    cache = {
      freeShippingThresholdPaise: d.free_shipping_threshold_paise ?? DEFAULTS.freeShippingThresholdPaise,
      flatShippingPaise: d.flat_shipping_paise ?? DEFAULTS.flatShippingPaise,
      minOrderPaise: d.min_order_paise ?? 0,
      fetchedAt: Date.now(),
    };
  } catch {
    if (!cache) cache = { ...DEFAULTS, fetchedAt: Date.now() };
  }
  return cache;
}

export function computeShipping(subtotal: number, discount: number, cfg: StoreShippingConfig): number {
  return subtotal - discount >= cfg.freeShippingThresholdPaise ? 0 : cfg.flatShippingPaise;
}

/** React hook: live shipping config, force-refreshed on mount. */
export function useStoreShippingConfig(): StoreShippingConfig {
  const [cfg, setCfg] = useState<StoreShippingConfig>(cache ?? DEFAULTS);
  useEffect(() => {
    let cancelled = false;
    fetchStoreShippingConfig(true).then((c) => {
      if (!cancelled) setCfg(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return cfg;
}

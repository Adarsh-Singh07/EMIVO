/**
 * Privacy-friendly analytics event layer.
 *
 * No tracking script is loaded unless a matching NEXT_PUBLIC_* ID is set at
 * build time (see components/site/Analytics.tsx and .env.example). When no
 * provider is configured, track() is a no-op — the storefront must never
 * reference a hard-coded tracking ID.
 *
 * Events follow the GA4 e-commerce vocabulary; Meta Pixel standard-event
 * names are mapped in META_EVENT_MAP. Events implemented in the app:
 * - view_item        (product page view)
 * - add_to_cart      (card + PDP add, centralised in CartProvider.add)
 * - begin_checkout   (checkout page mount)
 * - purchase         (online payment confirmed / COD order placed)
 * - search           (header search submit)
 */

type Payload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const META_EVENT_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  search: "Search",
};

export function track(event: string, params: Payload = {}): void {
  if (typeof window === "undefined") return;
  try {
    // GA4 (gtag) — also forwards to GTM because GTM's dataLayer bridge
    // registers gtag when configured.
    window.gtag?.("event", event, params);
    // GTM direct push (works even without gtag bridging).
    window.dataLayer?.push({ event, ...params });
    // Meta Pixel — map to standard event names.
    const metaEvent = META_EVENT_MAP[event];
    if (metaEvent) window.fbq?.("track", metaEvent, params);
  } catch {
    // Analytics must never break the shopping journey.
  }
}

/** Shared e-commerce item shape for event parameters. */
export function itemParams(item: {
  id: string;
  name: string;
  brand?: string;
  price?: number; // paise — may be undefined until the server responds
  quantity?: number;
  category?: string;
}): Payload {
  return {
    currency: "INR",
    value: item.price != null ? item.price / 100 : undefined,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        item_brand: item.brand,
        item_category: item.category,
        quantity: item.quantity ?? 1,
        price: item.price != null ? item.price / 100 : undefined,
      },
    ],
  };
}

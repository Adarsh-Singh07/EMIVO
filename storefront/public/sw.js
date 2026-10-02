/* ELEKTRIX storefront service worker — deliberately conservative.
 *
 * This is a payment-gated store. The golden rule: NEVER serve stale prices,
 * stock, cart, auth or checkout data. So the policy is:
 *
 *  - Navigations (HTML): NETWORK-FIRST. A page is always fetched live; the
 *    cache is only used if the network fails (offline / flaky mobile).
 *  - API + credentialed + cross-origin requests: NEVER cached, ever.
 *  - /_next/static/* : CACHE-FIRST. These are content-hashed and immutable,
 *    so serving them from cache is always safe and makes repeat loads fast.
 *  - Other same-origin static assets (images, icons, fonts): network-first,
 *    cached as a fallback for repeat/offline loads.
 *
 * If any part of this throws, it must never take the app down — every step
 * in the fetch handler degrades to a plain network fetch.
 */

const VERSION = "v1";
const STATIC_CACHE = `elektrix-static-${VERSION}`;
const IMMUTABLE_PREFIX = "/_next/static/";
const OFFLINE_URL = "/offline";

const isSameOrigin = (req) => new URL(req.url).origin === self.location.origin;
const isNavigate = (req) => req.mode === "navigate";
const isStaticAsset = (req) =>
  ["image", "stylesheet", "font", "script"].includes(req.destination) ||
  /\.(png|jpe?g|webp|svg|avif|ico|woff2?|css)$/i.test(req.url);

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]).catch(() => {}))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("elektrix-static-") && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never intercept mutations

  const url = new URL(req.url);

  // API / data / credentialed / cross-origin: straight through, no cache.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data") ||
    req.credentials !== "omit" ||
    !isSameOrigin(req)
  ) {
    return;
  }

  event.respondWith(handle(req));
});

async function handle(req) {
  const url = new URL(req.url);

  // Immutable, hashed static chunks: cache-first (safe, fast).
  if (url.pathname.startsWith(IMMUTABLE_PREFIX)) {
    try {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const resp = await fetch(req);
      if (resp.ok) cache.put(req, resp.clone());
      return resp;
    } catch {
      return fetch(req);
    }
  }

  // Navigations: network-first, fall back to the offline page when the
  // network is unreachable. Never serve cached HTML.
  if (isNavigate(req)) {
    try {
      const resp = await fetch(req);
      if (resp && resp.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(OFFLINE_URL, resp.clone()); // keep an offline shell fresh
      }
      return resp;
    } catch {
      const cache = await caches.open(STATIC_CACHE);
      const offline =
        (await cache.match(OFFLINE_URL)) || (await cache.match("/"));
      if (offline) return offline;
      return new Response("You are offline.", {
        status: 503,
        statusText: "Offline",
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  // Other static assets: network-first, cache fallback.
  try {
    const resp = await fetch(req);
    if (resp.ok && isStaticAsset(req)) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, resp.clone());
    }
    return resp;
  } catch {
    const hit = await (await caches.open(STATIC_CACHE)).match(req);
    if (hit) return hit;
    // Asset genuinely missing / offline and never cached: don't break the page.
    return new Response(null, { status: 504 });
  }
}

/* EMIVO Service Worker v1.0
 * Strategy:
 *  - App-shell routes: network-first with cache fallback (always fresh HTML when online)
 *  - Hashed build assets (_next/static): cache-first (immutable, long-lived)
 *  - Images (icons, fynode, downloads): stale-while-revalidate
 *  - Offline fallback to the cached home page
 */

const VERSION = 'emivo-v1.0';
const APP_SHELL = [
  '/',
  '/products',
  '/search',
  '/about',
  '/offline',
];

const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-images`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Navigation requests: network-first, fall back to cache, then offline shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip Next.js dev overlay / HMR in development
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // App shell / navigations
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Hashed Next.js build assets — immutable, cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Images: stale-while-revalidate
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(
        (cached) => {
          const network = fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                const copy = response.clone();
                caches.open(IMAGE_CACHE).then((cache) => cache.put(request, copy));
              }
              return response;
            })
            .catch(() => cached);
          return cached || network;
        }
      )
    );
    return;
  }

  // Fonts: cache-first
  if (url.pathname.includes('/fonts/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

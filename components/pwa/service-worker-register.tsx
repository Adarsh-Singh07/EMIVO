'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker for offline support.
 * Only runs in production builds — dev mode keeps HMR uncluttered.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    let active = true;
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        if (!active) return;
        reg.update();
      } catch (err) {
        if (active) console.error('[PWA] Service worker registration failed:', err);
      }
    };

    // Register after load so it never competes with initial render.
    window.addEventListener('load', register);
    return () => {
      active = false;
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}

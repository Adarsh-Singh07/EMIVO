"use client";

import { useEffect } from "react";

/**
 * Registers the storefront service worker (/public/sw.js) in production only.
 * The SW is network-first and never caches API/HTML (see sw.js header), so it
 * cannot serve stale prices or auth state; it only adds offline resilience
 * and enables the browser install prompt (PwaInstallPrompt).
 */
export default function PwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // A failed SW registration must never break the storefront.
          console.warn("Service worker registration skipped:", err?.message || err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

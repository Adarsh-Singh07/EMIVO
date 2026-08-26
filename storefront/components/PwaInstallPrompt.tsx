"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (sessionStorage.getItem("pwa-prompt-dismissed")) {
      setIsDismissed(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || isDismissed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-neutral-950 text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-3 z-[100] animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-neutral-950 rounded-xl grid place-items-center shrink-0 font-black text-xl">
            E
          </div>
          <div>
            <h4 className="font-semibold text-sm leading-tight">ELEKTRIX App</h4>
            <p className="text-xs text-neutral-400 mt-0.5">Faster, better shopping</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-neutral-500 hover:text-white transition-colors" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
      <button 
        onClick={handleInstall}
        className="w-full bg-white text-neutral-950 rounded-xl py-2.5 text-sm font-semibold hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        Install App Now
      </button>
    </div>
  );
}

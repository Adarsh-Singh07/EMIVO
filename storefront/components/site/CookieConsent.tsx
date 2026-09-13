"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";

/*
 * Cookie consent (M1).
 * Below md (768px) the mobile bottom nav is visible (~64px + safe-area), so
 * the banner floats ABOVE it — it must never cover navigation. Below sm it
 * also leaves a right-side gutter for the support-chat FAB so the two never
 * overlap. At md+ it returns to the relaxed bottom-left card.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("elektrix_cookie_consent")) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed z-50 bottom-[calc(64px+env(safe-area-inset-bottom))] left-4 right-20 sm:right-24 md:left-8 md:right-auto md:bottom-6 md:max-w-sm bg-neutral-950 text-white p-5 rounded-2xl shadow-2xl dark-surface flex flex-col gap-4"
    >
      <div>
        <h3 className="font-semibold text-sm">We value your privacy</h3>
        <p className="text-xs text-neutral-400 mt-1">
          We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={() => {
            localStorage.setItem("elektrix_cookie_consent", "1");
            setShow(false);
          }}
          className="flex-1 !rounded-lg"
        >
          Accept
        </Button>
        <button
          onClick={() => setShow(false)}
          className="tap-target w-9 h-9 flex items-center justify-center bg-neutral-800 text-neutral-400 rounded-lg hover:text-white"
          aria-label="Close cookie banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

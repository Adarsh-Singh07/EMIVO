"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("elektrix_cookie_consent")) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-8 md:max-w-sm bg-neutral-950 text-white p-5 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-sm">We value your privacy</h3>
        <p className="text-xs text-neutral-400 mt-1">
          We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            localStorage.setItem("elektrix_cookie_consent", "1");
            setShow(false);
          }}
          className="flex-1 bg-white text-neutral-950 text-sm font-semibold h-9 rounded-lg hover:bg-neutral-100"
        >
          Accept
        </button>
        <button
          onClick={() => setShow(false)}
          className="w-9 h-9 flex items-center justify-center bg-neutral-800 text-neutral-400 rounded-lg hover:text-white"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

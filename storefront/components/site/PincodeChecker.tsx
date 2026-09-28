"use client";

import { useEffect, useState } from "react";
import { MapPin, Truck, CheckCircle2, XCircle, Loader2, Navigation } from "lucide-react";
import Button from "@/components/ui/Button";
import { storeApi, type ShippingEstimate } from "@/lib/store-api";

const PINCODE_RE = /^\d{6}$/;
const LOCAL_PIN_KEY = "elektrix_delivery_pincode";

export default function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShippingEstimate | null>(null);

  // Restore saved pincode from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_PIN_KEY);
      if (saved && PINCODE_RE.test(saved)) {
        setPincode(saved);
        checkPincodeValue(saved);
      }
    } catch {
      // Ignore local storage errors
    }
  }, []);

  const checkPincodeValue = async (pin: string) => {
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const data = await storeApi.getShippingEstimate(pin);
      setResult(data);
      if (data.serviceable) {
        try {
          localStorage.setItem(LOCAL_PIN_KEY, pin);
        } catch {}
      }
    } catch {
      setResult({
        serviceable: false,
        message: "We couldn't verify this pincode right now. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = pincode.trim();
    if (!PINCODE_RE.test(v)) {
      setError("Enter a valid 6-digit PIN code — e.g. 841508 or 560001.");
      setResult(null);
      return;
    }
    checkPincodeValue(v);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const geo = await storeApi.reverseGeocode(lat, lon);
          if (geo.success && geo.pincode) {
            setPincode(geo.pincode);
            if (geo.estimate) {
              setResult(geo.estimate);
              try {
                localStorage.setItem(LOCAL_PIN_KEY, geo.pincode);
              } catch {}
            } else {
              checkPincodeValue(geo.pincode);
            }
          } else {
            setError(geo.message || "Could not detect PIN code from current location. Enter manually.");
          }
        } catch {
          setError("Failed to fetch location details. Please enter your PIN code manually.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setError("Location access denied. Please type your 6-digit PIN code.");
        } else {
          setError("Could not fetch location. Please type your 6-digit PIN code.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="mt-6 border border-neutral-200 rounded-2xl p-4 bg-neutral-50/70 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-neutral-900">Delivery &amp; Service Availability</span>
        </div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating || loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50 transition-colors"
          title="Detect my current location"
        >
          {locating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Detecting…</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              <span>Use Current Location</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2" noValidate>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            maxLength={6}
            inputMode="numeric"
            placeholder="Enter 6-digit PIN code (e.g. 841508)"
            value={pincode}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, "");
              setPincode(cleaned);
              if (error) setError("");
              if (cleaned.length === 6) {
                checkPincodeValue(cleaned);
              }
            }}
            aria-label="Delivery pincode"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "pincode-error" : undefined}
            className={`w-full h-10 px-3.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all ${
              error ? "border-red-400" : "border-neutral-300"
            }`}
          />
        </div>
        <Button
          type="submit"
          disabled={pincode.length !== 6 || loading}
          loading={loading}
          className="min-w-[84px] rounded-xl text-sm"
        >
          {loading ? "Checking…" : "Check"}
        </Button>
      </form>

      {error && (
        <p id="pincode-error" role="alert" className="mt-2.5 flex items-start gap-1.5 text-xs text-red-600">
          <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          {error}
        </p>
      )}

      {loading && !result && (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-700" />
          Checking Delhivery express courier options for {pincode}…
        </p>
      )}

      {result && !loading && (
        <div className="mt-3.5 pt-3.5 border-t border-neutral-200/80 space-y-2.5" role="status">
          {result.serviceable ? (
            <>
              {/* Place Name Banner (Amazon / Flipkart Style) */}
              <div className="flex items-start gap-2.5 text-neutral-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-neutral-900 flex flex-wrap items-center gap-1.5">
                    <span>Delivering to</span>
                    <span className="text-emerald-700 font-bold">
                      {result.city ? `${result.city}, ${result.state}` : `PIN ${result.pincode}`}
                    </span>
                  </div>

                  {result.formatted_delivery_date && (
                    <p className="text-xs text-neutral-800 font-medium mt-0.5">
                      Fastest delivery by{" "}
                      <span className="font-bold text-neutral-950 underline decoration-emerald-500 decoration-2">
                        {result.formatted_delivery_date}
                      </span>{" "}
                      ({result.estimated_days} business days)
                    </p>
                  )}
                </div>
              </div>

              {/* Badges strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600 mt-2">
                <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5">
                  <Truck className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                  <span>Free delivery over ₹999</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    {result.cod_available ? "Cash on Delivery Available" : "Prepaid Delivery via UPI/Cards"}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2 text-red-600">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold block">Not serviceable at {pincode}</span>
                <span className="text-red-500/90 text-xs">
                  {result.message || "We currently do not deliver to this pincode — please check with another code."}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { MapPin, Truck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

type CheckResult = {
  serviceable: boolean;
  estimated_days?: number;
  cod_available?: boolean;
  message?: string;
};

const PINCODE_RE = /^\d{6}$/;

export default function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  const checkPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = pincode.trim();
    if (!PINCODE_RE.test(v)) {
      setError("Enter a valid 6-digit pincode — for example 841508.");
      setResult(null);
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/store/shipping-estimate?pincode=${v}`
      );
      if (res.ok) {
        setResult(await res.json());
      } else {
        setResult({
          serviceable: false,
          message: "We couldn't verify this pincode right now. Please try again in a moment.",
        });
      }
    } catch {
      setResult({
        serviceable: false,
        message: "Network error — check your connection and try again.",
      });
    }
    setLoading(false);
  };

  const networkProblem = result && !result.serviceable && !!result.message;

  return (
    <div className="mt-6 border border-neutral-200 rounded-xl p-4 bg-neutral-50/50">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-neutral-500" />
        <span className="text-sm font-medium">Check Delivery Options</span>
      </div>
      <form onSubmit={checkPincode} className="flex gap-2" noValidate>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            maxLength={6}
            inputMode="numeric"
            placeholder="Enter Pincode"
            value={pincode}
            onChange={(e) => {
              setPincode(e.target.value.replace(/\D/g, ""));
              if (error) setError("");
            }}
            aria-label="Delivery pincode"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "pincode-error" : undefined}
            className={`w-full h-10 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
              error ? "border-red-400" : "border-neutral-300"
            }`}
          />
        </div>
        <Button type="submit" disabled={pincode.length !== 6 || loading} loading={loading} className="min-w-[80px]">
          {loading ? <span className="sr-only">Checking…</span> : "Check"}
        </Button>
      </form>

      {error && (
        <p id="pincode-error" role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          {error}
        </p>
      )}

      {loading && (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking delivery options for {pincode}…
        </p>
      )}

      {result && !loading && (
        <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2" role="status">
          {networkProblem ? (
            /* API/network failure — explain what happened + next step (E2) */
            <div className="flex items-start gap-2 text-amber-700">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold block">Couldn't check this pincode</span>
                <span className="text-amber-600/90 text-xs">{result.message}</span>
              </div>
            </div>
          ) : result.serviceable ? (
            <>
              <div className="flex items-start gap-2 text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-semibold block">Delivery available to {pincode}</span>
                  <span className="text-green-600/90 text-xs">
                    Estimated delivery in {result.estimated_days} days
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs text-neutral-600 ml-6">
                <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Free delivery over ₹999</span>
                {result.cod_available && <span className="flex items-center gap-1.5 text-neutral-600">Pay on Delivery available</span>}
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2 text-red-600">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold block">Not serviceable at {pincode}</span>
                <span className="text-red-500/90 text-xs">
                  We currently don't deliver to this pincode — try another one.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { MapPin, Truck, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length !== 6) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/store/shipping-estimate?pincode=${pincode}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        setResult({ serviceable: false, message: "Could not check pincode" });
      }
    } catch {
      setResult({ serviceable: false, message: "Network error" });
    }
    setLoading(false);
  };

  return (
    <div className="mt-6 border border-neutral-200 rounded-xl p-4 bg-neutral-50/50">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-neutral-500" />
        <span className="text-sm font-medium">Check Delivery Options</span>
      </div>
      <form onSubmit={checkPincode} className="flex gap-2">
        <input
          type="text"
          maxLength={6}
          placeholder="Enter Pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
          className="flex-1 h-10 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <button
          type="submit"
          disabled={pincode.length !== 6 || loading}
          className="h-10 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-neutral-800 transition-colors flex items-center justify-center min-w-[80px]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
        </button>
      </form>

      {result && (
        <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2">
          {result.serviceable ? (
            <>
              <div className="flex items-start gap-2 text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-semibold block">Delivery Available</span>
                  <span className="text-green-600/90 text-xs">Estimated delivery in {result.estimated_days} days</span>
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
                <span className="font-semibold block">Not Serviceable</span>
                <span className="text-red-500/90 text-xs">We currently do not deliver to this pincode.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, RefreshCw, AlertCircle, Loader2, Send, Eye, Users } from "lucide-react";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";

interface SegmentInfo {
  key: string;
  name: string;
  description: string;
  count: number;
}

interface Preview {
  confirm_required: true;
  count: number;
  sample: { email: string }[];
  coupon_code: string | null;
}

const inputCls =
  "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
const labelCls = "mb-1.5 block text-sm font-semibold text-neutral-700";

export default function BroadcastsPage() {
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState("failed_payments_30d");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [useCoupon, setUseCoupon] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSegments(await apiClient.get<SegmentInfo[]>("/admin/marketing/segments"));
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Failed to load segments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const payload = () => ({
    segment,
    subject: subject.trim(),
    message: message.trim(),
    confirm: false,
    coupon: useCoupon && code.trim()
      ? {
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: discountType === "PERCENTAGE" ? Number(value) : Math.round(Number(value) * 100),
          min_order_amount: minOrder ? Math.round(Number(minOrder) * 100) : null,
          end_date: null,
        }
      : null,
  });

  const doPreview = async () => {
    if (!subject.trim() || message.trim().length < 10) {
      toast.error("Write a subject and a message first");
      return;
    }
    setSending(true);
    setPreview(null);
    try {
      const res = await apiClient.post<Preview>("/admin/marketing/broadcasts", payload());
      setPreview(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Preview failed");
    } finally {
      setSending(false);
    }
  };

  const doSend = async () => {
    if (!preview) return;
    if (!window.confirm(`Send "${subject.trim()}" to ${preview.count} customer(s)? This cannot be undone.`)) return;
    setSending(true);
    try {
      const body = { ...payload(), confirm: true };
      const res = await apiClient.post<{ queued: number; coupon_code: string | null }>(
        "/admin/marketing/broadcasts", body,
      );
      toast.success(`Broadcast queued — ${res.queued} email(s) going out from hello@elektrix.in`);
      setPreview(null);
      setSubject("");
      setMessage("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const selected = segments.find((s) => s.key === segment);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-amber-500" />
          Broadcasts
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          Email a customer segment from <span className="font-medium">hello@elektrix.in</span> — with an optional coupon code.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {loading && segments.length === 0 ? (
        <div className="h-40 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
      ) : (
        <>
          {/* Segment picker */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-neutral-900">1. Pick a segment</h2>
              <button onClick={load} className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Recount
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {segments.map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setSegment(s.key); setPreview(null); }}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    segment === s.key
                      ? "border-amber-400 bg-amber-50 ring-2 ring-amber-500/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-900">{s.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500">
                      <Users className="w-3 h-3" /> {s.count}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">{s.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Compose */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-neutral-900">2. Write it</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Subject *</label>
                <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. A Diwali treat just for you" maxLength={120} />
              </div>
              <div>
                <label className={labelCls}>Message * (plain text)</label>
                <textarea className={`${inputCls} min-h-[110px] py-2`} value={message}
                  onChange={(e) => setMessage(e.target.value)} maxLength={4000}
                  placeholder="Hi {name} — we miss you! Here's 10% off your next order…" />
              </div>

              {/* Coupon */}
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
                <span className="text-sm font-semibold text-neutral-700">Attach a coupon code</span>
                <input type="checkbox" checked={useCoupon} onChange={(e) => setUseCoupon(e.target.checked)} className="h-5 w-5 accent-amber-500" />
              </label>
              {useCoupon && (
                <div className="grid gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Code *</label>
                    <input className={`${inputCls} font-mono uppercase`} value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                      placeholder="DIWALI10" />
                  </div>
                  <div>
                    <label className={labelCls}>Type *</label>
                    <select className={inputCls} value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")}>
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED_AMOUNT">Fixed amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{discountType === "PERCENTAGE" ? "Percent *" : "Amount (₹) *"}</label>
                    <input className={inputCls} type="number" min="1" value={value}
                      onChange={(e) => setValue(e.target.value)} placeholder={discountType === "PERCENTAGE" ? "10" : "200"} />
                  </div>
                  <div>
                    <label className={labelCls}>Min order (₹)</label>
                    <input className={inputCls} type="number" min="0" value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)} placeholder="optional" />
                  </div>
                  <p className="text-xs text-neutral-400 sm:col-span-2">
                    The coupon is created automatically (1 use per customer) when the broadcast is sent.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Preview + send */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-neutral-900">3. Preview &amp; send</h2>
            {preview && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <p><span className="font-bold">{preview.count}</span> recipient(s) will receive this email.</p>
                {preview.sample.length > 0 && (
                  <p className="mt-1 text-xs text-blue-600">
                    e.g. {preview.sample.map((s) => s.email).join(", ")}
                  </p>
                )}
                {preview.coupon_code && (
                  <p className="mt-1 text-xs text-blue-600">Coupon <span className="font-mono font-bold">{preview.coupon_code}</span> will be created.</p>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={doPreview}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Check audience
              </button>
              <button
                onClick={doSend}
                disabled={sending || !preview}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Send to {preview?.count ?? selected?.count ?? 0} customer(s)
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

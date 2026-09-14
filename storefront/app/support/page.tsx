"use client";

/** Support desk: raise tickets (optionally against an order), track replies. */
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, LifeBuoy, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import { storeApi } from "@/lib/store-api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { useSearchParams } from "next/navigation";

function SupportContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Array<any>>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ category: "order", subject: "", description: "", order_id: "" });
  const [orders, setOrders] = useState<Array<any>>([]);
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const t = await storeApi.listTickets();
      setTickets(t);
      if (selected) setSelected(await storeApi.getTicket(selected.id));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    load();
    storeApi.listOrders({ page: 1, page_size: 20 }).then((d) => {
      setOrders(d.items || []);
      const pre = searchParams.get("order");
      if (pre) setForm((f) => ({ ...f, order_id: pre }));
    }).catch(() => {});
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selected?.messages?.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Add a subject and describe the issue");
      return;
    }
    setCreating(true);
    try {
      const t = await storeApi.createTicket({
        category: form.category, subject: form.subject.trim(),
        description: form.description.trim(), order_id: form.order_id || undefined,
      });
      toast.success("Ticket raised — our team will reply here.");
      setForm({ category: "order", subject: "", description: "", order_id: "" });
      await load();
      setSelected(await storeApi.getTicket(t.id));
    } catch (err: any) {
      toast.error(err?.message || "Could not raise the ticket");
    } finally { setCreating(false); }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    try {
      await storeApi.replyTicket(selected.id, reply.trim());
      setReply("");
      setSelected(await storeApi.getTicket(selected.id));
    } catch (err: any) { toast.error(err?.message || "Could not send"); }
  };

  if (authLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-900" /></div>;
  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center">
          <LifeBuoy className="w-12 h-12 text-neutral-300 mx-auto" />
          <p className="mt-4 text-neutral-600">Sign in to raise and track support tickets.</p>
          <Link href="/login?next=/support" className="mt-4 inline-flex px-6 py-3 rounded-full bg-neutral-950 text-white text-sm font-semibold">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
          <Link href="/account" className="hover:text-neutral-900">My Account</Link>
          <ChevronRight className="w-3.5 h-3.5" /><span>Support</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-8">Help &amp; Support</h1>

        {!selected ? (
          <>
            <form onSubmit={submit} className="rounded-3xl border border-neutral-200 bg-white p-6 space-y-4 mb-8">
              <h2 className="font-semibold">Raise a new ticket</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-11 px-3 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950">
                  <option value="order">Order issue</option>
                  <option value="payment">Payment issue</option>
                  <option value="product">Product issue</option>
                  <option value="delivery">Delivery issue</option>
                  <option value="other">Something else</option>
                </select>
                <select value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })}
                  className="h-11 px-3 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950">
                  <option value="">No specific order</option>
                  {orders.map((o) => {
                    const prod = o.items?.[0]?.product_name || "Order";
                    const more = (o.items?.length || 0) > 1 ? ` +${o.items.length - 1} more` : "";
                    return (
                      <option key={o.id} value={o.id}>
                        {prod}{more} — {o.order_number || o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </option>
                    );
                  })}
                </select>
              </div>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Subject — e.g. Payment failed but order shows pending"
                className="w-full h-11 px-4 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950" required />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what happened…" rows={4}
                className="w-full p-4 rounded-xl border border-neutral-300 text-sm outline-none focus:border-neutral-950" required />
              <button disabled={creating} className="h-11 px-6 rounded-full bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} Raise Ticket
              </button>
            </form>

            <h2 className="font-semibold mb-3">Your tickets</h2>
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-neutral-400" /> : tickets.length === 0 ? (
              <p className="text-sm text-neutral-500">No tickets yet.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <button key={t.id} onClick={() => storeApi.getTicket(t.id).then(setSelected)}
                    className="w-full text-left p-4 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{t.subject}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{t.ticket_number || t.id.slice(0, 8)} · {t.category} · {formatDate(t.updated_at)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${t.status === "resolved" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{t.status.replace("_", " ")}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-neutral-200 bg-white p-6">
            <button onClick={() => { setSelected(null); load(); }} className="text-sm text-neutral-500 hover:text-neutral-900 mb-4">← All tickets</button>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold">{selected.subject}</p>
                <p className="text-xs text-neutral-400">{selected.ticket_number} · {selected.category}{selected.order_number ? ` · ${selected.order_number}` : ""} · {selected.status}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selected.status === "resolved" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{selected.status.replace("_", " ")}</span>
            </div>
            <div className="space-y-3 max-h-[45vh] overflow-y-auto p-1">
              {(selected.messages || []).map((m: any) => (
                <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${m.sender === "user" ? "bg-neutral-950 text-white rounded-br-sm" : m.sender === "bot" ? "bg-blue-50 text-neutral-800 rounded-bl-sm" : "bg-neutral-100 text-neutral-900 rounded-bl-sm"}`}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="text-[10px] opacity-60 mt-1">{formatDate(m.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="flex gap-2 mt-4">
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…"
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                className="flex-1 h-11 px-4 rounded-full border border-neutral-300 text-sm outline-none focus:border-neutral-950" />
              <button onClick={sendReply} disabled={!reply.trim()}
                className="h-11 w-11 grid place-items-center rounded-full bg-neutral-950 text-white disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupportPage() {
  return <Suspense fallback={<div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}><SupportContent /></Suspense>;
}

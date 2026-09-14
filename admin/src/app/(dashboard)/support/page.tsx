"use client";

/** Admin Support Box — all customer tickets, live every 10s. */
import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface Ticket {
  id: string; subject: string; category: string; status: string;
  order_number?: string | null; updated_at: string;
  messages: Array<{ id: string; sender: string; body: string; created_at: string }>;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      const t = await apiClient.get<Ticket[]>(`/admin/support/tickets${q}`);
      setTickets(t);
      if (selected) {
        const fresh = await apiClient.get<Ticket>(`/admin/support/tickets/${selected.id}`);
        setSelected(fresh);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter, selected]);

  useEffect(() => { load(); const t = setInterval(load, 3_000); return () => clearInterval(t); }, [load]);

  const send = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(`/admin/support/tickets/${selected.id}/messages`, { body: reply.trim() });
      setReply("");
      setSelected(await apiClient.get<Ticket>(`/admin/support/tickets/${selected.id}`));
    } catch (e: any) { toast.error(e?.message || "Failed to send"); }
    finally { setBusy(false); }
  };

  /** Sends the typed reply to the customer by EMAIL too (and logs it on the
   * ticket thread so there's a full record of what was emailed). */
  const emailCustomer = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(`/admin/support/tickets/${selected.id}/email`, { body: reply.trim() });
      toast.success("Email sent to customer");
      setReply("");
      setSelected(await apiClient.get<Ticket>(`/admin/support/tickets/${selected.id}`));
    } catch (e: any) { toast.error(e?.message || "Failed to send email"); }
    finally { setBusy(false); }
  };

  const setStatus = async (s: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await apiClient.patch(`/admin/support/tickets/${selected.id}/status`, { status: s });
      setSelected(await apiClient.get<Ticket>(`/admin/support/tickets/${selected.id}`));
      load();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><LifeBuoy className="h-6 w-6" /> Support Box</h1>
          <p className="text-sm text-neutral-500 mt-1">Customer tickets — replies appear in their Support page instantly (10s polling).</p>
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setSelected(null); }}
          className="h-10 px-3 rounded-xl border border-neutral-200 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading ? (
        <div className="p-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className={`space-y-2 ${selected ? "hidden lg:block lg:col-span-2" : "lg:col-span-5"}`}>
            {tickets.length === 0 && <p className="text-sm text-neutral-500 p-4">No tickets.</p>}
            {tickets.map((t) => (
              <button key={t.id} onClick={() => apiClient.get(`/admin/support/tickets/${t.id}`).then(setSelected)}
                className={`w-full text-left p-4 rounded-2xl border bg-white hover:border-neutral-300 transition-colors ${selected?.id === t.id ? "border-neutral-900" : "border-neutral-200"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{t.subject}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${t.status === "resolved" ? "bg-green-50 text-green-700 border-green-200" : t.status === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{t.status.replace("_", " ")}</span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">{t.category}{t.order_number ? ` · ${t.order_number}` : ""} · {new Date(t.updated_at).toLocaleString("en-IN")}</p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="lg:col-span-3 rounded-2xl border border-neutral-200 bg-white p-5">
              <button onClick={() => setSelected(null)} className="lg:hidden text-sm text-neutral-500 mb-3">← All tickets</button>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <p className="font-bold">{selected.subject}</p>
                  <p className="text-xs text-neutral-400">{selected.category}{selected.order_number ? ` · ${selected.order_number}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  {selected.status !== "in_progress" && <button onClick={() => setStatus("in_progress")} disabled={busy} className="text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50">In progress</button>}
                  {selected.status !== "resolved" && <button onClick={() => setStatus("resolved")} disabled={busy} className="text-xs px-3 py-1.5 rounded-full border border-green-200 text-green-700 hover:bg-green-50">Resolve</button>}
                </div>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto p-1 mb-4">
                {(selected.messages || []).map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${m.sender === "admin" ? "bg-neutral-950 text-white rounded-br-sm" : m.sender === "bot" ? "bg-blue-50 rounded-bl-sm" : "bg-neutral-100 rounded-bl-sm"}`}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="text-[10px] opacity-60 mt-1">{m.sender} · {new Date(m.created_at).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to customer…"
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  className="flex-1 h-10 px-4 rounded-full border border-neutral-300 text-sm outline-none focus:border-neutral-900" />
                <button onClick={send} disabled={busy || !reply.trim()} title="Send in chat"
                  className="h-10 w-10 grid place-items-center rounded-full bg-neutral-950 text-white disabled:opacity-40 shrink-0">
                  <Send className="w-4 h-4" />
                </button>
                <button onClick={emailCustomer} disabled={busy || !reply.trim()} title="Also email this reply to the customer"
                  className="h-10 px-4 grid place-items-center rounded-full border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 shrink-0">
                  Email
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

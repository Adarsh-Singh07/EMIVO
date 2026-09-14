"use client";

/** Floating AI support assistant (Gemini, user-scoped) + quick link to tickets. */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Loader2, MessageCircle, Send, X } from "lucide-react";
import { storeApi } from "@/lib/store-api";
import { useAuth } from "@/lib/auth-context";

type Msg = { from: "you" | "bot"; text: string; ticket?: { id: string; subject: string } };

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Hi! I can help with your orders and payments — status, retries, refunds, or raise a ticket for you. What's up?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Greet the customer by name when they open the assistant.
  useEffect(() => {
    if (open && msgs.length === 1 && user) {
      setMsgs((m) => [
        { ...m[0], text: `Hi ${user.first_name}! 👋 I can help with your orders and payments — status, retries, cancellations, refunds, or product suggestions. What do you need?` },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [msgs, open]);

  /** Render bot text with clickable product links. */
  const renderText = (text: string) => {
    const parts = text.split(/(https:\/\/elektrix\.in\/product\/[^\s)]+)/g);
    return parts.map((part, i) =>
      part.startsWith("https://elektrix.in/product/") ? (
        <Link key={i} href={part.replace(/^https:\/\/elektrix\.in/, "")}
          className="underline underline-offset-2 font-medium text-blue-600" target="_blank">
          {part.replace("https://elektrix.in/product/", "").replace(/-/g, " ")}
        </Link>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { from: "you", text }]);
    setBusy(true);
    try {
      const res = await storeApi.chat(text, {
        user_name: user?.first_name || "",
        history: msgs.slice(-6).map((m) => ({ role: m.from === "you" ? "user" : "assistant", text: m.text })),
      });
      setMsgs((m) => [...m, { from: "bot", text: res.reply, ticket: res.ticket ?? undefined }]);
    } catch (err: any) {
      setMsgs((m) => [...m, { from: "bot", text: err?.message || "I'm unavailable right now — please raise a ticket from the Support page." }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full bg-neutral-950 text-white grid place-items-center shadow-xl hover:bg-neutral-800 transition-colors"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-32 right-3 sm:bottom-24 sm:right-6 z-50 w-[86vw] max-w-[360px] h-[54vh] max-h-[520px] rounded-3xl border border-neutral-200 bg-white shadow-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-neutral-900" />
              <div>
                <p className="text-sm font-semibold">ELEKTRIX Support</p>
                <p className="text-[10px] text-neutral-400">Orders &amp; payments assistant</p>
              </div>
            </div>
            <Link href="/support" onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-2">
              Tickets
            </Link>
          </div>

          <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${m.from === "you" ? "bg-neutral-950 text-white rounded-br-sm" : "bg-neutral-100 text-neutral-900 rounded-bl-sm"}`}>
                  <p className="whitespace-pre-wrap">{m.from === "bot" ? renderText(m.text) : m.text}</p>
                  {m.ticket && (
                    <Link href="/support" onClick={() => setOpen(false)} className="mt-2 inline-block text-xs font-semibold text-blue-600 underline underline-offset-2">
                      View ticket #{m.ticket.id.slice(0, 8)} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {busy && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
          </div>

          <div className="p-3 border-t border-neutral-100 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about an order or payment…"
              className="flex-1 h-10 px-4 rounded-full border border-neutral-300 text-sm outline-none focus:border-neutral-950"
            />
            <button onClick={send} disabled={busy || !input.trim()}
              className="h-10 w-10 grid place-items-center rounded-full bg-neutral-950 text-white disabled:opacity-40 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

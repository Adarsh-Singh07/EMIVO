"use client";

/**
 * ELEKTRIX Admin Assistant — staff-only operations chat.
 * Read-only, tool-calling, audited (see /api/v1/admin/assistant).
 * Conversations persist in localStorage with 30-day retention; tool
 * results are always labeled "verified data" vs. AI suggestion.
 */
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, ShieldCheck, Trash2, User, Loader2, Wrench } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

type Msg = {
  role: "user" | "assistant";
  text: string;
  tools?: string[];
  model?: string;
  ts: number;
  error?: boolean;
};

const STORAGE_KEY = "elektrix_admin_assistant_v1";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function loadHistory(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const msgs: Msg[] = JSON.parse(raw);
    const cutoff = Date.now() - RETENTION_MS;
    return msgs.filter((m) => (m.ts || 0) >= cutoff);
  } catch {
    return [];
  }
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadHistory());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-200)));
      } catch {
        /* storage full — non-fatal */
      }
    }
  }, [messages, loaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy || !user) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q, ts: Date.now() }]);
    setBusy(true);
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text.slice(0, 400) }));
      const data = await apiClient.post<{ reply: string; tools_called: string[]; model: string }>(
        "/admin/assistant",
        { question: q, history }
      );
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.reply, tools: data.tools_called, model: data.model, ts: Date.now() },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "The assistant is unavailable right now.";
      setMessages((m) => [
        ...m,
        { role: "assistant", text: msg, error: true, ts: Date.now() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const SUGGESTIONS = [
    "How are we doing today?",
    "Which orders are stuck in pending?",
    "What needs restocking?",
    "Show customers who ordered most in the last 30 days",
  ];

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[480px] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-neutral-900">
            <Sparkles className="h-6 w-6 text-amber-500" />
            ELEKTRIX Ops Assistant
          </h1>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Read-only · scoped to your store · every turn is audited
          </p>
        </div>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      {/* Thread */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <Bot className="h-7 w-7" />
            </div>
            <p className="max-w-sm text-sm text-neutral-500">
              Ask about <b>orders, inventory, customers and store health</b>. It answers with
              live data from your store — it never changes anything.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-amber-400 hover:bg-amber-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div className={`max-w-[85%] ${m.role === "user" ? "text-right" : ""}`}>
              <div
                className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-relaxed whitespace-pre-wrap ${
                  m.error
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : m.role === "user"
                      ? "bg-neutral-950 text-white"
                      : "border border-neutral-200 bg-neutral-50 text-neutral-900"
                }`}
              >
                {m.text}
              </div>
              {!m.error && m.tools?.length ? (
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400">
                  <Wrench className="h-3 w-3" />
                  Verified with:
                  {m.tools.map((t) => (
                    <span key={t} className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 font-mono text-[10px] text-neutral-600">
                      {t}
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
            {m.role === "user" && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Ask about orders, stock, customers…"
          className="flex-1 resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

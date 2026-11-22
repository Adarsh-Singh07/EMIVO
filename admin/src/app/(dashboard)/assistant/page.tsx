"use client";

/**
 * ELEKTRIX Admin Assistant — Executive Operations AI Agent.
 * Real-time operational intelligence, multi-tool analytics, automated cart recovery nudges.
 * Conversations persist in localStorage with 30-day retention; tool calls audited.
 */
import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, ShieldCheck, Trash2, User, Loader2, Wrench, CheckCircle2 } from "lucide-react";
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

// Inline Markdown & Table parser for clean, executive-ready presentation
function FormattedContent({ content }: { content: string }) {
  if (!content) return null;

  // Split by double line breaks into paragraphs / tables / lists
  const blocks = content.split(/\n\s*\n/);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-neutral-900">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();

        // 1. Markdown Table detection
        if (trimmed.includes("|") && trimmed.split("\n").some((l) => l.trim().startsWith("|"))) {
          const lines = trimmed
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.startsWith("|") && l.endsWith("|"));

          if (lines.length >= 2) {
            const headerRow = lines[0]
              .slice(1, -1)
              .split("|")
              .map((c) => c.trim());

            // Check if line 1 is separator (e.g. |---|---|)
            const hasSeparator = lines[1].includes("---");
            const dataLines = hasSeparator ? lines.slice(2) : lines.slice(1);

            return (
              <div key={idx} className="my-2.5 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-neutral-100/90 text-neutral-800 font-semibold border-b border-neutral-200">
                    <tr>
                      {headerRow.map((h, hi) => (
                        <th key={hi} className="px-3.5 py-2.5 whitespace-nowrap">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {dataLines.map((rowLine, ri) => {
                      const cells = rowLine
                        .slice(1, -1)
                        .split("|")
                        .map((c) => c.trim());
                      return (
                        <tr key={ri} className="hover:bg-neutral-50/80 transition-colors">
                          {cells.map((c, ci) => (
                            <td key={ci} className="px-3.5 py-2 text-neutral-700 whitespace-nowrap">
                              {renderInline(c)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // 2. Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-base font-bold text-neutral-900 pt-1 pb-0.5 border-b border-neutral-100">
              {renderInline(trimmed.replace(/^###\s+/, ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-lg font-bold text-neutral-900 pt-1 pb-0.5 border-b border-neutral-200">
              {renderInline(trimmed.replace(/^##\s+/, ""))}
            </h2>
          );
        }

        // 3. Bullet list
        if (trimmed.split("\n").every((l) => /^[•\*\-\d+\.]\s+/.test(l.trim()))) {
          const items = trimmed.split("\n").map((l) => l.trim().replace(/^[•\*\-\d+\.]\s+/, ""));
          return (
            <ul key={idx} className="my-1.5 space-y-1.5 pl-4 list-disc text-neutral-800">
              {items.map((it, ii) => (
                <li key={ii} className="leading-snug">
                  {renderInline(it)}
                </li>
              ))}
            </ul>
          );
        }

        // 4. Standard Paragraph
        return (
          <p key={idx} className="whitespace-pre-line leading-relaxed">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Inline renderer: bold **text**, rupee ₹ highlight, and code `tags`
function renderInline(text: string): React.ReactNode {
  if (!text) return "";

  // Split by bold (**...**) and inline code (`...`)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-neutral-950">
          {boldText}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      const codeText = part.slice(1, -1);
      return (
        <code key={i} className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px] text-neutral-800">
          {codeText}
        </code>
      );
    }
    // Highlight Rupee figures
    return part;
  });
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

  const send = async (customQ?: string) => {
    const q = (customQ || input).trim();
    if (!q || busy || !user) return;
    if (!customQ) setInput("");

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
    "Show customers who ordered most in the last 30 days",
    "Which customers have abandoned carts?",
    "Send reminders to customers with abandoned carts",
    "Which products need restocking right now?",
    "Give me sales performance & top products",
    "Marketplace sellers overview",
  ];

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[480px] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-neutral-900">
            <Sparkles className="h-6 w-6 text-amber-500" />
            ELEKTRIX Operations AI Agent
          </h1>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Operations Intelligence · Real-time Analytics · Automated Actions · Audited
          </p>
        </div>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear History
        </button>
      </div>

      {/* Thread */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <Bot className="h-7 w-7" />
            </div>
            <div className="max-w-md space-y-1">
              <p className="text-base font-semibold text-neutral-900">How can I assist you with ELEKTRIX today?</p>
              <p className="text-xs text-neutral-500">
                I can provide deep operational analytics, rank top customers, detect low stock, review marketplace sellers, and trigger recovery reminders for abandoned carts.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 transition-colors cursor-pointer"
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
            <div className={`max-w-[90%] sm:max-w-[80%] ${m.role === "user" ? "text-right" : ""}`}>
              <div
                className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-relaxed ${
                  m.error
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : m.role === "user"
                      ? "bg-neutral-950 text-white"
                      : "border border-neutral-200 bg-neutral-50/70 text-neutral-900 shadow-xs"
                }`}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                ) : (
                  <FormattedContent content={m.text} />
                )}
              </div>
              {!m.error && m.tools?.length ? (
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400">
                  <Wrench className="h-3 w-3 text-neutral-500" />
                  Verified with:
                  {m.tools.map((t) => (
                    <span key={t} className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 font-mono text-[10px] text-neutral-600 shadow-2xs">
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
          <div className="flex items-center gap-2 text-xs text-neutral-500 pl-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> Analyzing store telemetry & executing tools…
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
          placeholder="Ask anything: top customers, abandoned carts, stock refill, sales numbers…"
          className="flex-1 resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={() => send()}
          disabled={busy || !input.trim()}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

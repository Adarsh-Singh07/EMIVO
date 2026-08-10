"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Sparkles, Send, ArrowRight } from "lucide-react";
import { CATEGORIES, BRANDS } from "@/lib/products";

type Msg = {
  id: number;
  role: "user" | "assistant";
  text: string;
  href?: string;
  hrefLabel?: string;
};

const SUGGESTIONS = [
  "Best earbuds under ₹10,000",
  "Show me iPhones",
  "No cost EMI on laptops",
  "Waterproof Bluetooth speakers",
];

const WELCOME: Msg = {
  id: 0,
  role: "assistant",
  text: "Hi! I'm Emi, ELEKTRIX's AI shopping assistant. Ask me about products, EMI options or delivery — or tap a suggestion below to get started.",
};

export default function AiPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const buildReply = (raw: string): Msg => {
    const q = raw.trim().toLowerCase();

    if (/emi|no cost|monthly/.test(q)) {
      return {
        id: idRef.current++,
        role: "assistant",
        text: "Great news — every product at ELEKTRIX is available on No Cost EMI across 3, 6 or 12 months. You'll see the exact monthly instalments on each product page. Want me to shortlist something specific?",
        href: "/shop",
        hrefLabel: "Browse all products",
      };
    }

    const brand = BRANDS.find((b) => q.includes(b.toLowerCase()));
    if (brand) {
      return {
        id: idRef.current++,
        role: "assistant",
        text: `We stock ${brand} — from the latest flagships to everyday essentials. Here are the best ${brand} picks, all EMI-ready:`,
        href: `/shop?q=${encodeURIComponent(brand)}`,
        hrefLabel: `Shop ${brand}`,
      };
    }

    const cat = CATEGORIES.find(
      (c) =>
        q.includes(c.slug) || c.name.toLowerCase().split(" ").some((w) => q.includes(w))
    );
    if (cat) {
      return {
        id: idRef.current++,
        role: "assistant",
        text: `Here are the top ${cat.name.toLowerCase()} at ELEKTRIX — hand-picked and available on No Cost EMI:`,
        href: `/shop?category=${cat.slug}`,
        hrefLabel: `Shop ${cat.name}`,
      };
    }

    return {
      id: idRef.current++,
      role: "assistant",
      text: `Here's what I found for "${raw.trim()}" — tap below to see the matching products:`,
      href: `/shop?q=${encodeURIComponent(raw.trim())}`,
      hrefLabel: "See results",
    };
  };

  const ask = (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { id: idRef.current++, role: "user", text }]);
    setInput("");
    setLoading(true);
    // Brief pause so the reply feels like a real assistant is typing.
    window.setTimeout(() => {
      setMessages((m) => [...m, buildReply(text)]);
      setLoading(false);
    }, 600);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-44 lg:pb-24">
      {/* Header */}
      <div className="mb-7 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500 text-white shadow-lg shadow-fuchsia-500/30">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Ask Emi</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Your AI shopping assistant — ask about products, EMI &amp; delivery.
        </p>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {messages.map((m) =>
          m.role === "assistant" ? (
            <div key={m.id} className="flex items-end gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500 text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 text-sm leading-relaxed text-neutral-800">
                <p>{m.text}</p>
                {m.href && (
                  <Link
                    href={m.href}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                  >
                    {m.hrefLabel ?? "Open"} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-neutral-950 px-4 py-3 text-sm leading-relaxed text-white">
                {m.text}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex items-end gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:240ms]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 lg:bottom-8">
        <form onSubmit={onSubmit} className="mx-auto max-w-2xl bg-gradient-to-t from-white via-white to-transparent px-4 py-3">
          <div className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white p-1.5 pl-4 shadow-sm focus-within:border-neutral-950">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a product, EMI, delivery…"
              aria-label="Ask Emi"
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim() || loading}
              className="grid h-10 w-10 place-items-center rounded-full bg-neutral-950 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

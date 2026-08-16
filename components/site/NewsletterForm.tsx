"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { storeApi } from "@/lib/store-api";

/**
 * Real newsletter subscription — POST /newsletter/subscribe.
 * Honest messaging only: the API decides whether it succeeded.
 */
export default function NewsletterForm({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const dark = variant === "dark";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const result = await storeApi.subscribeToNewsletter(trimmed);
      // The API is idempotent and returns an honest message either way.
      toast.success(result?.message || "Subscribed successfully");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not subscribe right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-8 flex max-w-md mx-auto" onSubmit={submit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        disabled={loading}
        aria-label="Email address"
        className={
          dark
            ? "h-12 flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-l-full px-5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
            : "h-12 flex-1 min-w-0 bg-white border border-neutral-300 rounded-l-full px-5 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-600"
        }
      />
      <button
        type="submit"
        disabled={loading}
        className={
          dark
            ? "h-12 px-6 bg-white text-neutral-950 rounded-r-full text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
            : "h-12 px-6 bg-neutral-950 text-white rounded-r-full text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
        }
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Subscribe
      </button>
    </form>
  );
}

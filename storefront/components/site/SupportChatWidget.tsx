"use client";

/**
 * Floating AI Shopping Assistant & Support (Gemini-powered).
 * Operates in dual mode:
 * 1. Guest mode: product advice, comparisons with clickable links,
 *    shipping from Bihar (841508), offers (WELCOME10), guest support ticket filing,
 *    and strict privacy protection (no private user data revealed without login/OTP).
 * 2. Authenticated mode: Real-time order tracking, cancellation/return assistance,
 *    support tickets, and tailored product recommendations.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Loader2,
  MessageCircle,
  Send,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Truck,
  Tag,
  KeyRound,
} from "lucide-react";
import { storeApi } from "@/lib/store-api";
import { useAuth } from "@/lib/auth-context";

type Msg = {
  from: "you" | "bot";
  text: string;
  ticket?: { id: string; subject: string };
  isOtpPrompt?: boolean;
};

const GUEST_SUGGESTIONS = [
  { label: "📱 Best deals on Mobiles", prompt: "What mobile phones do you have and what are the current offers?" },
  { label: "🚚 Shipping & Delivery", prompt: "Where do you ship from and what is the delivery timeline?" },
  { label: "🎟️ Active Offers", prompt: "What discount offers or coupons are currently available?" },
  { label: "📝 File a Complaint", prompt: "I want to file a complaint / support request" },
];

const USER_SUGGESTIONS = [
  { label: "📦 Track My Order", prompt: "What is the status of my latest order?" },
  { label: "🎧 Recommend Audio", prompt: "Which headphones or earbuds would you recommend from your catalog?" },
  { label: "🎟️ Active Offers", prompt: "What discount offers can I use today?" },
  { label: "📝 Raise Support Ticket", prompt: "I need help with an order issue" },
];

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"idle" | "sent" | "verified">("idle");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const { user, requestOtp, verifyOtp, refreshUser } = useAuth();

  // Initialize or update welcome greeting when drawer opens
  useEffect(() => {
    if (msgs.length === 0) {
      if (user) {
        setMsgs([
          {
            from: "bot",
            text: `Hi ${user.first_name || "there"}! 👋 I'm your ELEKTRIX assistant. I can help track your orders, check deliveries, compare products, or raise support tickets. What's on your mind?`,
          },
        ]);
      } else {
        setMsgs([
          {
            from: "bot",
            text: "Hi! 👋 Welcome to ELEKTRIX — India's premium electronics store. Ask me about our mobiles, laptops, audio, appliances and wearables, delivery timelines from our Bihar warehouse (PIN 841508), or current offers like WELCOME10. How can I help you today?",
          },
        ]);
      }
    }
  }, [user, msgs.length]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [msgs, open, busy]);

  /** Render bot text with markdown links [label](url) and raw https://elektrix.in URLs */
  const renderText = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/elektrix\.in[^\s)]*)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }
      if (match[1] && match[2]) {
        // [label](url)
        const label = match[1];
        const url = match[2];
        const isInternal = url.startsWith("https://elektrix.in") || url.startsWith("/");
        const href = isInternal ? url.replace(/^https:\/\/elektrix\.in/, "") || "/" : url;
        elements.push(
          <Link
            key={match.index}
            href={href}
            className="underline underline-offset-2 font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5"
            target={isInternal ? "_self" : "_blank"}
            onClick={() => isInternal && setOpen(false)}
          >
            {label}
          </Link>
        );
      } else if (match[3]) {
        // raw url
        const rawUrl = match[3];
        const href = rawUrl.replace(/^https:\/\/elektrix\.in/, "") || "/";
        const label =
          rawUrl.replace(/^https:\/\/elektrix\.in\/product\//, "").replace(/-/g, " ") || rawUrl;
        elements.push(
          <Link
            key={match.index}
            href={href}
            className="underline underline-offset-2 font-semibold text-emerald-600 hover:text-emerald-700"
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        );
      }
      lastIndex = linkRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }
    return elements.length > 0 ? elements : text;
  };

  const handleSendText = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { from: "you", text }]);
    setBusy(true);

    try {
      const res = await storeApi.chat(text, {
        user_name: user?.first_name || "",
        history: msgs.slice(-6).map((m) => ({
          role: m.from === "you" ? "user" : "assistant",
          text: m.text,
        })),
      });

      setMsgs((m) => [
        ...m,
        {
          from: "bot",
          text: res.reply,
          ticket: res.ticket ?? undefined,
        },
      ]);
    } catch (err: any) {
      setMsgs((m) => [
        ...m,
        {
          from: "bot",
          text:
            err?.message ||
            "I am currently experiencing a momentary delay. You can also contact our support team at contact@elektrix.in.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = () => {
    handleSendText(input);
  };

  const handleSendOtp = async () => {
    const id = otpIdentifier.trim();
    const isEmail = id.includes("@");
    const cleanPhone = id.replace(/\D/g, "");
    if (isEmail ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id) : cleanPhone.length !== 10) {
      setOtpError("Enter your registered email address or 10-digit mobile number");
      return;
    }
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await requestOtp(isEmail ? { email: id.toLowerCase() } : { phone: cleanPhone });
      setOtpStep("sent");
      const via = res.channel === "sms" ? `+91-${cleanPhone}` : id;
      setMsgs((m) => [
        ...m,
        {
          from: "bot",
          text: `🔐 A verification code has been sent to ${via}. Enter the 6-digit code below to verify your identity — then I can help with your orders and account.`,
        },
      ]);
    } catch (err: any) {
      setOtpError(err?.message || "Failed to send OTP. Try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const id = otpIdentifier.trim();
    const isEmail = id.includes("@");
    const cleanPhone = id.replace(/\D/g, "");
    const cleanCode = otpCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setOtpError("Enter the 6-digit OTP code");
      return;
    }
    setOtpError("");
    setOtpLoading(true);
    try {
      await verifyOtp(isEmail ? { email: id.toLowerCase() } : { phone: cleanPhone }, cleanCode);
      await refreshUser();
      setOtpStep("verified");
      setShowOtpBox(false);
      setMsgs((m) => [
        ...m,
        {
          from: "bot",
          text: "✅ Verified successfully! I can now help you with your orders, payments and account details. What would you like to know?",
        },
      ]);
    } catch (err: any) {
      setOtpError(err?.message || "Invalid or expired OTP code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const suggestions = user ? USER_SUGGESTIONS : GUEST_SUGGESTIONS;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full bg-emerald-600 text-white grid place-items-center shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-32 right-3 sm:bottom-24 sm:right-6 z-50 w-[92vw] max-w-[390px] h-[64vh] max-h-[580px] rounded-3xl border border-neutral-200 bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 px-4 bg-neutral-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight flex items-center gap-1.5">
                  ELEKTRIX AI Advisor
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </p>
                <p className="text-[10px] text-neutral-400">
                  {user ? `Logged in as ${user.first_name}` : "Shopping & Guest Support"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/support"
                onClick={() => setOpen(false)}
                className="text-xs text-neutral-300 hover:text-white underline underline-offset-2 flex items-center gap-1"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                Help
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    m.from === "you"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-white border border-neutral-200/80 text-neutral-900 rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.from === "bot" ? renderText(m.text) : m.text}</p>
                  {m.ticket && (
                    <div className="mt-2.5 pt-2 border-t border-neutral-200">
                      {m.ticket.id.startsWith("TK-") ? (
                        <div className="text-xs text-neutral-600">
                          <span className="font-semibold text-emerald-700">Ticket #{m.ticket.id}</span>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Our team has been notified at contact@elektrix.in and will reach out shortly.
                          </p>
                        </div>
                      ) : (
                        <Link
                          href="/support"
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                        >
                          View ticket #{m.ticket.id.slice(0, 8)} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-neutral-400 text-xs py-1">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>ELEKTRIX is typing…</span>
              </div>
            )}

            {/* Quick Suggestion Chips (Visible when chat history is brief) */}
            {msgs.length <= 3 && !busy && (
              <div className="pt-2">
                <p className="text-[11px] font-medium text-neutral-400 mb-2">Suggested questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendText(s.prompt)}
                      className="text-xs bg-white hover:bg-emerald-50 border border-neutral-200 hover:border-emerald-300 text-neutral-700 hover:text-emerald-800 px-2.5 py-1.5 rounded-full transition-colors text-left"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inline OTP Verification Modal/Bar if guest wants to verify */}
          {showOtpBox && !user && (
            <div className="p-3 bg-emerald-50 border-t border-emerald-200 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-emerald-900 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" /> Verify your identity
                </span>
                <button
                  onClick={() => setShowOtpBox(false)}
                  className="text-neutral-400 hover:text-neutral-700 text-xs"
                >
                  ✕
                </button>
              </div>
              {otpStep === "idle" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="Registered email or mobile"
                    value={otpIdentifier}
                    onChange={(e) => setOtpIdentifier(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs bg-white"
                  />
                  <button
                    onClick={handleSendOtp}
                    disabled={otpLoading || otpIdentifier.trim().length < 5}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {otpLoading ? "Sending…" : "Send OTP"}
                  </button>
                </div>
              )}
              {otpStep === "sent" && (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs bg-white text-center font-mono tracking-widest"
                    />
                    <button
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || otpCode.length !== 6}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      {otpLoading ? "Verifying…" : "Verify"}
                    </button>
                  </div>
                  <button
                    onClick={handleSendOtp}
                    className="text-[10px] text-emerald-800 underline"
                  >
                    Resend code
                  </button>
                </div>
              )}
              {otpError && <p className="text-[11px] text-red-600 mt-1">{otpError}</p>}
            </div>
          )}

          {/* Input Controls */}
          <div className="p-3 border-t border-neutral-200/80 bg-white space-y-2">
            {!user && !showOtpBox && (
              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                <span>Checking an existing order?</span>
                <button
                  onClick={() => setShowOtpBox(true)}
                  className="text-emerald-700 hover:underline font-medium"
                >
                  Verify account →
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  user
                    ? "Ask about orders, products, or support…"
                    : "Ask about products, offers, shipping…"
                }
                className="flex-1 h-10 px-3.5 rounded-full border border-neutral-300 text-xs sm:text-sm outline-none focus:border-emerald-600 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={busy || !input.trim()}
                className="h-10 w-10 grid place-items-center rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white disabled:opacity-40 shrink-0 transition-all shadow-sm"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

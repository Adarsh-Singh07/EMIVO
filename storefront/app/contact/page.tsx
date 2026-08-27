"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

const SUPPORT_EMAIL = "support@elektrix.in";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", mobile: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const update =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.mobile || !form.message) {
      toast.error("Please fill in your name, email, mobile number, and message.");
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.post("/store/contact", form);
      toast.success("Message sent successfully! We've sent a confirmation to your email.");
      setForm({ name: "", email: "", mobile: "", subject: "", message: "" });
    } catch (err) {
      toast.error("Failed to send message. Please try again or call us.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "h-12 w-full border border-neutral-200 rounded-xl px-4 text-sm focus:outline-none focus:border-neutral-950";

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Get in touch</p>
      <h1 className="text-4xl font-semibold tracking-tight mb-10">We reply within a day.</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
        <div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" htmlFor="c-name">Name</label>
                <input id="c-name" value={form.name} onChange={update("name")} placeholder="Your name" className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" htmlFor="c-email">Email</label>
                <input id="c-email" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" htmlFor="c-mobile">Mobile Number</label>
              <input id="c-mobile" type="tel" value={form.mobile} onChange={update("mobile")} placeholder="+91 9876543210" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" htmlFor="c-subject">Subject</label>
              <input id="c-subject" value={form.subject} onChange={update("subject")} placeholder="Order, returns, product support…" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" htmlFor="c-message">Message</label>
              <textarea
                id="c-message"
                value={form.message}
                onChange={update("message")}
                placeholder="How can we help?"
                rows={6}
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-950 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        <aside className="space-y-4">
          {[
            { icon: Phone, label: "Call us", value: "+91 80920 24066", note: "Mon–Sat, 9am–9pm IST" },
            { icon: Mail, label: "Email", value: SUPPORT_EMAIL, note: "Replies within 24 hours" },
            { icon: MapPin, label: "Store Address", value: "APANA ENTERPRISES", note: "DS1, 109, Near Indian Petrol Pump, Vijayipur, Gopalganj, Bihar - 841508" },
            { icon: Clock, label: "Support hours", value: "9:00 – 21:00 IST", note: "7 days a week" },
          ].map((c) => (
            <div key={c.label} className="flex gap-4 rounded-2xl border border-neutral-100 bg-white p-5">
              <div className="w-10 h-10 rounded-full bg-neutral-950 text-white grid place-items-center shrink-0">
                <c.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">{c.label}</p>
                <p className="font-medium">{c.value}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{c.note}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

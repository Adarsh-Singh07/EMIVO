"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";

const SUPPORT_EMAIL = "support@elektrix.in";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const update =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  /**
   * There is no contact-form backend endpoint, so we hand the message to the
   * visitor's own email client via mailto: — no fake "message sent" states.
   */
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in your name, email and message first");
      return;
    }
    const subject = encodeURIComponent(form.subject || `Support request from ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    toast.info("Opening your email app to send this message to our support team");
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
              className="inline-flex items-center gap-2 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
            >
              <Send className="w-4 h-4" /> Compose Email
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4 text-xs text-neutral-500 leading-relaxed">
            <p className="font-semibold text-neutral-700 mb-1">How this form works</p>
            This page does not have a message queue — pressing “Compose Email” opens your own email
            app with the details above, addressed to{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2 text-neutral-800">
              {SUPPORT_EMAIL}
            </a>
            . You press send, so nothing is lost silently.
          </div>
        </div>

        <aside className="space-y-4">
          {[
            { icon: Phone, label: "Call us", value: "+91 85398 38942", note: "Mon–Sat, 9am–9pm IST" },
            { icon: Mail, label: "Email", value: SUPPORT_EMAIL, note: "Replies within 24 hours" },
            { icon: MapPin, label: "Store Address", value: "DS1, 109, Near Indian Petrol Pump, Vijayipur, Gopalganj, Bihar - 841508", note: "Apna Enterprise" },
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

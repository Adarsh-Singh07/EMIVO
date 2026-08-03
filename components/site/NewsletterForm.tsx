"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success("Subscribed! Your 10% off code is on its way.");
    setEmail("");
  };

  return (
    <form className="mt-8 flex max-w-md mx-auto" onSubmit={submit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="h-12 flex-1 bg-neutral-900 border border-neutral-800 rounded-l-full px-5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
      />
      <button className="h-12 px-6 bg-white text-neutral-950 rounded-r-full text-sm font-medium">
        Subscribe
      </button>
    </form>
  );
}

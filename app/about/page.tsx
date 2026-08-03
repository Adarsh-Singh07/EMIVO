import Link from "next/link";
import { Truck, BadgePercent, ShieldCheck, RotateCcw } from "lucide-react";

const VALUES = [
  { icon: Truck, title: "Fast Delivery", desc: "Same-day dispatch and 1–3 day delivery across India." },
  { icon: BadgePercent, title: "Honest Pricing", desc: "Genuine deals on premium electronics, every day." },
  { icon: ShieldCheck, title: "100% Genuine", desc: "Every product sourced from authorised distributors." },
  { icon: RotateCcw, title: "Easy Returns", desc: "10-day no-questions-asked return policy." },
];

export default function AboutPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">About EMIVO</p>
      <h1 className="text-4xl font-semibold tracking-tight mb-6">Premium electronics, without the premium markup.</h1>
      <div className="prose max-w-none text-neutral-600 space-y-4">
        <p>
          EMIVO is an electronics store for people who care about what they carry, wear and plug in. We curate
          mobiles, laptops, appliances, audio and wearables from the brands you trust — Apple, Samsung, Sony, JBL,
          Bose and more — and price them honestly.
        </p>
        <p>
          Founded in Mumbai, we started with a simple idea: buying great technology should feel as good as using it.
          No confusing price games, no pushy upsells. Just a tight catalog of products we would buy ourselves, backed
          by real warranties and support that actually picks up the phone.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-2xl border border-neutral-100 bg-white p-6">
            <div className="w-11 h-11 rounded-full bg-neutral-950 text-white grid place-items-center mb-4">
              <v.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">{v.title}</h3>
            <p className="text-sm text-neutral-500 mt-1.5">{v.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-neutral-950 text-white p-10 mt-12 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Experience the difference</h2>
        <p className="text-neutral-400 mt-2 mb-6">Browse our curated catalog.</p>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center h-12 px-8 bg-white text-neutral-950 rounded-full text-sm font-medium hover:bg-neutral-200"
        >
          Shop Electronics
        </Link>
      </div>
    </div>
  );
}

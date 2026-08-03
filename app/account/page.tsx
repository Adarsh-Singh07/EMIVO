import Link from "next/link";
import { Package, Heart, MapPin, CreditCard, LogIn } from "lucide-react";

const SECTIONS = [
  { icon: Package, title: "Orders", desc: "Track, return or re-order", href: "/order-tracking" },
  { icon: Heart, title: "Wishlist", desc: "Items you saved", href: "/shop" },
  { icon: MapPin, title: "Addresses", desc: "Saved delivery addresses", href: "/checkout" },
  { icon: CreditCard, title: "Payments", desc: "Saved cards & UPI IDs", href: "/checkout" },
];

export default function AccountPage() {
  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">My account</p>
      <h1 className="text-4xl font-semibold tracking-tight mb-8">Welcome to EMIVO</h1>

      <div className="border border-neutral-200 rounded-3xl p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Sign in for a personalised experience</p>
          <p className="text-sm text-neutral-500 mt-1">Faster checkout, order tracking and exclusive offers.</p>
        </div>
        <button className="inline-flex items-center gap-2 h-12 px-6 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800">
          <LogIn className="w-4 h-4" /> Sign in
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-6 hover:border-neutral-950 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-neutral-950 text-white grid place-items-center shrink-0">
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-neutral-500">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

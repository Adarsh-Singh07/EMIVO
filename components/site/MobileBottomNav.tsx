"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Package, User, Sparkles } from "lucide-react";

/**
 * Mobile-only bottom navigation bar (app-style).
 *
 * Shown below the `lg` breakpoint to mirror a native app tab bar:
 * Home · Categories · [Ask AI] · Orders · Profile.
 *
 * The centre slot is a raised gradient "Ask AI" orb that draws the eye —
 * fixed to the bottom of the viewport. Padding for the iOS home indicator
 * is applied via `env(safe-area-inset-bottom)` (requires `viewport-fit=cover`,
 * set in app/layout.tsx).
 */

const LEFT_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Categories", icon: LayoutGrid },
] as const;

const RIGHT_ITEMS = [
  { href: "/order-tracking", label: "Orders", icon: Package },
  { href: "/account", label: "Profile", icon: User },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const renderItem = (item: (typeof LEFT_ITEMS)[number]) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.label}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
          active ? "text-neutral-950" : "text-neutral-500 hover:text-neutral-950"
        }`}
      >
        <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const aiActive = isActive("/ai");

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden w-full max-w-full overflow-x-clip border-t border-neutral-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid w-full grid-cols-5 min-w-0">
        {LEFT_ITEMS.map(renderItem)}

        {/* Ask AI — raised gradient centre button */}
        <Link
          href="/ai"
          aria-current={aiActive ? "page" : undefined}
          className="relative flex flex-col items-center justify-end gap-1 pb-2.5 text-[10px] font-semibold text-neutral-950"
        >
          <span
            className={`relative -mt-5 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500 text-white shadow-lg shadow-fuchsia-500/40 ring-4 ring-white transition-transform ${
              aiActive ? "scale-105" : "active:scale-95"
            }`}
          >
            <Sparkles className="h-6 w-6" strokeWidth={2.2} />
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-fuchsia-500" />
            </span>
          </span>
          <span>Ask AI</span>
        </Link>

        {RIGHT_ITEMS.map(renderItem)}
      </div>
    </nav>
  );
}

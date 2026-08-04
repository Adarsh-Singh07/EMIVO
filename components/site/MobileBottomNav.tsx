"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, Package, User } from "lucide-react";

/**
 * Mobile-only bottom navigation bar (app-style).
 *
 * Shown below the `lg` breakpoint to mirror a native app tab bar:
 * Home · Categories · Wishlist · Orders · Profile.
 *
 * Fixed to the bottom of the viewport. Padding for the iOS home indicator
 * is applied via `env(safe-area-inset-bottom)` (requires `viewport-fit=cover`,
 * set in app/layout.tsx).
 */

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Categories", icon: LayoutGrid },
  { href: "/account", label: "Wishlist", icon: Heart },
  { href: "/order-tracking", label: "Orders", icon: Package },
  { href: "/account", label: "Profile", icon: User },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden w-full max-w-full overflow-x-clip border-t border-neutral-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid w-full grid-cols-5 min-w-0">
        {ITEMS.map((item) => {
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
        })}
      </div>
    </nav>
  );
}

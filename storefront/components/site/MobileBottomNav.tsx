"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, Package, User, ShoppingBag, Search } from "lucide-react";
import { useCart } from "./CartProvider";

const LEFT_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: LayoutGrid },
] as const;

const RIGHT_ITEMS = [
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account", label: "Profile", icon: User },
] as const;

type NavItem = { href: string; label: string; icon: typeof Home };

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { count, setDrawerOpen } = useCart();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const renderItem = (item: NavItem) => {
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

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden w-full max-w-full overflow-x-clip border-t border-neutral-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid w-full grid-cols-5 min-w-0">
        {LEFT_ITEMS.map(renderItem)}

        {/* Cart orb */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative flex flex-col items-center justify-end gap-1 pb-2.5 text-[10px] font-semibold text-neutral-950"
        >
          <span className="relative -mt-4 grid h-[46px] w-[46px] place-items-center rounded-xl bg-neutral-950 text-white shadow-lg ring-2 ring-white transition-transform active:scale-95">
            <ShoppingBag className="h-5 w-5" strokeWidth={2.2} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-white">
                {count}
              </span>
            )}
          </span>
          <span>Cart</span>
        </button>

        {RIGHT_ITEMS.map(renderItem)}
      </div>
    </nav>
  );
}

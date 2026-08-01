"use client";

/**
 * Fynode-style header for the EMIVO homepage clone.
 *
 * Layout (top → bottom):
 *  1. Dark announcement bar — rotating message + language/currency switchers.
 *  2. Main header — logo, search bar with category selector, wishlist / account / cart.
 *  3. Category navigation — primary categories + highlighted "Deals" link.
 *
 * Copy comes from `lib/fynode.ts`; colors from the Fynode tokens in globals.css.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Search,
  Heart,
  User,
  ShoppingCart,
  ChevronDown,
  Globe,
  Phone,
  MapPin,
  Menu,
  X,
} from "lucide-react";
import {
  ANNOUNCEMENT_MESSAGES,
  CURRENCIES,
  LANGUAGES,
  NAV_MENU,
} from "@/lib/fynode";

/* -------------------------------------------------------------------------- */
/* Announcement bar                                                           */
/* -------------------------------------------------------------------------- */

function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Pause the auto-rotating message for users who prefer reduced motion —
    // static content instead of auto-updating text (WCAG 2.2.2).
    if (reduceMotion) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % ANNOUNCEMENT_MESSAGES.length);
    }, 4000);
    return () => clearInterval(t);
  }, [reduceMotion]);

  return (
    <div className="bg-[var(--color-announcement-bg)] text-white text-[13px]">
      <div className="container-fynode flex h-10 items-center justify-between gap-4">
        {/* Left: rotating message */}
        <div className="hidden flex-1 items-center gap-2 md:flex">
          <MapPin className="h-3.5 w-3.5 text-white/70" aria-hidden />
          <div className="relative h-5 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={index}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute inset-0 flex items-center text-white/90"
              >
                {ANNOUNCEMENT_MESSAGES[index]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: phone */}
        <div className="flex items-center gap-2 text-white/80 md:hidden">
          <Phone className="h-3.5 w-3.5" aria-hidden />
          <span>+1 (800) 123-4567</span>
        </div>

        {/* Right: switchers */}
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <Switcher
            icon={<Globe className="h-3.5 w-3.5" aria-hidden />}
            label={language}
            options={LANGUAGES}
            onChange={setLanguage}
          />
          <span className="hidden h-3 w-px bg-white/20 sm:inline-block" />
          <Switcher label={currency} options={CURRENCIES} onChange={setCurrency} />
        </div>
      </div>
    </div>
  );
}

function Switcher({
  label,
  options,
  onChange,
  icon,
}: {
  label: string;
  options: string[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${label}-menu`}
        className="flex items-center gap-1 px-2 py-1 text-white/80 transition-colors hover:text-white"
      >
        {icon}
        <span className="text-[12px] tracking-wide">{label}</span>
        <ChevronDown className="h-3 w-3" aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            id={`${label}-menu`}
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-1 min-w-[120px] rounded-md border border-white/10 bg-[#18181b] py-1 text-[12px] text-white shadow-xl"
          >
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt === label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-white/80 hover:bg-white/10 hover:text-white"
                >
                  {opt}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main header                                                                */
/* -------------------------------------------------------------------------- */

const SEARCH_CATEGORIES = [
  "All Categories",
  "Earphones",
  "Headphones",
  "Microphones",
  "Smartwatches",
  "Speakers",
];

function MainHeader() {
  const [category, setCategory] = useState("All Categories");

  return (
    <div className="border-b border-[var(--color-border)] bg-white">
      <div className="container-fynode flex h-20 items-center gap-6">
        {/* Logo */}
        <a
          href="/"
          className="flex shrink-0 items-center gap-2 text-[22px] font-bold tracking-tight text-[var(--color-foreground)]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-foreground)] text-[15px] font-extrabold text-white">
            E
          </span>
          <span className="uppercase">EMIVO</span>
        </a>

        {/* Search */}
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="hidden flex-1 items-stretch overflow-hidden rounded-md border border-[var(--color-border)] bg-white md:flex"
        >
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-full appearance-none bg-[var(--color-surface)] pl-4 pr-9 text-[13px] font-medium text-[var(--color-foreground)] outline-none"
            >
              {SEARCH_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-secondary)]"
              aria-hidden
            />
          </div>
          <input
            type="search"
            placeholder="Search for products..."
            className="h-11 flex-1 px-4 text-[14px] text-[var(--color-foreground)] placeholder:text-[var(--color-secondary)] outline-none"
          />
          <button
            type="submit"
            aria-label="Search"
            className="grid h-11 w-12 place-items-center bg-[var(--color-foreground)] text-white transition-colors hover:bg-black"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
        </form>

        {/* Icon actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <IconAction
            icon={<Heart className="h-5 w-5" aria-hidden />}
            label="Wishlist"
          />
          <IconAction
            icon={<User className="h-5 w-5" aria-hidden />}
            label="Account"
            href="/account"
          />
          <IconAction
            icon={<ShoppingCart className="h-5 w-5" aria-hidden />}
            label="Cart"
            count={2}
            href="/cart"
          />
        </div>
      </div>
    </div>
  );
}

function IconAction({
  icon,
  label,
  count,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  href?: string;
}) {
  const content = (
    <div className="relative flex flex-col items-center gap-0.5 px-2 py-1 text-[var(--color-foreground)] transition-colors hover:text-[var(--color-fynode-accent)]">
      <div className="relative">
        {icon}
        {typeof count === "number" && count > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-foreground)] px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </div>
      <span className="hidden text-[11px] font-medium sm:inline">{label}</span>
    </div>
  );

  return href ? (
    <a href={href} aria-label={label}>
      {content}
    </a>
  ) : (
    <button type="button" aria-label={label}>
      {content}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Category navigation                                                        */
/* -------------------------------------------------------------------------- */

function CategoryNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-[var(--color-border)] bg-white">
      <div className="container-fynode flex h-12 items-center gap-6">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-foreground)] md:hidden"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="h-4 w-4" aria-hidden />
          ) : (
            <Menu className="h-4 w-4" aria-hidden />
          )}
          Menu
        </button>

        <ul className="hidden flex-1 items-center gap-6 md:flex">
          {NAV_MENU.map((item) => (
            <li key={item.label} className="group relative">
              <a
                href={item.href}
                className={[
                  "flex items-center gap-1 text-[13px] font-medium uppercase tracking-wide transition-colors",
                  item.highlight
                    ? "text-[var(--color-fynode-accent)] hover:opacity-80"
                    : "text-[var(--color-foreground)] hover:text-[var(--color-fynode-accent)]",
                ].join(" ")}
              >
                {item.label}
                {item.children && <ChevronDown className="h-3 w-3" aria-hidden />}
              </a>

              {item.children && (
                <div
                  className="invisible absolute left-0 top-full z-40 min-w-[200px] translate-y-1 rounded-md border border-[var(--color-border)] bg-white py-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
                >
                  {item.children.map((child) => (
                    <a
                      key={child.label}
                      href={child.href}
                      className="block px-4 py-2 text-[13px] text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-4 text-[12px] text-[var(--color-secondary)] md:flex">
          <span>Need help? +1 (800) 123-4567</span>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[var(--color-border)] bg-white md:hidden"
          >
            {NAV_MENU.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="block px-6 py-3 text-[14px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-white">
      <AnnouncementBar />
      <MainHeader />
      <CategoryNav />
    </header>
  );
}

export default Nav;

"use client";

/**
 * Fynode-style footer for the EMIVO homepage clone.
 * Dark (#09090b) panel with feature tiles, link columns, and payment badges.
 * Copy comes from `lib/fynode.ts`.
 */

import {
  FOOTER_COLUMNS,
  FOOTER_FEATURES,
  PAYMENT_METHODS,
} from "@/lib/fynode";

export function Footer() {
  return (
    <footer className="mt-auto bg-[var(--color-footer-bg)] text-white">
      {/* Feature tiles */}
      <div className="border-b border-white/10">
        <div className="container-fynode grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER_FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-4 px-2 py-8">
              <img
                src={f.icon}
                alt=""
                className="h-11 w-11 shrink-0 object-contain"
                loading="lazy"
              />
              <div>
                <h3 className="text-[15px] font-semibold">{f.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-white/50">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Link columns + brand */}
      <div className="container-fynode grid grid-cols-1 gap-10 py-14 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <a
            href="/"
            className="flex items-center gap-2 text-[20px] font-bold uppercase tracking-tight"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-[13px] font-extrabold text-[var(--color-footer-bg)]">
              E
            </span>
            EMIVO
          </a>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/50">
            Premium audio, wearables and electronics — high performance and
            elegant design for modern living.
          </p>
          <div className="mt-6 space-y-2 text-[13px] text-white/60">
            <p>Mon – Sat: 9:00 – 21:00</p>
            <p>+1 (800) 123-4567</p>
            <p>support@emivo.com</p>
          </div>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-[14px] font-semibold uppercase tracking-wide">
              {col.title}
            </h4>
            <ul className="mt-5 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[13px] text-white/50 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-fynode flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="text-[12px] text-white/40">
            © {new Date().getFullYear()} EMIVO. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {PAYMENT_METHODS.map((src) => (
              <img
                key={src}
                src={src}
                alt="Payment method"
                className="h-6 w-auto rounded-sm object-contain"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

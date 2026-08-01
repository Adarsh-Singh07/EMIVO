/** Fynode brand marquee — seamless loop driven by the CSS `marquee-fynode` keyframes. */

import { BRAND_LOGOS } from "@/lib/fynode";

export function FynodeMarquee() {
  return (
    <section className="border-b border-[var(--color-border)] bg-white py-8">
      <div className="container-fynode">
        <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-secondary)]">
          Trusted by the world's leading brands
        </p>
        <div className="relative overflow-hidden">
          <div className="flex w-max animate-marquee-fynode items-center gap-14">
            {BRAND_LOGOS.map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={src}
                alt=""
                loading="lazy"
                className="h-9 w-auto shrink-0 object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

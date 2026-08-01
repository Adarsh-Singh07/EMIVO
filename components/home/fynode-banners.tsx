import { FEATURE_BANNERS } from "@/lib/fynode";

/** Fynode 3-tile feature banner row — image, gradient overlay, copy + CTA. */

export function FynodeBanners() {
  return (
    <section className="py-16">
      <div className="container-fynode grid gap-6 md:grid-cols-3">
        {FEATURE_BANNERS.map((b) => (
          <a
            key={b.title}
            href={b.cta.href}
            className="group relative block overflow-hidden rounded-lg"
          >
            <img
              src={b.image}
              alt={b.title}
              loading="lazy"
              className="h-[380px] w-full object-cover transition-transform duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
                {b.subtitle}
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">{b.title}</h3>
              <p className="mt-2 text-[13px] text-white/70">{b.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 border-b border-white/60 pb-0.5 text-[13px] font-semibold uppercase tracking-wide text-white">
                {b.cta.label} →
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

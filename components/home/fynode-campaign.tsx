import { CAMPAIGN_BANNER } from "@/lib/fynode";

/** Fynode full-width promo/campaign banner with left-aligned copy. */

export function FynodeCampaign() {
  const b = CAMPAIGN_BANNER;
  return (
    <section className="py-16">
      <div className="container-fynode">
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={b.image}
            alt={b.title}
            loading="lazy"
            className="h-[420px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15" />
          <div className="absolute inset-0 flex max-w-xl flex-col justify-center px-8 text-white md:px-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-fynode-accent)]">
              {b.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
              {b.title}
            </h2>
            <p className="mt-4 text-[15px] text-white/75">{b.description}</p>
            <a
              href={b.cta.href}
              className="mt-7 inline-flex h-12 w-fit items-center justify-center rounded-sm bg-white px-8 text-[14px] font-bold uppercase tracking-wide text-[var(--color-foreground)] transition-transform hover:scale-[1.03]"
            >
              {b.cta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

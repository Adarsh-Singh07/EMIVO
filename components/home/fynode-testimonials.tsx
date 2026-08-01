import { Quote, Star } from "lucide-react";
import { STATS, TESTIMONIALS } from "@/lib/fynode";
import { FynodeSectionHeading } from "./fynode-section-heading";

/** Fynode testimonials + stats section on a light surface background. */

export function FynodeTestimonials() {
  return (
    <section className="bg-[var(--color-surface)] py-16">
      <div className="container-fynode">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          {/* Stats / intro */}
          <div>
            <FynodeSectionHeading
              eyebrow="Testimonials"
              title="What Our Customers Say"
            />
            <div className="mt-8 grid grid-cols-2 gap-6">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg bg-white p-6 text-center shadow-sm"
                >
                  <div className="text-3xl font-bold text-[var(--color-foreground)]">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[13px] text-[var(--color-secondary)]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid gap-4 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.author}
                className="flex flex-col rounded-lg bg-white p-6 shadow-sm"
              >
                <Quote
                  className="h-6 w-6 text-[var(--color-fynode-accent)]"
                  aria-hidden
                />
                <blockquote className="mt-4 flex-1 text-[14px] leading-relaxed text-[var(--color-foreground)]">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold">{t.author}</div>
                    <div className="text-[12px] text-[var(--color-secondary)]">
                      {t.role}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { CATEGORIES } from "@/lib/fynode";
import { FynodeSectionHeading } from "./fynode-section-heading";

/** Fynode category tiles — circular thumbnail, name, product count. */

export function FynodeCategories() {
  return (
    <section className="py-16">
      <div className="container-fynode">
        <FynodeSectionHeading eyebrow="Shop by category" title="Browse Categories" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <a
              key={c.name}
              href={c.href}
              className="group flex flex-col items-center rounded-lg border border-[var(--color-border)] bg-white p-6 text-center transition-all hover:-translate-y-1 hover:shadow-[0_14px_30px_-10px_rgba(0,0,0,0.12)]"
            >
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-surface)] transition-colors group-hover:bg-[var(--color-fynode-accent)]/10">
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  className="h-12 w-12 object-contain"
                />
              </div>
              <h3 className="mt-4 text-[14px] font-semibold text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-fynode-accent)]">
                {c.name}
              </h3>
              <span className="mt-1 text-[12px] text-[var(--color-secondary)]">
                {c.count} products
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

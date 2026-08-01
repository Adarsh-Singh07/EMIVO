import { JOURNAL_POSTS } from "@/lib/fynode";
import { FynodeSectionHeading } from "./fynode-section-heading";

/** Fynode journal / blog — three cards with category + date + excerpt. */

export function FynodeJournal() {
  return (
    <section className="py-16">
      <div className="container-fynode">
        <div className="flex items-end justify-between gap-4">
          <FynodeSectionHeading eyebrow="Journal" title="Latest Articles" />
          <a
            href="#"
            className="shrink-0 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-fynode-accent)]"
          >
            View all →
          </a>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {JOURNAL_POSTS.map((post) => (
            <a key={post.title} href="#" className="group block">
              <div className="overflow-hidden rounded-lg bg-[var(--color-surface)]">
                <img
                  src={post.image}
                  alt={post.title}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
              </div>
              <div className="mt-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-secondary)]">
                <span className="text-[var(--color-fynode-accent)]">
                  {post.category}
                </span>
                <span aria-hidden>·</span>
                <span>{post.date}</span>
              </div>
              <h3 className="mt-3 text-[17px] font-bold leading-snug text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-fynode-accent)]">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-[13px] text-[var(--color-secondary)]">
                {post.excerpt}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

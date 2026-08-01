/** Fynode-style section heading (eyebrow + title + optional subtitle). */

export function FynodeSectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-fynode-accent)]">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-[15px] text-[var(--color-secondary)]">{subtitle}</p>
      )}
    </div>
  );
}

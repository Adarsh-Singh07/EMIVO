import { cn, formatINR } from "@/lib/utils";

/**
 * <LedgerFigure />
 * ------------------------------------------------------------------
 * The ONLY sanctioned way to render money/EMI figures in EMIVO.
 *
 * Renders the amount in IBM Plex Mono with the 2px Signal Amber
 * ledger underline (via `.ledger-line`). Do NOT hand-format rupee
 * strings elsewhere — import this component.
 *
 * All values are expressed in **paisa** (₹1 = 100 paisa) and formatted
 * with `formatINR` (Intl "en-IN" Indian grouping, no decimals).
 */

const sizeClasses = {
  xs: "text-[11px]",
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-[28px]",
  "2xl": "text-4xl",
} as const;

const toneClasses = {
  default: "text-foreground",
  navy: "text-primary",
  accent: "text-accent",
  success: "text-success",
  error: "text-error",
  muted: "text-secondary",
  "on-dark": "text-white",
} as const;

export interface LedgerFigureProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Amount in paisa (₹1 = 100 paisa). */
  paisa: number;
  size?: keyof typeof sizeClasses;
  tone?: keyof typeof toneClasses;
  /** Hide the ledger underline (e.g. for derived totals in small print). */
  noLine?: boolean;
  /** Suffix rendered smaller after the figure, e.g. "/mo" or "/yr". */
  suffix?: string;
}

export function LedgerFigure({
  paisa,
  size = "md",
  tone = "default",
  noLine = false,
  suffix,
  className,
  ...props
}: LedgerFigureProps) {
  const label = `${formatINR(paisa)}${suffix ? ` ${suffix}` : ""}`;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-[0.15em] font-mono font-semibold tabular-nums tracking-tight",
        sizeClasses[size],
        toneClasses[tone],
        !noLine && "ledger-line",
        className
      )}
      aria-label={label}
      {...props}
    >
      <span className="leading-none">{formatINR(paisa)}</span>
      {suffix && (
        <span className="text-[0.6em] font-medium opacity-80">{suffix}</span>
      )}
    </span>
  );
}

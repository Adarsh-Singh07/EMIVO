"use client";

/**
 * Shared CTA button (V1). One place for the store's button language:
 * - primary    : solid neutral-950 (main action: Add to Cart, Accept, Apply)
 * - accent     : amber-400 (monetary "buy" moments: Buy Now)
 * - outline    : bordered neutral (secondary: Continue Shopping, Previous/Next)
 * - ghost      : text-only quiet action (Clear filters, links)
 * Supports `loading` (spinner replaces leading content) and renders as a
 * next/link when `href` is passed. Sizes map to the existing heights used
 * across the storefront (h-9 compact / h-10 default / h-12 large).
 */
import Link from "next/link";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "accent" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-neutral-950 text-white hover:bg-neutral-800 disabled:hover:bg-neutral-950",
  accent:
    "bg-amber-400 text-amber-950 hover:bg-amber-500 disabled:hover:bg-amber-400",
  outline:
    "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 disabled:hover:bg-white",
  ghost: "text-neutral-700 hover:bg-neutral-100 disabled:hover:bg-transparent",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-4 text-xs rounded-full",
  md: "h-10 px-5 text-sm rounded-lg",
  lg: "h-12 px-6 text-sm rounded-full",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  href?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, href, className = "", children, disabled, ...rest },
  ref
) {
  const classes = [
    "inline-flex items-center justify-center gap-2 font-semibold transition-colors select-none",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ].join(" ");

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref} disabled={disabled || loading} className={classes} {...rest}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;

import * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "accent" | "attention" | "danger" | "progress";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONES: Record<BadgeTone, string> = {
  neutral: "border-neutral-200 bg-neutral-50 text-neutral-700",
  accent: "border-emerald-200 bg-emerald-50 text-emerald-800",
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  progress: "border-sky-200 bg-sky-50 text-sky-800",
};

/** Status tag: a 4px-cornered label in one of five tones. Use for real state only. */
export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium leading-5",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

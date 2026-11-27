import { AlertTriangle, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "attention" | "danger";

const TONES = {
  info: "border-neutral-200 bg-neutral-50 text-neutral-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
} as const;

const ICONS = { info: Info, success: CheckCircle2, attention: AlertTriangle, danger: AlertCircle } as const;

interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Inline notice. One box for every message level — the icon and wording carry the meaning. */
export function Alert({ tone = "info", children, action, className }: AlertProps) {
  const Icon = ICONS[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-md border p-3.5 text-sm", TONES[tone], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

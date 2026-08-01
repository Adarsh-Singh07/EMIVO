import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
        secondary:
          "border-transparent bg-[var(--color-surface)] text-[var(--color-foreground)] border-[var(--color-border)]",
        destructive:
          "border-transparent bg-[var(--color-error)] text-white",
        outline: "text-[var(--color-foreground)] border-[var(--color-border)]",
        emi: "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold tracking-tight",
        discount: "border-transparent bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/25",
        ai: "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-primary)] font-medium gap-1 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    icon?: boolean;
}

function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {variant === 'ai' && icon !== false && <Sparkles className="w-3 h-3 text-[var(--color-accent)]" />}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }

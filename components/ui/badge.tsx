import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80",
        secondary:
          "border-transparent bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-black/5",
        destructive:
          "border-transparent bg-red-500 text-white hover:bg-red-500/80",
        outline: "text-[var(--color-foreground)] border-black/10",
        emi: "border-transparent bg-black text-white font-bold tracking-tight",
        discount: "border-transparent bg-green-500/10 text-green-700 border-green-500/20",
        ai: "ai-glass text-[var(--color-foreground)] font-medium gap-1 px-3",
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

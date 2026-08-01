import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-[var(--color-surface)] transition-all duration-200 ease-[var(--ease-premium)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 shadow-sm",
        destructive: "bg-[var(--color-error)] text-white hover:opacity-90",
        outline: "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-primary)]/[0.05] text-[var(--color-foreground)]",
        secondary: "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-primary)]/[0.05]",
        ghost: "hover:bg-[var(--color-primary)]/[0.05] text-[var(--color-foreground)]",
        link: "text-[var(--color-accent)] underline-offset-4 hover:underline",
        accent: "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:opacity-90 shadow-sm",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

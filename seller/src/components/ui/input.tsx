import * as React from "react";

import { cn } from "@/lib/utils";

/** Text field. The look lives in the `.ex-input` rule in globals.css. */
export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn("ex-input", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn("ex-input", className)} {...props} />,
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn("ex-input", className)} {...props} />,
);
Select.displayName = "Select";

export const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("block text-sm font-medium text-neutral-800", className)} {...props} />
  ),
);
Label.displayName = "Label";

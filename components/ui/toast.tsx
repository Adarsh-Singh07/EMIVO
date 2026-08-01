"use client"

import * as React from "react"
import { Toaster as Sonner, toast } from "sonner"

type ToastVariant = "default" | "success" | "error" | "warning"

interface ToastOptions {
  description?: string
  variant?: ToastVariant
  action?: {
    label: string
    onClick: () => void
  }
}

function showToast(message: string, options?: ToastOptions) {
  const variant = options?.variant || "default"

  const classNames = {
    default: "bg-[var(--color-surface)] border-[var(--color-border)]",
    success: "bg-[#1F8A5F] text-white border-[#1F8A5F]",
    error: "bg-[#D14343] text-white border-[#D14343]",
    warning: "bg-[#E8A33D] text-white border-[#E8A33D]",
  }

  toast[variant === "default" ? "message" : variant](message, {
    description: options?.description,
    action: options?.action,
    className: classNames[variant],
  })
}

function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "group font-sans",
          title: "text-sm font-semibold",
          description: "text-xs opacity-90",
          actionButton: "bg-[var(--color-primary)] text-white text-xs font-medium px-3 py-1 rounded-md",
          cancelButton: "bg-[var(--color-border)] text-[var(--color-foreground)] text-xs font-medium px-3 py-1 rounded-md",
        },
      }}
    />
  )
}

export { Toaster, showToast }

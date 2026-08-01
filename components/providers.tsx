"use client"

import { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { MotionConfig } from "framer-motion"
import { Toaster } from "@/components/ui/toast"

export function Providers({ children }: { children: ReactNode }) {
  // Use useState to ensure the QueryClient is only created once per session on the client
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000 * 5, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" honours prefers-reduced-motion globally for all
          framer-motion animations — transforms/layout jumps are disabled for
          those users, opacity fades remain. */}
      <MotionConfig reducedMotion="user">
        {children}
        <Toaster />
      </MotionConfig>
    </QueryClientProvider>
  )
}
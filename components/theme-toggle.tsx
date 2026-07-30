"use client";

import { useTheme } from "@/lib/theme";
import { Moon, Sun, MonitorSmartphone, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.button
        onClick={toggleTheme}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-surface)] px-4 py-3 rounded-[var(--radius-full)] shadow-[var(--shadow-lg)] border border-[var(--color-border)]/20 overflow-hidden relative group"
      >
        <span className="text-sm font-semibold relative z-10 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Theme {theme.toUpperCase()}
        </span>
        <div className="absolute inset-0 bg-[var(--color-accent)]/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
      </motion.button>
    </div>
  );
}

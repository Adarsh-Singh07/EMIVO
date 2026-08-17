"use client";

import { motion } from "framer-motion";

export function LoadingStagger({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-1.5 items-center justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
          animate={{
            y: ["0%", "-50%", "0%"],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15
          }}
        />
      ))}
    </div>
  );
}

"use client"

import { motion } from "framer-motion"
import { useApp } from "@/lib/store"
import { MOOD_COLORS } from "@/lib/data"

interface Props {
  bars?: number
  className?: string
  height?: number
}

export function VoiceVisualizer({ bars = 28, className, height = 56 }: Props) {
  const { mood } = useApp()
  const color = MOOD_COLORS[mood]
  const intensity =
    mood === "speaking" || mood === "playful"
      ? 1
      : mood === "listening" || mood === "gaming"
        ? 0.85
        : mood === "thinking"
          ? 0.55
          : 0.35

  return (
    <div
      className={className}
      style={{ height }}
      aria-hidden="true"
    >
      <div className="relative h-full w-full overflow-hidden rounded-md">
        <div className="absolute inset-0 ps-mesh-fine opacity-40" />
        <div className="relative flex h-full w-full items-center justify-center gap-[3px] px-2">
          {Array.from({ length: bars }).map((_, i) => {
            const seed = (Math.sin(i * 1.3) + 1) / 2
            const min = 0.18 + seed * 0.2
            const max = 0.55 + seed * 0.45 * intensity
            return (
              <motion.span
                key={i}
                className="block w-[3px] rounded-sm"
                style={{
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
                animate={{
                  scaleY: [min, max, min * 0.9, max * 0.7, min],
                }}
                transition={{
                  duration: 1 + (i % 5) * 0.18,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.04,
                }}
                initial={{ scaleY: min }}
                // Tailwind safelist not needed; baseline height set inline
              />
            )
          })}
        </div>
        {/* Center pulse line */}
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  )
}

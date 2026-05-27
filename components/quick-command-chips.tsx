"use client"

import { motion } from "framer-motion"
import {
  Dices,
  Gamepad2,
  Laugh,
  MessageSquareText,
  Mic2,
  Sparkles,
  Sunrise,
  Wifi,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface Chip {
  label: string
  icon: LucideIcon
  accent: string
}

const CHIPS: Chip[] = [
  { label: "Tell a joke", icon: Laugh, accent: "#ff2d9c" },
  { label: "Start chat", icon: MessageSquareText, accent: "#00f0ff" },
  { label: "Change voice", icon: Mic2, accent: "#b829ff" },
  { label: "Play a game", icon: Gamepad2, accent: "#ff7a00" },
  { label: "Prank idea", icon: Sparkles, accent: "#ff2d9c" },
  { label: "Daily briefing", icon: Sunrise, accent: "#39ff14" },
  { label: "Explain my network", icon: Wifi, accent: "#39ff14" },
  { label: "Surprise me", icon: Dices, accent: "#00f0ff" },
]

export function QuickCommandChips({
  onSelect,
}: {
  onSelect?: (label: string) => void
}) {
  return (
    <div className="-mx-4 px-4 ps-no-scrollbar overflow-x-auto">
      <div className="flex w-max gap-2 pb-1">
        {CHIPS.map((c) => {
          const Icon = c.icon
          return (
            <motion.button
              key={c.label}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelect?.(c.label)}
              className="group flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2.5 ps-glass touch-manipulation"
              style={{
                boxShadow: `inset 0 0 0 1px ${c.accent}33, 0 0 14px ${c.accent}33`,
              }}
            >
              <Icon
                className="h-4 w-4"
                style={{ color: c.accent, filter: `drop-shadow(0 0 6px ${c.accent})` }}
              />
              <span className="ps-mono text-[11px] tracking-widest text-white/90">
                {c.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

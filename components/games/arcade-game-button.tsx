"use client"

import { motion } from "framer-motion"

export function ArcadeGameButton({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg px-3 py-2 ps-mono text-[10px] tracking-[0.22em]"
      style={{
        color: disabled ? "rgba(255,255,255,0.35)" : color,
        background: disabled ? "rgba(255,255,255,0.04)" : `${color}14`,
        boxShadow: `inset 0 0 0 1px ${disabled ? "rgba(255,255,255,0.12)" : `${color}77`}`,
      }}
    >
      {label}
    </motion.button>
  )
}

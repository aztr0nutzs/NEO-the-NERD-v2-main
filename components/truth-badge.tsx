"use client"

import type { TruthLabel } from "@/lib/truth-labels"
import { truthLabelColor } from "@/lib/truth-labels"

export function TruthBadge({
  label,
  title,
  className = "",
}: {
  label: TruthLabel
  title?: string
  className?: string
}) {
  const color = truthLabelColor(label)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 ps-mono text-[9px] uppercase tracking-[0.22em] ${className}`}
      style={{
        color,
        background: `${color}1A`,
        boxShadow: `inset 0 0 0 1px ${color}66`,
        textShadow: `0 0 5px ${color}55`,
      }}
      title={title}
    >
      {label}
    </span>
  )
}

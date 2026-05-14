"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type Accent = "cyan" | "purple" | "pink" | "green" | "orange"

const ACCENT_RGB: Record<Accent, string> = {
  cyan: "0, 240, 255",
  purple: "184, 41, 255",
  pink: "255, 45, 156",
  green: "57, 255, 20",
  orange: "255, 122, 0",
}

interface NeonPanelProps {
  children: ReactNode
  className?: string
  accent?: Accent
  corners?: boolean
  scanlines?: boolean
  glow?: "soft" | "strong" | "none"
  as?: "div" | "section" | "article"
}

export function NeonPanel({
  children,
  className,
  accent = "cyan",
  corners = true,
  scanlines = false,
  glow = "soft",
  as: Tag = "div",
}: NeonPanelProps) {
  const rgb = ACCENT_RGB[accent]
  const borderShadow =
    glow === "strong"
      ? `0 0 0 1px rgba(${rgb}, 0.55) inset, 0 0 24px rgba(${rgb}, 0.35), 0 0 60px rgba(${rgb}, 0.18)`
      : glow === "soft"
        ? `0 0 0 1px rgba(${rgb}, 0.32) inset, 0 0 14px rgba(${rgb}, 0.18)`
        : `0 0 0 1px rgba(${rgb}, 0.22) inset`

  return (
    <Tag
      className={cn(
        "relative rounded-[14px] ps-glass overflow-hidden",
        className,
      )}
      style={{ boxShadow: borderShadow }}
    >
      {scanlines && (
        <div className="pointer-events-none absolute inset-0 ps-scanlines opacity-60" />
      )}
      {corners && (
        <>
          <span
            className="pointer-events-none absolute top-0 left-0 h-3 w-3"
            style={{
              borderTop: `1px solid rgba(${rgb}, 0.85)`,
              borderLeft: `1px solid rgba(${rgb}, 0.85)`,
            }}
          />
          <span
            className="pointer-events-none absolute top-0 right-0 h-3 w-3"
            style={{
              borderTop: `1px solid rgba(${rgb}, 0.85)`,
              borderRight: `1px solid rgba(${rgb}, 0.85)`,
            }}
          />
          <span
            className="pointer-events-none absolute bottom-0 left-0 h-3 w-3"
            style={{
              borderBottom: `1px solid rgba(${rgb}, 0.85)`,
              borderLeft: `1px solid rgba(${rgb}, 0.85)`,
            }}
          />
          <span
            className="pointer-events-none absolute bottom-0 right-0 h-3 w-3"
            style={{
              borderBottom: `1px solid rgba(${rgb}, 0.85)`,
              borderRight: `1px solid rgba(${rgb}, 0.85)`,
            }}
          />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </Tag>
  )
}

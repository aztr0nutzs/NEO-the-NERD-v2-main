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
  /**
   * Density of the panel substrate. `data` (default) is the standard glass
   * surface used by HUD cards. `heavy` opts into the `ps-glass-strong`
   * substrate for panels that carry critical numerals/telemetry and need
   * to be readable on the brightest frames of the animated background.
   */
  density?: "data" | "heavy"
  as?: "div" | "section" | "article"
}

export function NeonPanel({
  children,
  className,
  accent = "cyan",
  corners = true,
  scanlines = false,
  glow = "soft",
  density = "data",
  as: Tag = "div",
}: NeonPanelProps) {
  const rgb = ACCENT_RGB[accent]
  // Slightly stronger inset stroke + drop shadow so panels separate cleanly
  // from the bright animated background. The outer drop shadow is kept
  // restrained so the neon glow (which carries the NEO identity) still leads.
  const borderShadow =
    glow === "strong"
      ? `0 0 0 1px rgba(${rgb}, 0.6) inset, 0 0 26px rgba(${rgb}, 0.36), 0 0 60px rgba(${rgb}, 0.18), 0 8px 28px rgba(0,0,0,0.45)`
      : glow === "soft"
        ? `0 0 0 1px rgba(${rgb}, 0.38) inset, 0 0 14px rgba(${rgb}, 0.2), 0 6px 22px rgba(0,0,0,0.4)`
        : `0 0 0 1px rgba(${rgb}, 0.28) inset, 0 4px 18px rgba(0,0,0,0.4)`

  return (
    <Tag
      className={cn(
        "relative rounded-[14px] overflow-hidden",
        density === "heavy" ? "ps-glass-strong" : "ps-glass",
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

"use client"

import { motion } from "framer-motion"
import {
  Bot,
  Gamepad2,
  Gauge,
  Library,
  MessageSquare,
  Mic2,
  PartyPopper,
  Radar,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import { useApp } from "@/lib/store"
import type { ScreenId } from "@/lib/types"

interface DockItem {
  id: ScreenId
  label: string
  icon: LucideIcon
  accent: string
}

// Network is intentionally placed in the first cluster of items so it is
// inside the visible-by-default portion of the horizontally scrolling dock
// strip on narrow Android phones (~360-393px viewport). Previous order
// pushed it to position 7 of 9, which left it offscreen with no scroll
// affordance and made the entire Network feature undiscoverable.
const ITEMS: DockItem[] = [
  { id: "main", label: "Robot", icon: Bot, accent: "#00f0ff" },
  { id: "chat", label: "Chat", icon: MessageSquare, accent: "#b829ff" },
  { id: "network", label: "Network", icon: Radar, accent: "#39ff14" },
  { id: "speed", label: "Speed", icon: Gauge, accent: "#ff7a00" },
  { id: "voices", label: "Voices", icon: Mic2, accent: "#ff2d9c" },
  { id: "personalities", label: "Person.", icon: Sparkles, accent: "#39ff14" },
  { id: "games", label: "Games", icon: Gamepad2, accent: "#ff7a00" },
  { id: "controls", label: "Ctrl", icon: SlidersHorizontal, accent: "#00f0ff" },
  { id: "library", label: "Library", icon: Library, accent: "#b829ff" },
  { id: "prank", label: "Prank", icon: PartyPopper, accent: "#ff2d9c" },
  { id: "settings", label: "Set", icon: Settings, accent: "#ff2d9c" },
]

export function BottomDock() {
  const { screen, setScreen } = useApp()
  const listRef = useRef<HTMLUListElement | null>(null)

  // When the active screen changes (including via the Main shortcut card,
  // not just dock taps), scroll the matching dock item into the viewport.
  // Without this, navigating to an offscreen entry (e.g. Network from the
  // Main shortcut) would leave the dock highlighting an item the user
  // cannot see, defeating the discoverability cue.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const activeBtn = list.querySelector<HTMLButtonElement>(
      'button[aria-current="page"]',
    )
    if (!activeBtn) return
    activeBtn.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }, [screen])

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      <div
        className="mx-auto max-w-2xl ps-glass relative rounded-t-2xl rounded-b-xl border border-white/10"
        style={{
          boxShadow:
            "0 -10px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,240,255,0.2) inset, 0 -2px 24px rgba(0,240,255,0.15)",
        }}
      >
        {/* glow strip top */}
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, #00f0ff, #b829ff, #ff2d9c, transparent)",
            boxShadow: "0 0 14px #00f0ff",
          }}
        />

        <ul
          ref={listRef}
          className="grid auto-cols-[4.75rem] grid-flow-col overflow-x-auto scroll-smooth px-1 py-1.5 [scrollbar-width:none] sm:grid-cols-11 sm:auto-cols-auto sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {ITEMS.map((item) => {
            const active = screen === item.id
            const Icon = item.icon
            return (
              <li key={item.id} className="flex">
                <button
                  type="button"
                  onClick={() => setScreen(item.id)}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="relative flex w-full flex-col items-center justify-center gap-0.5 rounded-xl py-1.5"
                >
                  {active && (
                    <motion.span
                      layoutId="dock-active"
                      className="absolute inset-1 -z-0 rounded-lg"
                      style={{
                        background: `linear-gradient(180deg, ${item.accent}33, ${item.accent}11)`,
                        boxShadow: `inset 0 0 0 1px ${item.accent}88, 0 0 18px ${item.accent}55`,
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    />
                  )}
                  <Icon
                    className="relative z-10 h-[18px] w-[18px]"
                    style={{
                      color: active ? item.accent : "rgba(255,255,255,0.7)",
                      filter: active ? `drop-shadow(0 0 6px ${item.accent})` : "none",
                    }}
                  />
                  <span
                    className="relative z-10 ps-mono text-[8px] tracking-[0.2em]"
                    style={{
                      color: active ? item.accent : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {item.label.toUpperCase()}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {/*
          Right-edge fade — visible only on widths where the dock scrolls
          horizontally (mobile). Signals to the user that more dock items
          live offscreen so the strip is no longer perceived as fixed.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl sm:hidden"
          style={{
            background:
              "linear-gradient(to left, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)",
          }}
        />
        <p
          className="pointer-events-none absolute -top-5 right-2 rounded-full px-2 py-0.5 ps-mono text-[9px] tracking-[0.25em] text-white/65 sm:hidden"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)", background: "rgba(0,0,0,0.45)" }}
        >
          SWIPE DOCK →
        </p>
      </div>
    </nav>
  )
}

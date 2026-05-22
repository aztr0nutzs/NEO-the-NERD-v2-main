"use client"

import { useEffect, useState } from "react"
import { Bell, Cpu, Signal, Wifi } from "lucide-react"
import { useApp } from "@/lib/store"
import { MOOD_COLORS, MOOD_LABELS, PERSONALITIES, VOICES } from "@/lib/data"
import { RuntimeModeChip } from "./runtime-mode-chip"

export function AssistantStatusBar() {
  const { mood, voiceId, personalityId } = useApp()
  const voice = VOICES.find((v) => v.id === voiceId)
  const personality = PERSONALITIES.find((p) => p.id === personalityId)

  const [time, setTime] = useState<string>("")
  useEffect(() => {
    const update = () => {
      const d = new Date()
      const hh = String(d.getHours()).padStart(2, "0")
      const mm = String(d.getMinutes()).padStart(2, "0")
      setTime(`${hh}:${mm}`)
    }
    update()
    const t = setInterval(update, 30000)
    return () => clearInterval(t)
  }, [])

  const moodColor = MOOD_COLORS[mood]

  return (
    <div
      className="sticky top-0 z-40 px-3 pt-[env(safe-area-inset-top)]"
      style={{
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.92), rgba(0,0,0,0.7) 70%, transparent)",
      }}
    >
      <div className="mt-2 flex h-10 items-center justify-between rounded-[12px] border border-white/5 bg-black/60 px-3 ps-glass">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full animate-ps-pulse-ring"
            style={{
              background: moodColor,
              boxShadow: `0 0 10px ${moodColor}, 0 0 22px ${moodColor}`,
            }}
            aria-hidden="true"
          />
          <span className="ps-mono text-[10px] tracking-[0.2em] text-white/80">
            NEO <span className="ps-text-cyan">/</span> {MOOD_LABELS[mood]}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[10px] ps-mono text-white/60">
          <span className="ps-text-cyan">{voice?.name ?? "—"}</span>
          <span className="text-white/30">·</span>
          <span className="ps-text-pink">{personality?.name ?? "—"}</span>
        </div>

        <RuntimeModeChip />

        <div className="flex items-center gap-3 text-white/70">
          <Signal className="h-3.5 w-3.5" />
          <Wifi className="h-3.5 w-3.5" />
          <Cpu className="h-3.5 w-3.5 ps-text-green" />
          <Bell className="h-3.5 w-3.5" />
          <span className="ps-mono text-[10px] tracking-widest text-white">
            {time || "00:00"}
          </span>
        </div>
      </div>
    </div>
  )
}

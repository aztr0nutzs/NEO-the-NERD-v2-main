"use client"

import { useState } from "react"
import { Award, Lock, ChevronDown } from "lucide-react"
import { ACHIEVEMENTS, getAchievementDef } from "@/lib/games/achievements"
import type { ArcadeAchievement } from "@/lib/types"

export function AchievementsStrip({ achievements }: { achievements: ArcadeAchievement[] }) {
  const [expanded, setExpanded] = useState(false)
  const ownedIds = new Set(achievements.map((a) => a.id))
  const owned = ACHIEVEMENTS.filter((a) => ownedIds.has(a.id))
  const locked = ACHIEVEMENTS.filter((a) => !ownedIds.has(a.id))
  const total = ACHIEVEMENTS.length

  return (
    <section className="space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-1"
      >
        <p className="ps-mono text-[10px] tracking-[0.3em] text-white/55">
          ACHIEVEMENTS · {owned.length}/{total}
        </p>
        <ChevronDown className={`h-3.5 w-3.5 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Compact owned preview when collapsed */}
      {!expanded && owned.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {owned.slice(-6).map((a) => {
            const def = getAchievementDef(a.id)
            if (!def) return null
            return (
              <span
                key={a.id}
                className="flex items-center gap-1 rounded-full px-2 py-1 ps-mono text-[9px] tracking-[0.2em]"
                style={{ color: "#39ff14", background: "rgba(57,255,20,0.1)", boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.4)" }}
                title={def.description}
              >
                <Award className="h-3 w-3" />
                {def.title.toUpperCase()}
              </span>
            )
          })}
        </div>
      )}

      {expanded && (
        <div className="grid grid-cols-1 gap-1.5">
          {ACHIEVEMENTS.map((def) => {
            const isOwned = ownedIds.has(def.id)
            return (
              <div
                key={def.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                style={{
                  background: isOwned ? "rgba(57,255,20,0.08)" : "rgba(0,0,0,0.35)",
                  boxShadow: isOwned ? "inset 0 0 0 1px rgba(57,255,20,0.45)" : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="grid h-8 w-8 place-items-center rounded-md shrink-0"
                  style={{
                    color: isOwned ? "#39ff14" : "rgba(255,255,255,0.35)",
                    background: isOwned ? "rgba(57,255,20,0.14)" : "rgba(255,255,255,0.03)",
                    boxShadow: isOwned ? "inset 0 0 0 1px rgba(57,255,20,0.55)" : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                  }}
                >
                  {isOwned ? <Award className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="ps-mono text-[10px] tracking-[0.2em] leading-tight" style={{ color: isOwned ? "#9bff8f" : "rgba(255,255,255,0.6)" }}>
                    {def.title.toUpperCase()}
                  </p>
                  <p className="text-[11px] leading-tight" style={{ color: isOwned ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.4)" }}>
                    {def.description}
                  </p>
                </div>
                <span className="ps-mono text-[9px] tracking-[0.2em] text-white/45 shrink-0">+{def.xpReward} XP</span>
              </div>
            )
          })}
        </div>
      )}

      {!expanded && owned.length === 0 && (
        <p className="ps-mono text-[10px] tracking-[0.2em] text-white/35 px-1">No achievements yet — play to unlock.</p>
      )}

      {expanded && locked.length === 0 && (
        <p className="ps-mono text-[10px] tracking-[0.2em] text-white/45 text-center">All achievements unlocked. NEO is impressed.</p>
      )}
    </section>
  )
}

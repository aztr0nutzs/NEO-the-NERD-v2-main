"use client"

import { CalendarCheck, Trophy } from "lucide-react"
import { NeonPanel } from "../neon-panel"
import { GAMES } from "@/lib/data"
import { challengeProgress } from "@/lib/games/daily-challenge"
import type { DailyChallenge, GameId, GameProgressionStats } from "@/lib/types"

export function DailyChallengeCard({
  challenge,
  stats,
  onLaunch,
}: {
  challenge: DailyChallenge
  stats: GameProgressionStats
  onLaunch: (g: GameId) => void
}) {
  const game = GAMES.find((g) => g.id === challenge.gameId)
  const { current, target } = challengeProgress(challenge, stats)
  const numericProgress = Number.isFinite(current)
    ? Math.min(100, Math.round((Math.max(0, current - challenge.baselineValue) / Math.max(1, target - challenge.baselineValue)) * 100))
    : 0
  const pct = challenge.completed ? 100 : numericProgress

  return (
    <NeonPanel accent={challenge.completed ? "green" : "purple"} glow="strong" className="p-3">
      <div className="flex items-start gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-lg shrink-0"
          style={{
            background: challenge.completed ? "rgba(57,255,20,0.18)" : "rgba(184,41,255,0.18)",
            boxShadow: challenge.completed
              ? "inset 0 0 0 1px rgba(57,255,20,0.6), 0 0 12px rgba(57,255,20,0.4)"
              : "inset 0 0 0 1px rgba(184,41,255,0.6)",
          }}
        >
          {challenge.completed
            ? <Trophy className="h-5 w-5" style={{ color: "#39ff14" }} />
            : <CalendarCheck className="h-5 w-5" style={{ color: "#b829ff" }} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="ps-mono text-[10px] tracking-[0.3em]" style={{ color: challenge.completed ? "#39ff14" : "#b829ff" }}>
            DAILY_CHALLENGE · {challenge.dayKey}
          </p>
          <p className="ps-heading text-base text-white/95 leading-tight">{challenge.label}</p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/55">
            {(game?.title ?? challenge.gameId).toUpperCase()} · +{challenge.xpReward} XP
          </p>
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            background: challenge.completed
              ? "linear-gradient(90deg,#39ff14,#00f0ff)"
              : "linear-gradient(90deg,#b829ff,#ff2d9c)",
            boxShadow: challenge.completed ? "0 0 10px #39ff14aa" : "0 0 8px #b829ff88",
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="ps-mono text-[9px] tracking-[0.2em] text-white/55">
          {challenge.completed
            ? "CLEARED · COME BACK TOMORROW"
            : `PROGRESS ${Number.isFinite(current) ? current : "--"} / ${target}`}
        </p>
        {!challenge.completed && (
          <button
            type="button"
            onClick={() => onLaunch(challenge.gameId)}
            className="rounded-md px-3 py-1 ps-mono text-[10px] tracking-[0.25em]"
            style={{ color: "#000", background: "#b829ff", boxShadow: "0 0 10px #b829ffaa" }}
          >
            LAUNCH
          </button>
        )}
      </div>
    </NeonPanel>
  )
}

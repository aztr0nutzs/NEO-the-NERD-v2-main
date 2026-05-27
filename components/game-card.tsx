"use client"

import { motion } from "framer-motion"
import { Play, Trophy, Clock, Flame } from "lucide-react"
import type { GameDef, GameId, GameProgressionStats } from "@/lib/types"

const ACCENT_HEX: Record<GameDef["accent"], string> = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

export function GameCard({
  game,
  stats,
  onPlay,
  recommended,
}: {
  game: GameDef
  stats?: GameProgressionStats
  onPlay?: (id: GameId) => void
  recommended?: boolean
}) {
  const c = ACCENT_HEX[game.accent]
  const totalRuns = stats ? stats.wins + stats.losses + stats.draws : 0
  const winRate = totalRuns > 0 ? Math.round((stats!.wins / totalRuns) * 100) : null
  const bestTimeSec = stats?.fastestCompletionMs ? Math.ceil(stats.fastestCompletionMs / 1000) : null

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="relative rounded-xl ps-glass p-3"
      style={{ boxShadow: `inset 0 0 0 1px ${c}55, 0 0 14px ${c}22` }}
    >
      {recommended && (
        <span
          className="absolute -top-2 left-3 rounded-full px-2 py-0.5 ps-mono text-[8px] tracking-[0.3em]"
          style={{ color: "#000", background: c, boxShadow: `0 0 10px ${c}aa` }}
        >
          NEO REC
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            className="ps-heading text-base leading-none"
            style={{ color: c, textShadow: `0 0 8px ${c}` }}
          >
            {game.title}
          </h3>
          <p className="mt-1 text-[12px] text-white/70 text-pretty">{game.behavior}</p>
        </div>
        {game.playable && (
          <span
            className="rounded-full px-2 py-0.5 ps-mono text-[8px] tracking-[0.25em]"
            style={{
              color: "#39ff14",
              background: "rgba(57,255,20,0.12)",
              boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.55)",
            }}
          >
            PLAYABLE
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Tag label={game.category.toUpperCase()} c={c} />
        <Tag label={game.difficulty.toUpperCase()} c={c} />
        <Tag label={game.estTime.toUpperCase()} c="#ffffff80" />
        {game.supportsScore && <Tag label="SCORE" c="#ffffff60" />}
        {game.supportsTimer && <Tag label="TIMER" c="#ffffff60" />}
        {game.supportsStreakMode && <Tag label="STREAK" c="#ffffff60" />}
      </div>

      {stats && totalRuns > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-md bg-black/30 px-2 py-1.5" style={{ boxShadow: `inset 0 0 0 1px ${c}22` }}>
          <Stat icon={<Trophy className="h-3 w-3" />} label="BEST" value={stats.bestScore > 0 ? `${stats.bestScore}` : "--"} c={c} />
          <Stat icon={<Flame className="h-3 w-3" />} label="WIN%" value={winRate != null ? `${winRate}%` : "--"} c={c} />
          <Stat icon={<Clock className="h-3 w-3" />} label="RUNS" value={`${totalRuns}`} c={c} />
        </div>
      )}
      {stats && (stats.bestStreak > 0 || bestTimeSec != null) && (
        <p className="mt-1 ps-mono text-[9px] tracking-[0.2em] text-white/55">
          {stats.bestStreak > 0 && <>STREAK {stats.bestStreak}</>}
          {stats.bestStreak > 0 && bestTimeSec != null && " · "}
          {bestTimeSec != null && <>FAST {bestTimeSec}S</>}
        </p>
      )}

      <button
        type="button"
        onClick={() => onPlay?.(game.id)}
        disabled={!game.playable}
        aria-disabled={!game.playable}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg py-2.5 ps-mono text-[11px] tracking-[0.3em] disabled:cursor-not-allowed"
        style={{
          color: game.playable ? "#000" : "rgba(255,255,255,0.45)",
          background: game.playable ? `linear-gradient(180deg, ${c}, ${c}AA)` : "rgba(255,255,255,0.04)",
          boxShadow: game.playable
            ? `inset 0 0 0 1px ${c}, 0 0 14px ${c}AA`
            : "inset 0 0 0 1px rgba(255,255,255,0.12)",
        }}
      >
        <Play className="h-3.5 w-3.5" />
        {game.playable ? (totalRuns > 0 ? "REPLAY" : "PLAY NOW") : "COMING SOON"}
      </button>
    </motion.div>
  )
}

function Tag({ label, c }: { label: string; c: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 ps-mono text-[8px] tracking-[0.25em]"
      style={{
        color: c,
        background: `${c}14`,
        boxShadow: `inset 0 0 0 1px ${c}55`,
      }}
    >
      {label}
    </span>
  )
}

function Stat({ icon, label, value, c }: { icon: React.ReactNode; label: string; value: string; c: string }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: c }}>{icon}</span>
      <div className="min-w-0">
        <p className="ps-mono text-[8px] tracking-[0.2em] text-white/45 leading-none">{label}</p>
        <p className="ps-mono text-[10px] tracking-[0.15em] leading-none" style={{ color: c, textShadow: `0 0 4px ${c}66` }}>{value}</p>
      </div>
    </div>
  )
}

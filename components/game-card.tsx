"use client"

import { motion } from "framer-motion"
import { Play } from "lucide-react"
import type { GameDef, GameId } from "@/lib/types"

const ACCENT_HEX: Record<GameDef["accent"], string> = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

export function GameCard({
  game,
  onPlay,
}: {
  game: GameDef
  onPlay?: (id: GameId) => void
}) {
  const c = ACCENT_HEX[game.accent]
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="relative rounded-xl ps-glass p-3"
      style={{ boxShadow: `inset 0 0 0 1px ${c}55, 0 0 14px ${c}22` }}
    >
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
        <Tag label={game.difficulty.toUpperCase()} c={c} />
        <Tag label={game.estTime.toUpperCase()} c="#ffffff80" />
        <Tag label={game.multiplayer.toUpperCase()} c={c} />
      </div>

      <button
        type="button"
        onClick={() => onPlay?.(game.id)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 ps-mono text-[11px] tracking-[0.3em]"
        style={{
          color: game.playable ? "#000" : c,
          background: game.playable
            ? `linear-gradient(180deg, ${c}, ${c}AA)`
            : `${c}14`,
          boxShadow: game.playable
            ? `inset 0 0 0 1px ${c}, 0 0 14px ${c}AA`
            : `inset 0 0 0 1px ${c}66`,
        }}
      >
        <Play className="h-3.5 w-3.5" />
        {game.playable ? "PLAY NOW" : "COMING SOON"}
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

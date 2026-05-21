"use client"

import type { ReactNode } from "react"
import { RotateCcw } from "lucide-react"
import { NeonPanel } from "../neon-panel"
import type { GameId, GameSessionState } from "@/lib/types"

const ACCENT: Record<GameId, "cyan" | "purple" | "pink" | "green" | "orange"> = {
  tictactoe: "cyan",
  rps: "pink",
  memory: "purple",
  reaction: "orange",
  guess: "green",
  trivia: "cyan",
  scramble: "purple",
  emoji: "pink",
  rapidfire: "orange",
  wyr: "green",
  codebreaker: "green",
  signal: "cyan",
  firewall: "pink",
  heist: "purple",
  dodge: "orange",
  circuit: "green",
}

const HEX = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

const TITLES: Record<GameId, string> = {
  tictactoe: "TIC_TAC_TOE",
  rps: "ROCK_PAPER_SCISSORS",
  memory: "MEMORY_MATCH",
  reaction: "REACTION_TAP",
  guess: "GUESS_THE_NUMBER",
  trivia: "TRIVIA_DUEL",
  scramble: "WORD_SCRAMBLE",
  emoji: "EMOJI_DECODE",
  rapidfire: "RAPID_FIRE",
  wyr: "WOULD_YOU_RATHER",
  codebreaker: "NEON_CODEBREAKER",
  signal: "SIGNAL_SEQUENCE",
  firewall: "FIREWALL_BREACH",
  heist: "CYBER_HEIST",
  dodge: "DRONE_DODGE",
  circuit: "CIRCUIT_BUILDER",
}

export function ArcadeGameShell({ game, session, onReset, onClose, children }: {
  game: Exclude<GameId, "tictactoe" | "rps">
  session: GameSessionState
  onReset: () => void
  onClose: () => void
  children: ReactNode
}) {
  const color = HEX[ACCENT[game]]

  return (
    <NeonPanel accent={ACCENT[game]} glow="strong" className="p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="ps-mono text-[10px] tracking-[0.3em]" style={{ color }}>
            {TITLES[game]}
          </p>
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/65">
            R{session.round} {"//"} YOU {session.score.you} · NEO {session.score.neo} {"//"} {session.result.toUpperCase()}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={onReset} aria-label="Replay" className="grid h-9 w-9 place-items-center rounded-lg text-white/80" style={{ boxShadow: `inset 0 0 0 1px ${color}80` }}>
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 ps-mono text-[10px] tracking-[0.25em] text-white/85" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}>
            EXIT
          </button>
        </div>
      </div>

      <p className="mt-2 rounded-lg bg-black/40 px-3 py-2 ps-mono text-[10px] tracking-[0.2em] text-white/70" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
        {session.robotResponse}
      </p>

      <div className="mt-3">{children}</div>
    </NeonPanel>
  )
}

"use client"
import { useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
import { GUESS_RATING, quip } from "@/lib/games/quips"

const cfg = {
  EASY: { max: 25, tries: 8 },
  ADAPTIVE: { max: 50, tries: 7 },
  HARD: { max: 100, tries: 6 },
} as const

const feedback = (d: number) =>
  d === 0 ? "LOCKED"
  : d <= 2 ? "BLAZING"
  : d <= 5 ? "HOT"
  : d <= 10 ? "WARM"
  : d <= 18 ? "COLD"
  : "FROZEN"

type Phase = "playing" | "won" | "lost"

export function GuessNumberGame({ difficulty, update }: ArcadeGameComponentProps) {
  const { max, tries } = cfg[difficulty]
  const [target, setTarget] = useState(() => Math.floor(Math.random() * max) + 1)
  const [guess, setGuess] = useState("")
  const [used, setUsed] = useState(0)
  const [lastDelta, setLastDelta] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>("playing")
  const [streak, setStreak] = useState(0)
  const lastGuessRef = useRef<number | null>(null)
  const left = tries - used
  const heat = useMemo(() => lastDelta == null ? 0 : Math.max(5, 100 - Math.min(100, lastDelta * (100 / max))), [lastDelta, max])
  const rating = used === 0 ? "" : GUESS_RATING(used, max)

  const submit = () => {
    if (phase !== "playing") return
    const n = Number(guess)
    if (!Number.isFinite(n) || n < 1 || n > max) return
    const next = used + 1
    setUsed(next)
    const delta = Math.abs(target - n)
    setLastDelta(delta)
    lastGuessRef.current = n

    if (delta === 0) {
      const quick = next <= (difficulty === "HARD" ? 3 : 2)
      const newStreak = streak + 1
      setStreak(newStreak)
      setPhase("won")
      update(
        "win",
        `${quip("guess", "win")} // SOLVED IN ${next} · ${quick ? "COMBO" : GUESS_RATING(next, max)}`,
        {
          score: quick ? 3 : 1,
          completionTimeMs: next * 900,
          streak: newStreak,
          forceProgression: true,
        },
      )
    } else if (next >= tries) {
      setStreak(0)
      setPhase("lost")
      update(
        "lose",
        `${quip("guess", "lose")} // TARGET ${target}`,
        { neoScore: 1, forceProgression: true },
      )
    } else {
      update(
        "playing",
        `${feedback(delta)} · ${n < target ? "GO HIGHER" : "GO LOWER"} · ${tries - next} LEFT`,
      )
    }
    setGuess("")
  }

  const nextRound = () => {
    setTarget(Math.floor(Math.random() * max) + 1)
    setUsed(0)
    setLastDelta(null)
    setPhase("playing")
    setGuess("")
    lastGuessRef.current = null
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <p className="ps-mono text-[10px] tracking-[0.2em] text-white/70">TRIES {left}</p>
        <p className="ps-mono text-[10px] tracking-[0.2em] text-white/70 text-center">HEAT {Math.round(heat)}%</p>
        <p className="ps-mono text-[10px] tracking-[0.2em] text-white/70 text-right">STREAK {streak}</p>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${heat}%`, background: "linear-gradient(90deg,#39ff14,#ff7a00)", boxShadow: "0 0 10px rgba(57,255,20,0.55)" }} />
      </div>
      {phase === "playing" ? (
        <div className="flex gap-2">
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit() }}
            placeholder={`1-${max}`}
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none ps-mono"
            style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.4)" }}
          />
          <ArcadeGameButton color="#39ff14" label="GUESS" onClick={submit} />
        </div>
      ) : (
        <div className="rounded-lg bg-black/50 px-3 py-2 space-y-2">
          <p className="ps-mono text-[11px] tracking-[0.25em]" style={{ color: phase === "won" ? "#39ff14" : "#ff2d9c" }}>
            {phase === "won" ? `LOCKED · ${rating}` : `SCAN FAILED · TARGET ${target}`}
          </p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/60">
            USED {used}/{tries} · RANGE 1-{max} · {difficulty}{phase === "won" ? ` · STREAK ${streak}` : ""}
          </p>
          <button
            type="button"
            onClick={nextRound}
            className="w-full rounded-lg py-2 ps-mono text-[11px] tracking-[0.25em]"
            style={{ background: "rgba(57,255,20,0.16)", color: "#39ff14", boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.5)" }}
          >
            NEW SCAN
          </button>
        </div>
      )}
    </div>
  )
}

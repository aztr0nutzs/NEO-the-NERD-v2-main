"use client"
import { useMemo, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const cfg = { EASY: { max: 25, tries: 8 }, ADAPTIVE: { max: 50, tries: 7 }, HARD: { max: 100, tries: 6 } } as const
const feedback = (d: number) => d === 0 ? "LOCKED" : d <= 2 ? "BLAZING" : d <= 5 ? "HOT" : d <= 10 ? "WARM" : d <= 18 ? "COLD" : "FROZEN"
export function GuessNumberGame({ difficulty, update }: ArcadeGameComponentProps) {
  const { max, tries } = cfg[difficulty]
  const [target, setTarget] = useState(() => Math.floor(Math.random() * max) + 1)
  const [guess, setGuess] = useState("")
  const [used, setUsed] = useState(0)
  const [lastDelta, setLastDelta] = useState<number | null>(null)
  const left = tries - used
  const heat = useMemo(() => lastDelta == null ? 0 : Math.max(5, 100 - Math.min(100, lastDelta * (100 / max))), [lastDelta, max])
  const submit = () => {
    const n = Number(guess); if (!Number.isFinite(n) || n < 1 || n > max) return
    const next = used + 1; setUsed(next); const delta = Math.abs(target - n); setLastDelta(delta)
    if (delta === 0) { const quick = next <= (difficulty === "HARD" ? 3 : 2); update("win", `TARGET LOCKED IN ${next} TRY // ${quick ? "COMBO BONUS" : "SOLID SOLVE"}`, { score: quick ? 3 : 1, completionTimeMs: next * 900, streak: quick ? 2 : 1, forceProgression: true }); setTarget(Math.floor(Math.random() * max) + 1); setUsed(0); setLastDelta(null) }
    else if (next >= tries) { update("lose", `SCAN FAILED // TARGET WAS ${target} // RATING: VOLATILE`, { neoScore: 1, forceProgression: true }); setTarget(Math.floor(Math.random() * max) + 1); setUsed(0); setLastDelta(null) }
    else update("playing", `${feedback(delta)} // ${n < target ? "GO HIGHER" : "GO LOWER"} // ${tries - next} LEFT`)
    setGuess("")
  }
  return <div className="space-y-2"><div className="grid grid-cols-2 gap-2"><p className="ps-mono text-[10px] tracking-[0.2em] text-white/70">ATTEMPTS LEFT {left}</p><p className="ps-mono text-[10px] tracking-[0.2em] text-white/70 text-right">HEAT {Math.round(heat)}%</p></div><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${heat}%`, background: "linear-gradient(90deg,#39ff14,#ff7a00)", boxShadow: "0 0 10px rgba(57,255,20,0.55)" }} /></div><div className="flex gap-2"><input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder={`1-${max}`} className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none" style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.4)" }} /><ArcadeGameButton color="#39ff14" label="GUESS" onClick={submit} /></div></div>
}

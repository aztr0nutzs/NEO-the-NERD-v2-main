"use client"

import { useEffect, useMemo, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

type Pair = { a: string; b: string; tag: string }
const BANK: Pair[] = [
  { a: "Have neon footprints", b: "Leave digital confetti", tag: "chaos" },
  { a: "Win trivia forever", b: "Never lose RPS", tag: "games" },
  { a: "Talk in modem sounds", b: "Glow when you lie", tag: "weird" },
  { a: "Own a robot backpack", b: "Own hover sneakers", tag: "future" },
  { a: "Launch harmless prank drones", b: "Deploy hologram stickers", tag: "prank" },
  { a: "Sleep 2 hours and feel perfect", b: "Need 12 hours nightly", tag: "lifestyle" },
]

export function WouldYouRatherGame({ difficulty, update }: ArcadeGameComponentProps) {
  const rounds = difficulty === "HARD" ? 6 : difficulty === "ADAPTIVE" ? 5 : 4
  const session = useMemo(() => BANK.sort(() => Math.random() - 0.5).slice(0, rounds), [rounds])
  const [idx, setIdx] = useState(0)
  const [predictHits, setPredictHits] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const pair = session[idx]
  const [prediction, setPrediction] = useState("")
  useEffect(() => { if (pair) setPrediction(Math.random() < 0.5 ? pair.a : pair.b) }, [idx, pair])

  const choose = (pick: string) => {
    const hit = pick === prediction
    if (hit) setPredictHits((h) => h + 1)
    setHistory((h) => [...h, pick])
    update("playing", `NEO predicted: ${prediction}. ${hit ? "Prediction hit." : "Prediction missed."} ${pick.includes("prank") ? "Chaos profile rising." : "Behavior pattern logged."}`, { score: 1, streak: hit ? 1 : 0 })
    const next = idx + 1
    setIdx(next)
    if (next >= session.length) {
      const profile = history.join(" ").toLowerCase().includes("prank") ? "Mischief Architect" : history.join(" ").toLowerCase().includes("trivia") ? "Competitive Oracle" : "Neon Wildcard"
      update("draw", `SESSION PROFILE // ${profile} // NEO_PREDICT ${predictHits}/${session.length}`, { score: history.length + 1, neoScore: history.length + 1, forceProgression: true })
    }
  }

  if (idx >= session.length) return <div className="space-y-2"><p className="rounded-lg bg-black/40 px-3 py-2 ps-mono text-[10px] tracking-[0.2em] text-green-200">PROFILE READY // PREDICTION HITS {predictHits}/{session.length}</p><div className="flex flex-wrap gap-1">{history.map((h, i) => <span key={`${h}-${i}`} className="rounded-full px-2 py-1 text-[10px] text-white/75" style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.35)" }}>{h}</span>)}</div></div>

  return <div className="space-y-2"><p className="ps-mono text-[10px] tracking-[0.2em] text-green-200">ROUND {idx + 1}/{session.length} {"//"} TAG {pair.tag.toUpperCase()}</p><p className="text-xs text-white/65">NEO prediction: {prediction}</p><div className="grid gap-2"><ArcadeGameButton color="#39ff14" label={pair.a} onClick={() => choose(pair.a)} /><ArcadeGameButton color="#39ff14" label={pair.b} onClick={() => choose(pair.b)} /></div></div>
}

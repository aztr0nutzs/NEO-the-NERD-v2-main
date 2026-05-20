"use client"

import { useMemo, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

type WordItem = { word: string; category: string; difficulty: "EASY" | "ADAPTIVE" | "HARD" }
const WORDS: WordItem[] = [
  { word: "ROBOT", category: "tech", difficulty: "EASY" }, { word: "NEON", category: "neo", difficulty: "EASY" }, { word: "ARCADE", category: "games", difficulty: "EASY" }, { word: "PIXEL", category: "games", difficulty: "EASY" },
  { word: "CYBER", category: "neo", difficulty: "ADAPTIVE" }, { word: "KERNEL", category: "tech", difficulty: "ADAPTIVE" }, { word: "MATRIX", category: "neo", difficulty: "ADAPTIVE" }, { word: "PRANK", category: "fun", difficulty: "ADAPTIVE" },
  { word: "ALGORITHM", category: "tech", difficulty: "HARD" }, { word: "HOLOGRAPHIC", category: "neo", difficulty: "HARD" }, { word: "TELEMETRY", category: "science", difficulty: "HARD" }, { word: "SYNTHESIS", category: "science", difficulty: "HARD" },
]
const roundsBy = { EASY: 4, ADAPTIVE: 5, HARD: 6 } as const

export function WordScrambleGame({ difficulty, update }: ArcadeGameComponentProps) {
  const session = useMemo(() => WORDS.filter((w) => w.difficulty === difficulty).sort(() => Math.random() - 0.5).slice(0, roundsBy[difficulty]), [difficulty])
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState("")
  const [score, setScore] = useState(0)
  const [hints, setHints] = useState(0)
  const [revealed, setRevealed] = useState(0)
  const item = session[idx]
  const scrambled = useMemo(() => item?.word.split("").sort(() => Math.random() - 0.5).join("") ?? "", [item])
  const done = idx >= session.length

  const submit = () => {
    const ok = answer.trim().toUpperCase() === item.word
    const gain = ok ? Math.max(1, 5 - hints - revealed) : 0
    setScore((s) => s + gain)
    update(ok ? "playing" : "playing", ok ? "Word decrypted." : `No lock. Correct word: ${item.word}.`, { score: gain, neoScore: ok ? 0 : 1 })
    const next = idx + 1
    setIdx(next)
    setAnswer("")
    setHints(0)
    setRevealed(0)
    if (next >= session.length) update(score + gain >= Math.ceil(session.length * 2.5) ? "win" : "lose", `SCRAMBLE SUMMARY // SCORE ${score + gain} // ROUNDS ${session.length}`, { score: score + gain, forceProgression: true })
  }

  if (done) return <p className="rounded-lg bg-black/40 px-3 py-2 ps-mono text-[10px] tracking-[0.2em] text-purple-200">SESSION COMPLETE // SCORE {score}</p>

  return <div className="space-y-2"><p className="ps-mono text-[10px] tracking-[0.2em] text-purple-200">WORD {idx + 1}/{session.length} {"//"} CAT {item.category.toUpperCase()} {"//"} SCORE {score}</p><p className="ps-heading text-2xl ps-text-purple">{scrambled}</p>{revealed > 0 && <p className="text-xs text-white/70">Reveal: {item.word.slice(0, revealed)}{"_".repeat(Math.max(0, item.word.length - revealed))}</p>}<div className="flex gap-2"><input value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none" style={{ boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.4)" }} /><ArcadeGameButton color="#b829ff" label="SOLVE" onClick={submit} /></div><div className="grid grid-cols-2 gap-2"><ArcadeGameButton color="#9f5eff" label="CATEGORY HINT" disabled={hints > 0} onClick={() => { setHints(1); update("playing", `Hint: category is ${item.category}.`) }} /><ArcadeGameButton color="#c57dff" label="REVEAL LETTER" disabled={revealed >= Math.max(1, item.word.length - 2)} onClick={() => { const next = revealed + 1; setRevealed(next); update("playing", `Letter reveal used (${next}).`) }} /></div></div>
}

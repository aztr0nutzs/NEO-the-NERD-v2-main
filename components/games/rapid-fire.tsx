"use client"

import { useEffect, useMemo, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

type RF = { q: string; a: string; difficulty: "EASY" | "ADAPTIVE" | "HARD" }
const BANK: RF[] = [
  { q: "5 + 4", a: "9", difficulty: "EASY" }, { q: "NEO primary glow color", a: "CYAN", difficulty: "EASY" }, { q: "Opposite of win", a: "LOSE", difficulty: "EASY" },
  { q: "12 - 7", a: "5", difficulty: "ADAPTIVE" }, { q: "Binary of 3", a: "11", difficulty: "ADAPTIVE" }, { q: "React UI is built from", a: "COMPONENTS", difficulty: "ADAPTIVE" },
  { q: "9 * 7", a: "63", difficulty: "HARD" }, { q: "O(log n) is typically", a: "BINARY SEARCH", difficulty: "HARD" }, { q: "HTTP secure variant", a: "HTTPS", difficulty: "HARD" },
]

export function RapidFireGame({ difficulty, update }: ArcadeGameComponentProps) {
  const duration = difficulty === "HARD" ? 25 : difficulty === "ADAPTIVE" ? 35 : 45
  const pool = useMemo(() => BANK.filter((b) => b.difficulty === difficulty).sort(() => Math.random() - 0.5), [difficulty])
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState("")
  const [time, setTime] = useState(duration)
  const [score, setScore] = useState(0)
  const [correctStreak, setCorrectStreak] = useState(0)
  const [wrong, setWrong] = useState(0)

  useEffect(() => { const id = setInterval(() => setTime((t) => Math.max(0, t - 1)), 1000); return () => clearInterval(id) }, [])
  const item = pool[idx % pool.length]
  const done = time === 0

  const fire = () => {
    if (done) return
    const ok = answer.trim().toUpperCase() === item.a
    const nextStreak = ok ? correctStreak + 1 : 0
    setCorrectStreak(nextStreak)
    const gain = ok ? 1 + Math.min(2, nextStreak) : 0
    setScore((s) => s + gain)
    if (!ok) setWrong((w) => w + 1)
    update("playing", ok ? `Rapid hit. Streak ${nextStreak}.` : `Missed. ${item.a}.`, { score: gain, neoScore: ok ? 0 : 1, streak: nextStreak })
    setIdx((i) => i + 1)
    setAnswer("")
  }

  useEffect(() => {
    if (!done) return
    update(score >= 8 ? "win" : "lose", `RAPID SUMMARY // SCORE ${score} // WRONG ${wrong} // BEST_STREAK ${correctStreak}`, { score, streak: correctStreak, forceProgression: true })
  }, [correctStreak, done, score, update, wrong])

  return <div className="space-y-2"><p className="ps-mono text-[10px] tracking-[0.2em] text-orange-200">TIME {time}s {"//"} SCORE {score} {"//"} STREAK {correctStreak}</p><p className="text-sm text-white/90">{done ? "SESSION COMPLETE" : item.q}</p><div className="flex gap-2"><input value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none" style={{ boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.4)" }} /><ArcadeGameButton color="#ff7a00" label={done ? "COMPLETE" : "FIRE"} onClick={fire} disabled={done} /></div></div>
}

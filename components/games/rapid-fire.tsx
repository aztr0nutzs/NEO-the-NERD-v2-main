"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
import { RAPID_FIRE_BANK, matchRapidAnswer } from "@/lib/games/banks/rapid-fire"

const durationBy = { EASY: 45, ADAPTIVE: 35, HARD: 25 } as const

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function RapidFireGame({ difficulty, update }: ArcadeGameComponentProps) {
  const duration = durationBy[difficulty]
  const pool = useMemo(
    () => shuffle(RAPID_FIRE_BANK.filter((b) => b.difficulty === difficulty)),
    [difficulty],
  )
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState("")
  const [time, setTime] = useState<number>(duration)
  const [score, setScore] = useState(0)
  const [correctStreak, setCorrectStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrong, setWrong] = useState(0)
  const recordedRef = useRef(false)

  const item = pool[idx % pool.length]
  const done = time === 0

  useEffect(() => {
    if (done) return
    const id = setInterval(() => setTime((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [done])

  const fire = () => {
    if (done || !item) return
    const ok = matchRapidAnswer(item.a, answer)
    const nextStreak = ok ? correctStreak + 1 : 0
    const newBest = Math.max(bestStreak, nextStreak)
    setCorrectStreak(nextStreak)
    setBestStreak(newBest)
    const gain = ok ? 1 + Math.min(2, correctStreak) : 0
    setScore((s) => s + gain)
    if (ok) setCorrectCount((c) => c + 1)
    else setWrong((w) => w + 1)
    update("playing", ok ? `Hit · streak ${nextStreak}.` : `Missed. ${item.a}.`, {
      score: gain,
      neoScore: ok ? 0 : 1,
      streak: nextStreak,
    })
    setIdx((i) => i + 1)
    setAnswer("")
  }

  useEffect(() => {
    if (!done || recordedRef.current) return
    recordedRef.current = true
    const target = difficulty === "HARD" ? 6 : difficulty === "ADAPTIVE" ? 8 : 10
    const result = score >= target ? "win" : "lose"
    const acc = correctCount + wrong === 0 ? 0 : Math.round((correctCount / (correctCount + wrong)) * 100)
    update(
      result,
      `RAPID SUMMARY · SCORE ${score} · ${correctCount} HIT / ${wrong} MISS · ACC ${acc}% · BEST STREAK ${bestStreak}`,
      { score, streak: bestStreak, forceProgression: true },
    )
  }, [bestStreak, correctCount, difficulty, done, score, update, wrong])

  const progress = (time / duration) * 100

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 ps-mono text-[10px] tracking-[0.2em] text-orange-200">
        <p>TIME {time}S</p>
        <p className="text-center">SCORE {score}</p>
        <p className="text-right">STREAK {correctStreak}</p>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${progress}%`,
            background: time <= 5 ? "linear-gradient(90deg,#ff2d9c,#ff7a00)" : "linear-gradient(90deg,#ff7a00,#39ff14)",
          }}
        />
      </div>
      {done ? (
        <div className="rounded-lg bg-black/50 px-3 py-2 space-y-1">
          <p className="ps-mono text-[11px] tracking-[0.25em] text-orange-200">SESSION COMPLETE</p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/65">
            SCORE {score} · {correctCount} HIT / {wrong} MISS · BEST STREAK {bestStreak} · {difficulty}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-white/90">{item?.q}</p>
          <div className="flex gap-2">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") fire() }}
              autoFocus
              placeholder="ANSWER…"
              className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none ps-mono uppercase"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.4)" }}
            />
            <ArcadeGameButton color="#ff7a00" label="FIRE" onClick={fire} />
          </div>
          <button
            type="button"
            onClick={() => {
              setWrong((w) => w + 1)
              setCorrectStreak(0)
              update("playing", `Skipped. ${item.a}.`, { neoScore: 1 })
              setIdx((i) => i + 1)
              setAnswer("")
            }}
            className="w-full rounded-lg py-1.5 ps-mono text-[10px] tracking-[0.25em] text-white/55"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}
          >
            SKIP (-STREAK)
          </button>
        </>
      )}
    </div>
  )
}

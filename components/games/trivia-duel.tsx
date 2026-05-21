"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
import { TRIVIA_BANK } from "@/lib/games/banks/trivia"

const roundsByDiff = { EASY: 6, ADAPTIVE: 8, HARD: 10 } as const
const timeByDiff = { EASY: 16, ADAPTIVE: 13, HARD: 10 } as const

const CORRECT_LINES = [
  "Neural lock achieved.",
  "Confirmed. NEO logs a hit.",
  "Snap call. NEO updates the threat ladder.",
]
const WRONG_LINES = [
  "Missed.",
  "Negative match.",
  "Pattern broke.",
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function TriviaDuelGame({ difficulty, update }: ArcadeGameComponentProps) {
  const rounds = roundsByDiff[difficulty]
  const timePerQ = timeByDiff[difficulty]

  const pool = useMemo(
    () => shuffle(TRIVIA_BANK.filter((q) => q.difficulty === difficulty)).slice(0, rounds),
    [difficulty, rounds],
  )
  // freeze option order per question once
  const optionsByIdx = useMemo(() => pool.map((q) => shuffle(q.o)), [pool])

  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [left, setLeft] = useState<number>(timePerQ)
  const recordedRef = useRef(false)

  const current = pool[idx]
  const done = idx >= pool.length

  const step = useCallback(
    (ok: boolean, timeout = false) => {
      if (done || !current) return
      const nextCorrect = ok ? correct + 1 : correct
      const nextStreak = ok ? streak + 1 : 0
      const newBest = Math.max(bestStreak, nextStreak)
      setCorrect(nextCorrect)
      setStreak(nextStreak)
      setBestStreak(newBest)
      const nextIdx = idx + 1
      const isLast = nextIdx >= pool.length

      if (isLast) {
        if (!recordedRef.current) {
          recordedRef.current = true
          const acc = Math.round((nextCorrect / pool.length) * 100)
          const medal = acc >= 90 ? "S" : acc >= 75 ? "A" : acc >= 60 ? "B" : "C"
          const result = nextCorrect >= Math.ceil(pool.length / 2) ? "win" : "lose"
          update(
            result,
            `DUEL SUMMARY · ${nextCorrect}/${pool.length} · ACC ${acc}% · STREAK ${newBest} · MEDAL ${medal}`,
            { score: nextCorrect, streak: newBest, forceProgression: true },
          )
        }
      } else {
        const tail = timeout ? "Timer expired." : ok ? pick(CORRECT_LINES) : `${pick(WRONG_LINES)} Answer: ${current.a}.`
        update("playing", tail, { score: ok ? 1 : 0, neoScore: ok ? 0 : 1, streak: nextStreak })
      }

      setIdx(nextIdx)
      setLeft(timePerQ)
    },
    [bestStreak, correct, current, done, idx, pool.length, streak, timePerQ, update],
  )

  useEffect(() => {
    if (done) return
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (!done && left === 0) step(false, true)
  }, [done, left, step])

  if (done) {
    const acc = pool.length ? Math.round((correct / pool.length) * 100) : 0
    const medal = acc >= 90 ? "S" : acc >= 75 ? "A" : acc >= 60 ? "B" : "C"
    return (
      <div className="rounded-lg bg-black/50 p-3 space-y-1">
        <p className="ps-mono text-[11px] tracking-[0.25em] text-cyan-200">DUEL COMPLETE · MEDAL {medal}</p>
        <p className="ps-mono text-[9px] tracking-[0.2em] text-white/65">
          SCORE {correct}/{pool.length} · ACC {acc}% · BEST STREAK {bestStreak} · {difficulty}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="ps-mono text-[10px] tracking-[0.2em] text-cyan-200">
        Q {idx + 1}/{pool.length} · CAT {current.category.toUpperCase()} · T-{left}S · STREAK {streak}
      </p>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${(left / timePerQ) * 100}%`,
            background: left <= 3 ? "linear-gradient(90deg,#ff2d9c,#ff7a00)" : "linear-gradient(90deg,#00f0ff,#39ff14)",
          }}
        />
      </div>
      <p className="text-sm text-white/90">{current.q}</p>
      <div className="grid gap-2">
        {optionsByIdx[idx]?.map((o) => (
          <ArcadeGameButton key={o} color="#00f0ff" label={o} onClick={() => step(o === current.a)} />
        ))}
      </div>
    </div>
  )
}

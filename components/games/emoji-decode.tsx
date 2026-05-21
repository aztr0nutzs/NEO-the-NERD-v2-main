"use client"

import { motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
import { EMOJI_BANK } from "@/lib/games/banks/emoji"

const roundsBy = { EASY: 4, ADAPTIVE: 5, HARD: 6 } as const
const timeBy = { EASY: 14, ADAPTIVE: 12, HARD: 10 } as const

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function EmojiDecodeGame({ difficulty, update }: ArcadeGameComponentProps) {
  const rounds = roundsBy[difficulty]
  const timePerQ = timeBy[difficulty]
  const session = useMemo(
    () => shuffle(EMOJI_BANK.filter((x) => x.difficulty === difficulty)).slice(0, rounds),
    [difficulty, rounds],
  )
  const optionsByIdx = useMemo(() => session.map((q) => shuffle(q.o)), [session])

  const [idx, setIdx] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [lastPick, setLastPick] = useState<{ ok: boolean; expected: string } | null>(null)
  const [reveal, setReveal] = useState<string | null>(null)
  const [left, setLeft] = useState<number>(timePerQ)
  const recordedRef = useRef(false)
  const advanceTimer = useRef<number | null>(null)

  const item = session[idx]
  const done = idx >= session.length

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
  }, [])

  useEffect(() => {
    if (done) return
    setLeft(timePerQ)
    setLastPick(null)
    setReveal(null)
  }, [idx, timePerQ, done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [done, idx])

  const finalize = (nextScore: number, nextBestCombo: number) => {
    if (recordedRef.current) return
    recordedRef.current = true
    const result = nextScore >= Math.ceil(session.length * 1.5) ? "win" : "lose"
    update(
      result,
      `EMOJI SUMMARY · SCORE ${nextScore} · BEST COMBO ${nextBestCombo} · ${difficulty}`,
      { score: nextScore, streak: nextBestCombo, forceProgression: true },
    )
  }

  const choose = (o: string) => {
    if (!item || lastPick) return
    const ok = o === item.a
    const nextCombo = ok ? combo + 1 : 0
    const newBest = Math.max(bestCombo, nextCombo)
    const gain = ok ? 1 + Math.min(2, combo) : 0
    const nextScore = score + gain

    setCombo(nextCombo)
    setBestCombo(newBest)
    setScore(nextScore)
    setLastPick({ ok, expected: item.a })
    setReveal(item.reveal)

    const next = idx + 1
    const isLast = next >= session.length

    if (!isLast) {
      update("playing", ok ? `Decoded · combo ${nextCombo}.` : `Decode miss. ${item.reveal}`, {
        score: gain,
        neoScore: ok ? 0 : 1,
        streak: nextCombo,
      })
    }

    advanceTimer.current = window.setTimeout(() => {
      if (isLast) finalize(nextScore, newBest)
      setIdx(next)
    }, 900)
  }

  const handleTimeout = () => {
    if (!item || lastPick) return
    setLastPick({ ok: false, expected: item.a })
    setReveal(item.reveal)
    setCombo(0)
    const next = idx + 1
    const isLast = next >= session.length
    if (!isLast) update("playing", `Time out. Answer: ${item.a}.`, { neoScore: 1 })
    advanceTimer.current = window.setTimeout(() => {
      if (isLast) finalize(score, bestCombo)
      setIdx(next)
    }, 900)
  }

  useEffect(() => {
    if (done) return
    if (left === 0 && !lastPick) handleTimeout()
  }, [left, done, lastPick]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    return (
      <div className="rounded-lg bg-black/50 p-3 space-y-1">
        <p className="ps-mono text-[11px] tracking-[0.25em] text-pink-200">DECODE COMPLETE</p>
        <p className="ps-mono text-[9px] tracking-[0.2em] text-white/65">
          SCORE {score} · BEST COMBO {bestCombo} · {difficulty}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="ps-mono text-[10px] tracking-[0.2em] text-pink-200">
        ROUND {idx + 1}/{session.length} · CAT {item.category.toUpperCase()} · T-{left}S · COMBO {combo}
      </p>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${(left / timePerQ) * 100}%`,
            background: left <= 3 ? "linear-gradient(90deg,#ff2d9c,#ff7a00)" : "linear-gradient(90deg,#ff2d9c,#b829ff)",
          }}
        />
      </div>
      <motion.p key={idx} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl text-center">
        {item.q}
      </motion.p>
      <div className="grid gap-2">
        {optionsByIdx[idx]?.map((o) => {
          const isExpected = lastPick && o === lastPick.expected
          const wasPicked = lastPick && !lastPick.ok && o !== lastPick.expected
          const color = isExpected ? "#39ff14" : wasPicked ? "#ff2d9c" : "#ff2d9c"
          return (
            <ArcadeGameButton
              key={o}
              color={color}
              label={o}
              disabled={Boolean(lastPick)}
              onClick={() => choose(o)}
            />
          )
        })}
      </div>
      {reveal && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-black/40 px-3 py-2 ps-mono text-[10px] tracking-[0.2em]"
          style={{ color: lastPick?.ok ? "#9bff8f" : "#ffb1df" }}
        >
          {lastPick?.ok ? "DECODED · " : "MISS · "}{reveal}
        </motion.p>
      )}
    </div>
  )
}

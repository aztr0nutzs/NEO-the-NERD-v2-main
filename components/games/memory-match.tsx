"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
import { quip } from "@/lib/games/quips"

const ICONS = ["⚡", "◆", "▲", "●", "★", "✚", "◇", "☽"]
const pairsFor = (d: ArcadeGameComponentProps["difficulty"]) =>
  d === "HARD" ? 8 : d === "ADAPTIVE" ? 6 : 4

const GRADE_TIME_MS: Record<ArcadeGameComponentProps["difficulty"], number> = {
  EASY: 25000,
  ADAPTIVE: 50000,
  HARD: 90000,
}

export function MemoryMatchGame({ difficulty, update }: ArcadeGameComponentProps) {
  const pairCount = pairsFor(difficulty)
  const [deck, setDeck] = useState<string[]>([])
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [startAt, setStartAt] = useState<number | null>(null)
  const [timeMs, setTimeMs] = useState(0)
  const recordedRef = useRef(false)

  useEffect(() => {
    const p = ICONS.slice(0, pairCount)
    setDeck([...p, ...p].sort(() => Math.random() - 0.5))
    setOpen([])
    setMatched([])
    setMoves(0)
    setStartAt(Date.now())
    setTimeMs(0)
    recordedRef.current = false
  }, [pairCount])

  useEffect(() => {
    if (!startAt || matched.length === deck.length) return
    const id = setInterval(() => setTimeMs(Date.now() - startAt), 200)
    return () => clearInterval(id)
  }, [startAt, matched.length, deck.length])

  const accuracy = useMemo(
    () => (moves === 0 ? 100 : Math.round(((matched.length / 2) / moves) * 100)),
    [matched.length, moves],
  )

  const timeBudget = GRADE_TIME_MS[difficulty]
  const grade = useMemo(() => {
    if (accuracy >= 90 && timeMs < timeBudget) return "S"
    if (accuracy >= 75 && timeMs < timeBudget * 1.5) return "A"
    if (accuracy >= 60) return "B"
    return "C"
  }, [accuracy, timeMs, timeBudget])

  const complete = deck.length > 0 && matched.length === deck.length

  const pick = (i: number) => {
    if (open.length === 2 || open.includes(i) || matched.includes(i) || complete) return
    const nextOpen = [...open, i]
    setOpen(nextOpen)

    if (nextOpen.length !== 2) return
    setMoves((m) => m + 1)
    const ok = deck[nextOpen[0]] === deck[nextOpen[1]]

    setTimeout(() => {
      if (ok) {
        const all = [...matched, ...nextOpen]
        setMatched(all)
        if (all.length === deck.length && !recordedRef.current) {
          recordedRef.current = true
          const seconds = Math.ceil(timeMs / 1000)
          update(
            "win",
            `${quip("memory", "win")} // ${seconds}s · ACC ${accuracy}% · GRADE ${grade}`,
            {
              score: Math.max(1, 100 - moves),
              completionTimeMs: timeMs,
              forceProgression: true,
            },
          )
        } else {
          update("playing", "Pair locked.")
        }
      } else {
        update("playing", quip("memory", "lose"))
      }
      setOpen([])
    }, 600)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 text-[10px] ps-mono tracking-[0.2em] text-white/75">
        <p>MOVES {moves}</p>
        <p>TIME {Math.ceil(timeMs / 1000)}S</p>
        <p>ACC {accuracy}%</p>
        <p className="text-right">PAIRS {matched.length / 2}/{pairCount}</p>
      </div>
      <div className={pairCount >= 8 ? "grid grid-cols-4 gap-2" : "grid grid-cols-4 gap-2"}>
        {deck.map((v, i) => (
          <ArcadeGameButton
            key={`${v}-${i}`}
            color="#b829ff"
            label={open.includes(i) || matched.includes(i) ? v : "?"}
            onClick={() => pick(i)}
          />
        ))}
      </div>
      {complete && (
        <div className="rounded-lg bg-black/50 px-3 py-2 space-y-1">
          <p className="ps-mono text-[11px] tracking-[0.25em] text-white/85">GRID CLEARED · GRADE {grade}</p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/60">{Math.ceil(timeMs / 1000)}S · {moves} MOVES · ACC {accuracy}% · {difficulty}</p>
        </div>
      )}
    </div>
  )
}

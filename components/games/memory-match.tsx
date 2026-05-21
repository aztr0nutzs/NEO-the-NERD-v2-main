"use client"

import { useEffect, useMemo, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

const ICONS = ["⚡", "◆", "▲", "●", "★", "✚", "◇", "☽"]
const pairsFor = (d: ArcadeGameComponentProps["difficulty"]) =>
  d === "HARD" ? 8 : d === "ADAPTIVE" ? 6 : 4

export function MemoryMatchGame({ difficulty, update }: ArcadeGameComponentProps) {
  const pairCount = pairsFor(difficulty)
  const [deck, setDeck] = useState<string[]>([])
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [startAt, setStartAt] = useState<number | null>(null)
  const [timeMs, setTimeMs] = useState(0)

  useEffect(() => {
    const p = ICONS.slice(0, pairCount)
    setDeck([...p, ...p].sort(() => Math.random() - 0.5))
    setOpen([])
    setMatched([])
    setMoves(0)
    setStartAt(Date.now())
    setTimeMs(0)
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

  const grade = useMemo(() => {
    if (accuracy > 85 && timeMs < 45000) return "S"
    if (accuracy > 70) return "A"
    if (accuracy > 55) return "B"
    return "C"
  }, [accuracy, timeMs])

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
        if (all.length === deck.length) {
          update(
            "win",
            `Grid cleared in ${Math.ceil(timeMs / 1000)}s // ACC ${accuracy}% // GRADE ${grade}`,
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
        update("playing", "Mismatch. Pattern drift detected.")
      }
      setOpen([])
    }, 600)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-[10px] ps-mono tracking-[0.2em] text-white/75">
        <p>MOVES {moves}</p>
        <p>TIME {Math.ceil(timeMs / 1000)}S</p>
        <p>ACC {accuracy}%</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
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
        <div className="rounded-lg bg-black/50 px-3 py-2 ps-mono text-[10px] tracking-[0.2em] text-white/80">
          COMPLETION {"//"} GRADE {grade} {"//"} {Math.ceil(timeMs / 1000)}S {"//"} ACC {accuracy}%
        </div>
      )}
    </div>
  )
}

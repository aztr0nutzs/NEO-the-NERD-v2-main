"use client"

import { motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

const PAD_COLORS = ["#00f0ff", "#39ff14", "#ff2d9c", "#ff7a00", "#b829ff", "#ffd000"]

const CONFIG = {
  EASY:     { pads: 4, flashMs: 700, gapMs: 220 },
  ADAPTIVE: { pads: 5, flashMs: 500, gapMs: 180 },
  HARD:     { pads: 6, flashMs: 350, gapMs: 130 },
} as const

type Phase = "idle" | "playback" | "input" | "summary"

export function SignalSequenceGame({ difficulty, update }: ArcadeGameComponentProps) {
  const { pads, flashMs, gapMs } = CONFIG[difficulty]

  const [sequence, setSequence] = useState<number[]>([])
  const [phase, setPhase] = useState<Phase>("idle")
  const [flashing, setFlashing] = useState<number | null>(null)
  const [inputIdx, setInputIdx] = useState(0)
  const [round, setRound] = useState(0)
  const [highestRound, setHighestRound] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const recordedRef = useRef(false)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const playBack = useCallback((seq: number[]) => {
    clearTimers()
    setPhase("playback")
    setFlashing(null)
    let acc = 200
    for (let i = 0; i < seq.length; i++) {
      const idx = seq[i]
      const onAt = acc
      const offAt = acc + flashMs
      timers.current.push(window.setTimeout(() => setFlashing(idx), onAt))
      timers.current.push(window.setTimeout(() => setFlashing(null), offAt))
      acc = offAt + gapMs
    }
    timers.current.push(window.setTimeout(() => {
      setPhase("input")
      setInputIdx(0)
    }, acc))
  }, [clearTimers, flashMs, gapMs])

  const startRun = () => {
    if (recordedRef.current) recordedRef.current = false
    const first = Math.floor(Math.random() * pads)
    setSequence([first])
    setRound(1)
    setHighestRound(0)
    setMistakes(0)
    setPhase("playback")
    playBack([first])
  }

  const advance = () => {
    const next = Math.floor(Math.random() * pads)
    const nextSeq = [...sequence, next]
    setSequence(nextSeq)
    setRound(nextSeq.length)
    setHighestRound((h) => Math.max(h, nextSeq.length))
    playBack(nextSeq)
  }

  const failRun = (reachedRound: number) => {
    clearTimers()
    setPhase("summary")
    if (!recordedRef.current) {
      recordedRef.current = true
      const finalHighest = Math.max(highestRound, reachedRound)
      const result = finalHighest >= (difficulty === "HARD" ? 6 : difficulty === "ADAPTIVE" ? 8 : 10) ? "win" : "lose"
      update(
        result,
        `SIGNAL OUT · ROUND ${finalHighest} · MISTAKES ${mistakes + 1} · ${difficulty}`,
        { score: finalHighest, streak: finalHighest, forceProgression: true },
      )
    }
  }

  const tapPad = (idx: number) => {
    if (phase !== "input") return
    const expected = sequence[inputIdx]
    if (idx !== expected) {
      setMistakes((m) => m + 1)
      failRun(round - 1)
      return
    }
    const nextInput = inputIdx + 1
    if (nextInput >= sequence.length) {
      // round cleared
      update("playing", `Round ${round} clean.`, { score: 1 })
      const t = window.setTimeout(() => advance(), 350)
      timers.current.push(t)
      setInputIdx(nextInput)
    } else {
      setInputIdx(nextInput)
    }
  }

  return (
    <div className="space-y-2">
      <p className="ps-mono text-[10px] tracking-[0.2em] text-cyan-200">
        ROUND {round} · BEST {highestRound} · MISTAKES {mistakes} · PADS {pads}
      </p>
      <p className="ps-mono text-[10px] tracking-[0.2em]" style={{
        color: phase === "playback" ? "#00f0ff" : phase === "input" ? "#39ff14" : "rgba(255,255,255,0.5)",
      }}>
        {phase === "idle" && "PRESS START · WATCH THE PATTERN"}
        {phase === "playback" && "WATCHING SIGNAL…"}
        {phase === "input" && `REPEAT ${inputIdx + 1}/${sequence.length}`}
        {phase === "summary" && "RUN ENDED"}
      </p>

      <div className={`grid gap-2 ${pads <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
        {Array.from({ length: pads }).map((_, i) => {
          const c = PAD_COLORS[i % PAD_COLORS.length]
          const lit = flashing === i
          const disabled = phase !== "input"
          return (
            <motion.button
              key={i}
              type="button"
              disabled={disabled}
              animate={{ scale: lit ? 1.05 : 1 }}
              transition={{ duration: 0.12 }}
              onClick={() => tapPad(i)}
              className="aspect-square rounded-xl"
              style={{
                background: lit ? `${c}` : `${c}22`,
                boxShadow: lit
                  ? `inset 0 0 0 1px ${c}, 0 0 30px ${c}, 0 0 60px ${c}88`
                  : `inset 0 0 0 1px ${c}66`,
                opacity: disabled && !lit ? 0.7 : 1,
                transition: "background 80ms, box-shadow 80ms",
              }}
              aria-label={`Pad ${i + 1}`}
            />
          )
        })}
      </div>

      {phase === "idle" && (
        <ArcadeGameButton color="#00f0ff" label="START SIGNAL" onClick={startRun} />
      )}

      {phase === "summary" && (
        <div className="rounded-lg bg-black/55 px-3 py-2 space-y-2">
          <p className="ps-mono text-[11px] tracking-[0.25em]" style={{ color: "#00f0ff" }}>SIGNAL TERMINATED</p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/60">
            HIGHEST ROUND {highestRound} · MISTAKES {mistakes} · PADS {pads} · {difficulty}
          </p>
          <button
            type="button"
            onClick={startRun}
            className="w-full rounded-lg py-2 ps-mono text-[11px] tracking-[0.25em]"
            style={{ background: "rgba(0,240,255,0.16)", color: "#00f0ff", boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.5)" }}
          >
            NEW SIGNAL
          </button>
        </div>
      )}
    </div>
  )
}

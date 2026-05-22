"use client"

import { motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

const SYMBOLS = ["⚡", "◆", "▲", "●", "★", "✚"]
const SYMBOL_COLORS = ["#39ff14", "#00f0ff", "#ff2d9c", "#ff7a00", "#b829ff", "#ffd000"]

const CONFIG = {
  EASY: { slots: 3, symbolCount: 4, attempts: 10 },
  ADAPTIVE: { slots: 4, symbolCount: 5, attempts: 10 },
  HARD: { slots: 5, symbolCount: 6, attempts: 12 },
} as const

type Feedback = { exact: number; partial: number }

function score(guess: number[], code: number[]): Feedback {
  let exact = 0
  const codeRemaining: number[] = []
  const guessRemaining: number[] = []
  for (let i = 0; i < code.length; i++) {
    if (guess[i] === code[i]) exact++
    else { codeRemaining.push(code[i]); guessRemaining.push(guess[i]) }
  }
  let partial = 0
  for (const g of guessRemaining) {
    const at = codeRemaining.indexOf(g)
    if (at !== -1) { partial++; codeRemaining.splice(at, 1) }
  }
  return { exact, partial }
}

function generateCode(slots: number, symbolCount: number): number[] {
  const code: number[] = []
  for (let i = 0; i < slots; i++) code.push(Math.floor(Math.random() * symbolCount))
  return code
}

export function NeonCodebreakerGame({ difficulty, update }: ArcadeGameComponentProps) {
  const { slots, symbolCount, attempts } = CONFIG[difficulty]
  const [code, setCode] = useState<number[]>(() => generateCode(slots, symbolCount))
  const [current, setCurrent] = useState<(number | null)[]>(() => Array(slots).fill(null))
  const [history, setHistory] = useState<{ guess: number[]; fb: Feedback }[]>([])
  const [phase, setPhase] = useState<"playing" | "won" | "lost">("playing")
  const [startAt] = useState<number>(() => Date.now())
  const [endMs, setEndMs] = useState<number | null>(null)
  const recordedRef = useRef(false)

  const used = history.length
  const left = attempts - used
  const filled = current.every((v) => v !== null)
  const symbols = SYMBOLS.slice(0, symbolCount)

  const setSlot = (slotIdx: number, sym: number | null) => {
    if (phase !== "playing") return
    setCurrent((c) => c.map((v, i) => (i === slotIdx ? sym : v)))
  }

  const clearCurrent = () => {
    if (phase !== "playing") return
    setCurrent(Array(slots).fill(null))
  }

  const submit = () => {
    if (phase !== "playing" || !filled) return
    const guess = current as number[]
    const fb = score(guess, code)
    const nextHistory = [...history, { guess, fb }]
    setHistory(nextHistory)
    setCurrent(Array(slots).fill(null))

    if (fb.exact === slots) {
      const ms = Date.now() - startAt
      setEndMs(ms)
      setPhase("won")
      if (!recordedRef.current) {
        recordedRef.current = true
        update(
          "win",
          `CODE BROKEN · ${nextHistory.length}/${attempts} · ${Math.ceil(ms / 1000)}S · ${difficulty}`,
          { score: Math.max(1, (attempts - nextHistory.length + 1) * 5), completionTimeMs: ms, forceProgression: true },
        )
      }
    } else if (nextHistory.length >= attempts) {
      const ms = Date.now() - startAt
      setEndMs(ms)
      setPhase("lost")
      if (!recordedRef.current) {
        recordedRef.current = true
        update(
          "lose",
          `CODE LOCKED · OUT OF ATTEMPTS · TARGET REVEALED · ${difficulty}`,
          { neoScore: 1, forceProgression: true },
        )
      }
    } else {
      update("playing", `Feedback · ${fb.exact} exact · ${fb.partial} partial`, { score: fb.exact, neoScore: 0 })
    }
  }

  const newRound = () => {
    setCode(generateCode(slots, symbolCount))
    setCurrent(Array(slots).fill(null))
    setHistory([])
    setPhase("playing")
    setEndMs(null)
    recordedRef.current = false
  }

  return (
    <div className="space-y-2">
      <p className="ps-mono text-[10px] tracking-[0.2em] text-green-200">
        SLOTS {slots} · SYMBOLS {symbolCount} · ATTEMPTS {left}/{attempts}
      </p>

      <div className="grid gap-1 max-h-[180px] overflow-y-auto pr-1">
        {history.length === 0 && (
          <p className="ps-mono text-[10px] tracking-[0.2em] text-white/35">Submit a guess to begin scanning.</p>
        )}
        {history.map((h, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md bg-black/40 px-2 py-1"
            style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.2)" }}
          >
            <div className="flex gap-1">
              {h.guess.map((g, gi) => (
                <span key={gi} className="text-base" style={{ color: SYMBOL_COLORS[g], textShadow: `0 0 6px ${SYMBOL_COLORS[g]}` }}>
                  {SYMBOLS[g]}
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: h.fb.exact }).map((_, k) => (
                <span key={`e${k}`} className="h-2.5 w-2.5 rounded-full" style={{ background: "#39ff14", boxShadow: "0 0 6px #39ff14" }} />
              ))}
              {Array.from({ length: h.fb.partial }).map((_, k) => (
                <span key={`p${k}`} className="h-2.5 w-2.5 rounded-full" style={{ background: "transparent", boxShadow: "inset 0 0 0 1px #ffd000, 0 0 6px rgba(255,208,0,0.4)" }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {phase === "playing" ? (
        <>
          <div className="flex gap-2 justify-center">
            {current.map((sym, i) => (
              <motion.div
                key={i}
                animate={{ scale: sym !== null ? [1, 1.08, 1] : 1 }}
                transition={{ duration: 0.2 }}
                className="grid h-12 w-12 place-items-center rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  boxShadow: sym !== null ? `inset 0 0 0 1px ${SYMBOL_COLORS[sym]}, 0 0 10px ${SYMBOL_COLORS[sym]}55` : "inset 0 0 0 1px rgba(57,255,20,0.35)",
                  color: sym !== null ? SYMBOL_COLORS[sym] : "rgba(255,255,255,0.3)",
                  textShadow: sym !== null ? `0 0 8px ${SYMBOL_COLORS[sym]}` : "none",
                }}
                onClick={() => setSlot(i, null)}
              >
                <span className="text-xl">{sym !== null ? SYMBOLS[sym] : "·"}</span>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {symbols.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  const empty = current.findIndex((v) => v === null)
                  if (empty !== -1) setSlot(empty, i)
                }}
                className="grid h-10 place-items-center rounded-lg ps-mono text-xl"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  color: SYMBOL_COLORS[i],
                  boxShadow: `inset 0 0 0 1px ${SYMBOL_COLORS[i]}55, 0 0 8px ${SYMBOL_COLORS[i]}22`,
                  textShadow: `0 0 6px ${SYMBOL_COLORS[i]}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ArcadeGameButton color="#ffd000" label="CLEAR" onClick={clearCurrent} disabled={current.every((v) => v === null)} />
            <ArcadeGameButton color="#39ff14" label="SUBMIT" onClick={submit} disabled={!filled} />
          </div>
        </>
      ) : (
        <div className="rounded-lg bg-black/55 px-3 py-2 space-y-2">
          <p className="ps-mono text-[11px] tracking-[0.25em]" style={{ color: phase === "won" ? "#39ff14" : "#ff2d9c" }}>
            {phase === "won" ? "CODE BROKEN" : "OUT OF ATTEMPTS"}
          </p>
          <div className="flex items-center gap-2">
            <span className="ps-mono text-[9px] tracking-[0.2em] text-white/55">TARGET</span>
            {code.map((c, i) => (
              <span key={i} className="text-base" style={{ color: SYMBOL_COLORS[c], textShadow: `0 0 8px ${SYMBOL_COLORS[c]}` }}>
                {SYMBOLS[c]}
              </span>
            ))}
          </div>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/60">
            ATTEMPTS {used}/{attempts} · TIME {endMs != null ? Math.ceil(endMs / 1000) : 0}S · {difficulty}
          </p>
          <button
            type="button"
            onClick={newRound}
            className="w-full rounded-lg py-2 ps-mono text-[11px] tracking-[0.25em]"
            style={{ background: "rgba(57,255,20,0.16)", color: "#39ff14", boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.5)" }}
          >
            NEW CODE
          </button>
        </div>
      )}
    </div>
  )
}

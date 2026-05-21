"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
import { REACTION_RATINGS, quip } from "@/lib/games/quips"

const delayFor = (d: ArcadeGameComponentProps["difficulty"]) =>
  d === "HARD" ? 1400 + Math.random() * 1800
  : d === "ADAPTIVE" ? 1200 + Math.random() * 1600
  : 900 + Math.random() * 1300

const threshold = (d: ArcadeGameComponentProps["difficulty"]) =>
  d === "HARD" ? 320 : d === "ADAPTIVE" ? 430 : 560

const feintChance = (d: ArcadeGameComponentProps["difficulty"]) =>
  d === "HARD" ? 0.18 : d === "ADAPTIVE" ? 0.1 : 0.05

export function ReactionTapGame({ difficulty, update }: ArcadeGameComponentProps) {
  const [armed, setArmed] = useState(false)
  const [ready, setReady] = useState(false)
  const [feint, setFeint] = useState(false)
  const [started, setStarted] = useState(0)
  const [round, setRound] = useState(1)
  const [times, setTimes] = useState<number[]>([])
  const [falseStarts, setFalseStarts] = useState(0)
  const totalRounds = 5
  const done = round > totalRounds
  const armTimer = useRef<number | null>(null)
  const feintTimer = useRef<number | null>(null)
  const recordedRef = useRef(false)

  const avg = useMemo(() => times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0, [times])
  const fastest = useMemo(() => times.length ? Math.min(...times) : 0, [times])
  const rating = REACTION_RATINGS(avg)

  useEffect(() => () => {
    if (armTimer.current) window.clearTimeout(armTimer.current)
    if (feintTimer.current) window.clearTimeout(feintTimer.current)
  }, [])

  const arm = () => {
    setArmed(true)
    setReady(false)
    setFeint(false)
    armTimer.current = window.setTimeout(() => {
      if (Math.random() < feintChance(difficulty)) {
        setFeint(true)
        update("playing", "FEINT PULSE. HOLD THE TAP.")
        feintTimer.current = window.setTimeout(() => {
          setFeint(false)
          setReady(true)
          setStarted(Date.now())
        }, 600 + Math.random() * 800)
        return
      }
      setReady(true)
      setStarted(Date.now())
    }, delayFor(difficulty))
  }

  const tap = () => {
    if (done) return
    if (!armed) return arm()
    if (feint) {
      if (feintTimer.current) window.clearTimeout(feintTimer.current)
      setArmed(false); setReady(false); setFeint(false)
      setFalseStarts((v) => v + 1)
      update("playing", "FALSE START ON FEINT.")
      setRound((r) => r + 1)
      return
    }
    if (!ready) {
      if (armTimer.current) window.clearTimeout(armTimer.current)
      setArmed(false)
      setFalseStarts((v) => v + 1)
      update("playing", "FALSE START. HOLD THE TAP.")
      setRound((r) => r + 1)
      return
    }
    const ms = Date.now() - started
    const pass = ms < threshold(difficulty)
    setArmed(false); setReady(false)
    setTimes((t) => [...t, ms])
    setRound((r) => r + 1)
    update("playing", `${ms}MS // ${pass ? "CLEAN HIT" : "LATE HIT"}`, { reactionTimeMs: ms })
  }

  useEffect(() => {
    if (!done || recordedRef.current) return
    if (times.length === 0 && falseStarts === 0) return
    recordedRef.current = true
    const result = avg > 0 && avg < threshold(difficulty) ? "win" : "lose"
    const summary = `MATCH DONE // AVG ${avg || "--"}MS // FAST ${fastest || "--"}MS // FALSE ${falseStarts} // ${rating}`
    update(result, `${summary} // ${quip("reaction", result)}`, {
      score: Math.max(1, 600 - (avg || 600)),
      reactionTimeMs: fastest || undefined,
      forceProgression: true,
    })
  }, [avg, difficulty, done, falseStarts, fastest, rating, times.length, update])

  const label = done
    ? `RATING ${rating}`
    : feint ? "HOLD…"
    : !armed ? "ARM TEST"
    : ready ? "TAP NOW"
    : "WAIT..."

  return (
    <div className="space-y-2">
      <p className="ps-mono text-[10px] tracking-[0.2em] text-white/70">
        ROUND {Math.min(round, totalRounds)}/{totalRounds} {"//"} AVG {avg || "--"}MS · FAST {fastest || "--"}MS · FALSE {falseStarts}
      </p>
      <ArcadeGameButton color={ready ? "#39ff14" : feint ? "#ff2d9c" : "#ff7a00"} label={label} onClick={tap} />
      {done && (
        <div className="rounded-lg bg-black/50 px-3 py-2 space-y-1">
          <p className="ps-mono text-[11px] tracking-[0.25em] text-white/85">MATCH DONE · RATING {rating}</p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/60">
            AVG {avg || "--"}MS · FAST {fastest || "--"}MS · FALSE {falseStarts} · THRESHOLD {threshold(difficulty)}MS
          </p>
        </div>
      )}
    </div>
  )
}

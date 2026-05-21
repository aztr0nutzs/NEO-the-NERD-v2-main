"use client"
import { useEffect, useMemo, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const delayFor = (d: ArcadeGameComponentProps["difficulty"]) => d === "HARD" ? 1400 + Math.random() * 1800 : d === "ADAPTIVE" ? 1200 + Math.random() * 1600 : 900 + Math.random() * 1300
const threshold = (d: ArcadeGameComponentProps["difficulty"]) => d === "HARD" ? 320 : d === "ADAPTIVE" ? 430 : 560
export function ReactionTapGame({ difficulty, update }: ArcadeGameComponentProps) {
  const [armed, setArmed] = useState(false); const [ready, setReady] = useState(false); const [started, setStarted] = useState(0)
  const [round, setRound] = useState(1); const [times, setTimes] = useState<number[]>([]); const [falseStarts, setFalseStarts] = useState(0)
  const totalRounds = 5
  const done = round > totalRounds
  const avg = useMemo(() => times.length ? Math.round(times.reduce((a,b)=>a+b,0) / times.length) : 0, [times])
  const fastest = useMemo(() => times.length ? Math.min(...times) : 0, [times])
  const rating = avg === 0 ? "UNRATED" : avg < 260 ? "NEURAL" : avg < 360 ? "SHARP" : avg < 500 ? "SOLID" : "SLUGGISH"
  const arm = () => { setArmed(true); setReady(false); window.setTimeout(() => { if (Math.random() < (difficulty === "HARD" ? 0.25 : 0.1)) { setReady(false); return } setReady(true); setStarted(Date.now()) }, delayFor(difficulty)) }
  const tap = () => {
    if (done) return
    if (!armed) return arm()
    if (!ready) { setArmed(false); setFalseStarts((v)=>v+1); update("playing", "FALSE START. HOLD THE TAP."); setRound((r)=>r+1); return }
    const ms = Date.now() - started
    const pass = ms < threshold(difficulty)
    setArmed(false); setReady(false); setTimes((t)=>[...t, ms]); setRound((r)=>r+1)
    update(pass ? "playing" : "playing", `${ms}MS // ${pass ? "CLEAN HIT" : "LATE HIT"}`, { reactionTimeMs: ms })
  }
  useEffect(() => {
    if (!done || avg === 0) return
    update(avg < threshold(difficulty) ? "win" : "lose", `MATCH DONE // AVG ${avg}MS // FAST ${fastest}MS // FALSE ${falseStarts} // ${rating}`, { score: Math.max(1, 600 - avg), reactionTimeMs: fastest, forceProgression: true })
  }, [avg, difficulty, done, falseStarts, fastest, rating, update])
  return <div className="space-y-2"><p className="ps-mono text-[10px] tracking-[0.2em] text-white/70">ROUND {Math.min(round, totalRounds)}/{totalRounds} {"//"} AVG {avg || "--"}MS // FAST {fastest || "--"}MS // FALSE {falseStarts}</p><ArcadeGameButton color="#ff7a00" label={done ? `RATING ${rating}` : !armed ? "ARM TEST" : ready ? "TAP NOW" : "WAIT..."} onClick={tap} /></div>
}

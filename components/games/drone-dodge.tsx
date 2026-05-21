"use client"

import { useEffect, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

// Difficulty knobs.
// fallStep = how many "rows" (in arena units 0..100) each entity moves per tick.
// spawnEvery = ticks between spawn attempts. Lower = more dense.
// tickMs = wall-clock between ticks. 80ms ≈ 12.5fps for entity movement —
// fast enough to feel responsive, slow enough to avoid burning a phone battery
// on mobile Capacitor WebView.
const CONFIG = {
  EASY:     { lanes: 3, tickMs: 90, fallStep: 4,  spawnEvery: 9,  pickupChance: 0.18 },
  ADAPTIVE: { lanes: 3, tickMs: 75, fallStep: 5,  spawnEvery: 7,  pickupChance: 0.16 },
  HARD:     { lanes: 4, tickMs: 65, fallStep: 6,  spawnEvery: 6,  pickupChance: 0.14 },
} as const

type EntityKind = "drone" | "energy" | "shield"
type Entity = { id: number; lane: number; y: number; kind: EntityKind }

const ARENA_H = 100 // arbitrary units; CSS uses %
const PLAYER_Y = 88
const HIT_BAND = 10 // overlap window for collision

export function DroneDodgeGame({ difficulty, update }: ArcadeGameComponentProps) {
  const cfg = CONFIG[difficulty]
  const [lane, setLane] = useState(Math.floor(cfg.lanes / 2))
  const [entities, setEntities] = useState<Entity[]>([])
  const [score, setScore] = useState(0)
  const [pickups, setPickups] = useState(0)
  const [dodged, setDodged] = useState(0)
  const [hasShield, setHasShield] = useState(false)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle")
  const [elapsedMs, setElapsedMs] = useState(0)
  const recordedRef = useRef(false)

  const tickRef = useRef(0)
  const idRef = useRef(0)
  const startedAtRef = useRef<number>(0)
  const laneRef = useRef(lane)
  const shieldRef = useRef(false)
  useEffect(() => { laneRef.current = lane }, [lane])
  useEffect(() => { shieldRef.current = hasShield }, [hasShield])

  const reset = () => {
    setLane(Math.floor(cfg.lanes / 2))
    setEntities([])
    setScore(0)
    setPickups(0)
    setDodged(0)
    setHasShield(false)
    setElapsedMs(0)
    tickRef.current = 0
    idRef.current = 0
    recordedRef.current = false
  }

  const start = () => {
    reset()
    setPhase("playing")
    setRunning(true)
    startedAtRef.current = Date.now()
  }

  const endRun = () => {
    setRunning(false)
    setPhase("over")
    const ms = Date.now() - startedAtRef.current
    setElapsedMs(ms)
    if (recordedRef.current) return
    recordedRef.current = true
    const result = score >= (difficulty === "HARD" ? 40 : difficulty === "ADAPTIVE" ? 30 : 25) ? "win" : "lose"
    update(
      result,
      `RUN OVER · ${Math.ceil(ms / 1000)}S · SCORE ${score} · DODGED ${dodged} · PICKUPS ${pickups} · ${difficulty}`,
      { score, completionTimeMs: ms, forceProgression: true },
    )
  }

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      tickRef.current += 1
      const t = tickRef.current
      setEntities((prev) => {
        // advance
        let next = prev.map((e) => ({ ...e, y: e.y + cfg.fallStep }))
        // resolve collisions / clears
        const playerLane = laneRef.current
        let scoreDelta = 0
        let pickupDelta = 0
        let dodgeDelta = 0
        let hit = false
        const shieldHadAtStart = shieldRef.current
        let shieldNow = shieldHadAtStart
        const survivors: Entity[] = []
        for (const e of next) {
          if (e.y >= ARENA_H + 4) {
            // off bottom
            if (e.kind === "drone") dodgeDelta += 1
            continue
          }
          // overlap with player band
          if (e.y >= PLAYER_Y - HIT_BAND && e.y <= PLAYER_Y + HIT_BAND && e.lane === playerLane) {
            if (e.kind === "drone") {
              if (shieldNow) {
                shieldNow = false // absorb
                continue
              }
              hit = true
              continue
            }
            if (e.kind === "energy") {
              scoreDelta += 5
              pickupDelta += 1
              continue
            }
            if (e.kind === "shield") {
              shieldNow = true
              pickupDelta += 1
              continue
            }
          }
          survivors.push(e)
        }
        // apply pickup/dodge/score updates
        if (scoreDelta || dodgeDelta) {
          // 1 point per dodge tracked separately, scoreDelta only for energy pickups
          setScore((s) => s + scoreDelta + dodgeDelta)
          if (dodgeDelta) setDodged((d) => d + dodgeDelta)
        }
        if (pickupDelta) setPickups((p) => p + pickupDelta)
        if (shieldNow !== shieldHadAtStart) setHasShield(shieldNow)
        if (hit) {
          // schedule end on next tick
          window.setTimeout(() => endRun(), 0)
          return survivors
        }
        // spawn
        let withSpawn = survivors
        if (t % cfg.spawnEvery === 0) {
          const newLane = Math.floor(Math.random() * cfg.lanes)
          const kindRoll = Math.random()
          let kind: EntityKind = "drone"
          if (kindRoll < cfg.pickupChance) kind = Math.random() < 0.7 ? "energy" : "shield"
          // cap simultaneous entities for perf
          if (withSpawn.length < 14) {
            idRef.current += 1
            withSpawn = [...withSpawn, { id: idRef.current, lane: newLane, y: -8, kind }]
          }
        }
        return withSpawn
      })
      setElapsedMs(Date.now() - startedAtRef.current)
    }, cfg.tickMs)
    return () => window.clearInterval(id)
  }, [running, cfg.tickMs, cfg.fallStep, cfg.spawnEvery, cfg.pickupChance]) // eslint-disable-line react-hooks/exhaustive-deps

  const move = (dir: -1 | 1) => {
    if (phase !== "playing") return
    setLane((l) => Math.max(0, Math.min(cfg.lanes - 1, l + dir)))
  }

  // simple keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") move(-1)
      else if (e.key === "ArrowRight") move(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 ps-mono text-[10px] tracking-[0.2em] text-orange-200">
        <p>TIME {Math.floor(elapsedMs / 1000)}S</p>
        <p className="text-center">SCORE {score}</p>
        <p className="text-right">{hasShield ? "SHIELD ●" : "SHIELD ○"}</p>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{
          aspectRatio: "3/4",
          background: "radial-gradient(circle at 50% -20%, rgba(255,122,0,0.15), rgba(0,0,0,0.7) 65%)",
          boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.35)",
        }}
      >
        {/* lane dividers */}
        {Array.from({ length: cfg.lanes - 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{
              left: `${((i + 1) / cfg.lanes) * 100}%`,
              width: 1,
              background: "rgba(255,255,255,0.06)",
            }}
          />
        ))}
        {/* entities */}
        {entities.map((e) => {
          const left = ((e.lane + 0.5) / cfg.lanes) * 100
          const top = e.y
          const color = e.kind === "drone" ? "#ff2d9c" : e.kind === "energy" ? "#39ff14" : "#00f0ff"
          return (
            <div
              key={e.id}
              className="absolute grid place-items-center rounded-full ps-mono text-[10px]"
              style={{
                left: `calc(${left}% - 14px)`,
                top: `calc(${top}% - 14px)`,
                width: 28,
                height: 28,
                background: `${color}28`,
                color,
                boxShadow: `inset 0 0 0 1px ${color}, 0 0 8px ${color}99`,
                willChange: "transform",
              }}
            >
              {e.kind === "drone" ? "✕" : e.kind === "energy" ? "+" : "◇"}
            </div>
          )
        })}
        {/* player */}
        <div
          className="absolute grid place-items-center rounded-md ps-mono text-[10px] transition-all duration-150"
          style={{
            left: `calc(${((lane + 0.5) / cfg.lanes) * 100}% - 18px)`,
            top: `calc(${PLAYER_Y}% - 18px)`,
            width: 36,
            height: 36,
            background: hasShield ? "rgba(0,240,255,0.22)" : "rgba(255,122,0,0.18)",
            color: hasShield ? "#00f0ff" : "#ff7a00",
            boxShadow: hasShield
              ? "inset 0 0 0 1px #00f0ff, 0 0 12px #00f0ff88"
              : "inset 0 0 0 1px #ff7a00, 0 0 10px #ff7a0066",
          }}
        >
          ▲
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={phase !== "playing"}
          className="rounded-lg py-2 ps-mono text-[11px] tracking-[0.25em]"
          style={{ background: "rgba(255,122,0,0.16)", color: "#ff7a00", boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.5)" }}
        >
          ◀ LEFT
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={phase !== "playing"}
          className="rounded-lg py-2 ps-mono text-[11px] tracking-[0.25em]"
          style={{ background: "rgba(255,122,0,0.16)", color: "#ff7a00", boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.5)" }}
        >
          RIGHT ▶
        </button>
      </div>

      {phase === "idle" && <ArcadeGameButton color="#39ff14" label="LAUNCH RUN" onClick={start} />}
      {phase === "over" && (
        <div className="rounded-lg bg-black/55 px-3 py-2 space-y-2">
          <p className="ps-mono text-[11px] tracking-[0.25em] text-orange-200">RUN OVER</p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/65">
            {Math.ceil(elapsedMs / 1000)}S · SCORE {score} · DODGED {dodged} · PICKUPS {pickups} · {difficulty}
          </p>
          <ArcadeGameButton color="#ff7a00" label="NEW RUN" onClick={start} />
        </div>
      )}
    </div>
  )
}

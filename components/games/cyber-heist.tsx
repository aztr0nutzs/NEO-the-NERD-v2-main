"use client"

import { motion } from "framer-motion"
import { useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
import { HEIST_SCENARIOS, type HeistChoice, type HeistScenario } from "@/lib/games/banks/heist"

const CONFIG = {
  EASY:     { rounds: 5, startStealth: 80, penaltyMul: 0.7 },
  ADAPTIVE: { rounds: 7, startStealth: 70, penaltyMul: 1.0 },
  HARD:     { rounds: 9, startStealth: 60, penaltyMul: 1.3 },
} as const

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function applyChoice(stealth: number, trace: number, loot: number, c: HeistChoice, penaltyMul: number) {
  const s = Math.round((c.stealth ?? 0) * penaltyMul)
  const t = Math.round((c.trace ?? 0) * penaltyMul)
  const l = Math.round((c.loot ?? 0))
  return {
    stealth: Math.max(0, Math.min(100, stealth + s)),
    trace: Math.max(0, Math.min(100, trace + t)),
    loot: Math.max(0, loot + l),
  }
}

function rank(loot: number, trace: number, stealth: number, breached: boolean): { name: string; line: string } {
  if (!breached) {
    if (trace >= 100) return { name: "LOUD DISASTER", line: "Trace maxed. NEO archives the run as a cautionary tale." }
    return { name: "SCRAPPED RUN", line: "Stealth bled out. Quiet exit, empty hands." }
  }
  if (trace < 30 && loot >= 60) return { name: "GHOST OPERATIVE", line: "Vault breached. Logs intact. No trace." }
  if (loot >= 80) return { name: "HEAVY EARNER", line: "Loaded out. Half the audit team is already paging." }
  if (trace < 40) return { name: "PATIENT GHOST", line: "Quiet enough. Not rich, but clean." }
  if (stealth < 30) return { name: "SCRAPPY SURVIVOR", line: "Made it out coughing dust. Stealth shredded." }
  return { name: "COMPETENT INFILTRATOR", line: "Solid run. Nothing in the highlight reel." }
}

export function CyberHeistGame({ difficulty, update }: ArcadeGameComponentProps) {
  const { rounds, startStealth, penaltyMul } = CONFIG[difficulty]
  const session = useMemo(() => shuffle(HEIST_SCENARIOS).slice(0, rounds), [rounds])

  const [idx, setIdx] = useState(0)
  const [stealth, setStealth] = useState<number>(startStealth)
  const [trace, setTrace] = useState(0)
  const [loot, setLoot] = useState(0)
  const [phase, setPhase] = useState<"playing" | "won" | "lost">("playing")
  const [lastEffect, setLastEffect] = useState<string | null>(null)
  const recordedRef = useRef(false)

  const current: HeistScenario | undefined = session[idx]
  const done = idx >= session.length

  const finalize = (win: boolean, st: number, tr: number, lt: number) => {
    if (recordedRef.current) return
    recordedRef.current = true
    const r = rank(lt, tr, st, win)
    update(
      win ? "win" : "lose",
      `${r.name} · ${r.line} · LOOT ${lt} · TRACE ${tr} · STEALTH ${st} · ${difficulty}`,
      win
        ? { score: Math.max(1, lt - tr + Math.floor(st / 2)), forceProgression: true }
        : { neoScore: 1, forceProgression: true },
    )
  }

  const pick = (c: HeistChoice) => {
    if (!current || phase !== "playing") return
    const next = applyChoice(stealth, trace, loot, c, penaltyMul)
    setStealth(next.stealth)
    setTrace(next.trace)
    setLoot(next.loot)
    const deltaParts = [
      (c.stealth ?? 0) !== 0 ? `STEALTH ${(c.stealth ?? 0) > 0 ? "+" : ""}${Math.round((c.stealth ?? 0) * penaltyMul)}` : "",
      (c.trace ?? 0) !== 0 ? `TRACE ${(c.trace ?? 0) > 0 ? "+" : ""}${Math.round((c.trace ?? 0) * penaltyMul)}` : "",
      (c.loot ?? 0) !== 0 ? `LOOT ${(c.loot ?? 0) > 0 ? "+" : ""}${c.loot}` : "",
    ].filter(Boolean).join(" · ")
    setLastEffect(deltaParts || "No effect.")

    if (next.trace >= 100 || next.stealth <= 0) {
      setPhase("lost")
      finalize(false, next.stealth, next.trace, next.loot)
      return
    }

    const nextIdx = idx + 1
    if (nextIdx >= session.length) {
      setPhase("won")
      finalize(true, next.stealth, next.trace, next.loot)
      return
    }
    setIdx(nextIdx)
    update("playing", `Scenario cleared. ${deltaParts || "No effect."}`, { score: c.loot && c.loot > 0 ? c.loot : 0 })
  }

  const resetRun = () => {
    setIdx(0)
    setStealth(startStealth)
    setTrace(0)
    setLoot(0)
    setPhase("playing")
    setLastEffect(null)
    recordedRef.current = false
  }

  if (phase !== "playing") {
    const r = rank(loot, trace, stealth, phase === "won")
    return (
      <div className="rounded-lg bg-black/55 px-3 py-2 space-y-2">
        <p className="ps-mono text-[11px] tracking-[0.25em]" style={{ color: phase === "won" ? "#39ff14" : "#ff2d9c" }}>
          {r.name}
        </p>
        <p className="ps-mono text-[10px] tracking-[0.2em] text-white/75">{r.line}</p>
        <div className="grid grid-cols-3 gap-2 text-center ps-mono text-[9px] tracking-[0.2em] text-white/70">
          <div>STEALTH {stealth}</div>
          <div>TRACE {trace}</div>
          <div>LOOT {loot}</div>
        </div>
        <button
          type="button"
          onClick={resetRun}
          className="w-full rounded-lg py-2 ps-mono text-[11px] tracking-[0.25em]"
          style={{ background: "rgba(184,41,255,0.16)", color: "#b829ff", boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.5)" }}
        >
          NEW HEIST
        </button>
      </div>
    )
  }

  if (done || !current) return null

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="STEALTH" value={stealth} color="#00f0ff" />
        <Stat label="TRACE" value={trace} color="#ff2d9c" warn />
        <Stat label="LOOT" value={loot} color="#39ff14" raw />
      </div>
      <p className="ps-mono text-[10px] tracking-[0.2em] text-purple-200">
        ROUND {idx + 1}/{session.length} · {current.title}
      </p>
      <motion.p
        key={current.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-black/40 px-3 py-2 text-[12px] text-white/85"
        style={{ boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.25)" }}
      >
        {current.prompt}
      </motion.p>
      {lastEffect && (
        <p className="ps-mono text-[9px] tracking-[0.2em] text-white/55">{lastEffect}</p>
      )}
      <div className="grid gap-2">
        {current.choices.map((c, i) => (
          <ArcadeGameButton
            key={i}
            color="#b829ff"
            label={c.hint ? `${c.label} · ${c.hint}` : c.label}
            onClick={() => pick(c)}
          />
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, color, warn, raw }: { label: string; value: number; color: string; warn?: boolean; raw?: boolean }) {
  const pct = raw ? Math.min(100, value) : value
  const fill = warn ? (value > 70 ? "#ff2d9c" : value > 40 ? "#ff7a00" : color) : color
  return (
    <div className="rounded-md bg-black/40 px-2 py-1.5" style={{ boxShadow: `inset 0 0 0 1px ${color}33` }}>
      <p className="ps-mono text-[9px] tracking-[0.2em]" style={{ color }}>{label} {value}{raw ? "" : "%"}</p>
      <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full transition-[width] duration-300" style={{ width: `${Math.min(100, pct)}%`, background: fill, boxShadow: `0 0 6px ${fill}66` }} />
      </div>
    </div>
  )
}

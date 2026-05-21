"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
import { WYR_BANK, profileFor, type WyrPair } from "@/lib/games/banks/wyr"

const roundsBy = { EASY: 4, ADAPTIVE: 5, HARD: 6 } as const

type Pick = { pair: WyrPair; choseA: boolean; predictedA: boolean }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function WouldYouRatherGame({ difficulty, update }: ArcadeGameComponentProps) {
  const rounds = roundsBy[difficulty]
  const session = useMemo(() => shuffle(WYR_BANK).slice(0, rounds), [rounds])
  const predictions = useMemo(() => session.map(() => Math.random() < 0.5), [session])

  const [idx, setIdx] = useState(0)
  const [picks, setPicks] = useState<Pick[]>([])
  const recordedRef = useRef(false)

  const pair = session[idx]
  const done = idx >= session.length
  const predictedA = predictions[idx]
  const predictedText = pair && (predictedA ? pair.a : pair.b)

  const choose = (choseA: boolean) => {
    if (!pair || done) return
    const hit = choseA === predictedA
    const reactLine = choseA ? pair.reactA : pair.reactB
    const newPick: Pick = { pair, choseA, predictedA }
    const nextPicks = [...picks, newPick]
    setPicks(nextPicks)
    const next = idx + 1
    const isLast = next >= session.length

    if (!isLast) {
      update(
        "playing",
        `NEO predicted: ${predictedText}. ${hit ? "Prediction hit." : "Prediction missed."}${reactLine ? ` ${reactLine}` : ""}`,
        { score: hit ? 1 : 0, neoScore: hit ? 0 : 1 },
      )
    } else if (!recordedRef.current) {
      recordedRef.current = true
      const hits = nextPicks.filter((p) => p.choseA === p.predictedA).length
      const tagCounts: Record<string, number> = {}
      for (const p of nextPicks) {
        tagCounts[p.pair.tag] = (tagCounts[p.pair.tag] ?? 0) + 1
      }
      const profile = profileFor(nextPicks.map((p) => (p.choseA ? p.pair.a : p.pair.b)), tagCounts)
      update(
        "draw",
        `PROFILE · ${profile.name.toUpperCase()} · ${profile.description} · NEO PREDICTIONS ${hits}/${nextPicks.length}`,
        { score: nextPicks.length, neoScore: nextPicks.length, forceProgression: true },
      )
    }
    setIdx(next)
  }

  useEffect(() => {
    if (!done) return
  }, [done])

  if (done) {
    const hits = picks.filter((p) => p.choseA === p.predictedA).length
    const tagCounts: Record<string, number> = {}
    for (const p of picks) tagCounts[p.pair.tag] = (tagCounts[p.pair.tag] ?? 0) + 1
    const profile = profileFor(picks.map((p) => (p.choseA ? p.pair.a : p.pair.b)), tagCounts)
    return (
      <div className="space-y-2">
        <div className="rounded-lg bg-black/50 px-3 py-2 space-y-1">
          <p className="ps-mono text-[11px] tracking-[0.25em] text-green-200">PROFILE · {profile.name.toUpperCase()}</p>
          <p className="ps-mono text-[10px] tracking-[0.2em] text-white/65">{profile.description}</p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/55">
            NEO PREDICTIONS {hits}/{picks.length} · {difficulty}
          </p>
        </div>
        <div className="space-y-1">
          {picks.map((p, i) => (
            <div
              key={i}
              className="rounded-lg px-2 py-1.5 ps-mono text-[10px] tracking-[0.15em] text-white/75"
              style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.25)", background: "rgba(0,0,0,0.4)" }}
            >
              <span className="text-green-300">[{p.pair.tag.toUpperCase()}]</span> {p.choseA ? p.pair.a : p.pair.b}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="ps-mono text-[10px] tracking-[0.2em] text-green-200">
        ROUND {idx + 1}/{session.length} · TAG {pair.tag.toUpperCase()}
      </p>
      <p className="ps-mono text-[10px] tracking-[0.2em] text-white/60">NEO predicts you&apos;ll pick A or B…</p>
      <div className="grid gap-2">
        <ArcadeGameButton color="#39ff14" label={`A · ${pair.a}`} onClick={() => choose(true)} />
        <p className="text-center ps-mono text-[10px] tracking-[0.3em] text-white/40">— OR —</p>
        <ArcadeGameButton color="#9bff8f" label={`B · ${pair.b}`} onClick={() => choose(false)} />
      </div>
    </div>
  )
}

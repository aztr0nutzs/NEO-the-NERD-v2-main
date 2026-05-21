"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
import { WORD_BANK } from "@/lib/games/banks/words"

const roundsBy = { EASY: 4, ADAPTIVE: 5, HARD: 6 } as const
const timePerWord = { EASY: 25, ADAPTIVE: 22, HARD: 18 } as const

function scrambleWord(word: string): string {
  if (word.length <= 1) return word
  for (let attempt = 0; attempt < 8; attempt++) {
    const chars = word.split("")
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    const scrambled = chars.join("")
    if (scrambled !== word) return scrambled
  }
  return word.split("").reverse().join("")
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function WordScrambleGame({ difficulty, update }: ArcadeGameComponentProps) {
  const session = useMemo(
    () => shuffle(WORD_BANK.filter((w) => w.difficulty === difficulty)).slice(0, roundsBy[difficulty]),
    [difficulty],
  )
  const scrambledByIdx = useMemo(() => session.map((w) => scrambleWord(w.word)), [session])

  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState("")
  const [score, setScore] = useState(0)
  const [solved, setSolved] = useState(0)
  const [hints, setHints] = useState(0)
  const [revealed, setRevealed] = useState(0)
  const [left, setLeft] = useState<number>(timePerWord[difficulty])
  const recordedRef = useRef(false)

  const item = session[idx]
  const done = idx >= session.length

  useEffect(() => {
    if (done) return
    setLeft(timePerWord[difficulty])
  }, [idx, difficulty, done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [done, idx])

  const advance = (ok: boolean, gainBase: number, timeout = false) => {
    const gain = ok ? gainBase : 0
    const nextScore = score + gain
    const nextSolved = solved + (ok ? 1 : 0)
    setScore(nextScore)
    setSolved(nextSolved)
    const next = idx + 1
    const isLast = next >= session.length

    if (isLast) {
      if (!recordedRef.current) {
        recordedRef.current = true
        const result = nextSolved >= Math.ceil(session.length / 2) ? "win" : "lose"
        update(
          result,
          `SCRAMBLE SUMMARY · ${nextSolved}/${session.length} SOLVED · SCORE ${nextScore} · ${difficulty}`,
          { score: nextScore, forceProgression: true },
        )
      }
    } else {
      const tail = timeout
        ? `Timer out. Word was ${item.word}.`
        : ok
          ? `Word decrypted (+${gain}).`
          : `No lock. Correct: ${item.word}.`
      update("playing", tail, { score: gain, neoScore: ok ? 0 : 1 })
    }

    setIdx(next)
    setAnswer("")
    setHints(0)
    setRevealed(0)
  }

  const submit = () => {
    if (!item || done) return
    const ok = answer.trim().toUpperCase() === item.word
    const base = Math.max(1, 5 - hints - revealed)
    advance(ok, base)
  }

  useEffect(() => {
    if (done || !item) return
    if (left === 0) advance(false, 0, true)
  }, [left, done]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    return (
      <div className="rounded-lg bg-black/50 p-3 space-y-1">
        <p className="ps-mono text-[11px] tracking-[0.25em] text-purple-200">SCRAMBLE COMPLETE</p>
        <p className="ps-mono text-[9px] tracking-[0.2em] text-white/65">
          SOLVED {solved}/{session.length} · SCORE {score} · {difficulty}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="ps-mono text-[10px] tracking-[0.2em] text-purple-200">
        WORD {idx + 1}/{session.length} · CAT {item.category.toUpperCase()} · T-{left}S · SCORE {score}
      </p>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${(left / timePerWord[difficulty]) * 100}%`,
            background: left <= 5 ? "linear-gradient(90deg,#ff2d9c,#ff7a00)" : "linear-gradient(90deg,#b829ff,#00f0ff)",
          }}
        />
      </div>
      <p className="ps-heading text-2xl ps-text-purple tracking-widest">{scrambledByIdx[idx]}</p>
      {revealed > 0 && (
        <p className="ps-mono text-xs text-white/70 tracking-widest">
          {item.word
            .split("")
            .map((c, i) => (i < revealed ? c : "_"))
            .join(" ")}
        </p>
      )}
      <div className="flex gap-2">
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit() }}
          placeholder="UNSCRAMBLE…"
          className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none ps-mono uppercase"
          style={{ boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.4)" }}
        />
        <ArcadeGameButton color="#b829ff" label="SOLVE" onClick={submit} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ArcadeGameButton
          color="#9f5eff"
          label={hints > 0 ? "HINT USED" : "CATEGORY HINT"}
          disabled={hints > 0}
          onClick={() => {
            setHints(1)
            update("playing", `Hint: category is ${item.category}.`)
          }}
        />
        <ArcadeGameButton
          color="#c57dff"
          label={`REVEAL +1 (${revealed})`}
          disabled={revealed >= Math.max(1, item.word.length - 2)}
          onClick={() => {
            const next = revealed + 1
            setRevealed(next)
            update("playing", `Letter ${next} revealed.`)
          }}
        />
      </div>
    </div>
  )
}

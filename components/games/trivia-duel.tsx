"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

type TriviaItem = {
  q: string
  a: string
  o: string[]
  category: "tech" | "general" | "science" | "pop" | "neo"
  difficulty: "EASY" | "ADAPTIVE" | "HARD"
}

const BANK: TriviaItem[] = [
  { q: "What does RAM stand for?", a: "RANDOM ACCESS MEMORY", o: ["RANDOM ACCESS MEMORY", "RAPID ARRAY MACHINE", "REMOTE ACTIVE MODULE"], category: "tech", difficulty: "EASY" },
  { q: "HTTP status 404 means?", a: "NOT FOUND", o: ["NOT FOUND", "UNAUTHORIZED", "OK"], category: "tech", difficulty: "EASY" },
  { q: "Which star is at the center of our solar system?", a: "THE SUN", o: ["THE SUN", "SIRIUS", "POLARIS"], category: "science", difficulty: "EASY" },
  { q: "Largest ocean on Earth?", a: "PACIFIC", o: ["PACIFIC", "ATLANTIC", "INDIAN"], category: "general", difficulty: "EASY" },
  { q: "Neo glow primary color in app visuals?", a: "CYAN", o: ["CYAN", "RED", "YELLOW"], category: "neo", difficulty: "EASY" },
  { q: "Binary of decimal 10 is?", a: "1010", o: ["1010", "1001", "1111"], category: "tech", difficulty: "ADAPTIVE" },
  { q: "Chemical symbol for gold?", a: "AU", o: ["AU", "AG", "GD"], category: "science", difficulty: "ADAPTIVE" },
  { q: "Who wrote '1984'?", a: "GEORGE ORWELL", o: ["GEORGE ORWELL", "ALDOUS HUXLEY", "RAY BRADBURY"], category: "pop", difficulty: "ADAPTIVE" },
  { q: "Fastest land animal?", a: "CHEETAH", o: ["CHEETAH", "FALCON", "HORSE"], category: "general", difficulty: "ADAPTIVE" },
  { q: "In NEO lore style, what powers the cabinet?", a: "NEON CORE", o: ["NEON CORE", "STEAM ENGINE", "SOLAR ICE"], category: "neo", difficulty: "ADAPTIVE" },
  { q: "Time complexity of binary search?", a: "O(LOG N)", o: ["O(LOG N)", "O(N)", "O(N LOG N)"], category: "tech", difficulty: "HARD" },
  { q: "Particle with negative charge?", a: "ELECTRON", o: ["ELECTRON", "PROTON", "NEUTRON"], category: "science", difficulty: "HARD" },
  { q: "Capital of Iceland?", a: "REYKJAVIK", o: ["REYKJAVIK", "OSLO", "HELSINKI"], category: "general", difficulty: "HARD" },
  { q: "Which movie features a virtual reality called the Matrix?", a: "THE MATRIX", o: ["THE MATRIX", "TRON", "INCEPTION"], category: "pop", difficulty: "HARD" },
  { q: "Protocol commonly used for secure web traffic?", a: "HTTPS", o: ["HTTPS", "FTP", "TELNET"], category: "neo", difficulty: "HARD" },
]

const roundsByDiff = { EASY: 6, ADAPTIVE: 8, HARD: 10 } as const
const timeByDiff = { EASY: 16, ADAPTIVE: 13, HARD: 10 } as const

export function TriviaDuelGame({ difficulty, update }: ArcadeGameComponentProps) {
  const rounds = roundsByDiff[difficulty]
  const pool = useMemo(() => BANK.filter((q) => q.difficulty === difficulty).sort(() => Math.random() - 0.5).slice(0, rounds), [difficulty, rounds])
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [left, setLeft] = useState<number>(timeByDiff[difficulty])

  useEffect(() => { const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(id) }, [])
  const current = pool[idx]
  const done = idx >= pool.length

  const step = useCallback((ok: boolean, timeout = false) => {
    if (done || !current) return
    const nextCorrect = ok ? correct + 1 : correct
    const nextStreak = ok ? streak + 1 : 0
    setCorrect(nextCorrect)
    setStreak(nextStreak)
    setBestStreak((b) => Math.max(b, nextStreak))
    update("playing", timeout ? "Timer expired. NEO takes this one." : ok ? "Correct. Neural lock achieved." : `Wrong. Correct answer: ${current.a}.`, { score: ok ? 1 : 0, neoScore: ok ? 0 : 1, streak: nextStreak })
    const nextIdx = idx + 1
    setIdx(nextIdx)
    setLeft(timeByDiff[difficulty])
    if (nextIdx >= pool.length) {
      const acc = Math.round((nextCorrect / pool.length) * 100)
      const medal = acc >= 90 ? "S" : acc >= 75 ? "A" : acc >= 60 ? "B" : "C"
      update(nextCorrect >= Math.ceil(pool.length / 2) ? "win" : "lose", `DUEL SUMMARY // SCORE ${nextCorrect}/${pool.length} // ACC ${acc}% // BEST_STREAK ${Math.max(bestStreak, nextStreak)} // MEDAL ${medal}`, { score: nextCorrect, streak: Math.max(bestStreak, nextStreak), forceProgression: true })
    }
  }, [bestStreak, correct, current, difficulty, done, idx, pool.length, streak, update])

  useEffect(() => { if (!done && left === 0) step(false, true) }, [done, left, step])

  const accuracy = done && pool.length ? Math.round((correct / pool.length) * 100) : 0
  const medal = accuracy >= 90 ? "S" : accuracy >= 75 ? "A" : accuracy >= 60 ? "B" : "C"
  if (done) return <div className="rounded-lg bg-black/45 p-3 ps-mono text-[10px] tracking-[0.2em] text-cyan-200">DUEL COMPLETE {"//"} MEDAL {medal} {"//"} ACC {accuracy}%</div>

  return <div className="space-y-2"><p className="ps-mono text-[10px] tracking-[0.2em] text-cyan-200">Q {idx + 1}/{pool.length} {"//"} CAT {current.category.toUpperCase()} {"//"} T-{left}s {"//"} STREAK {streak}</p><p className="text-sm text-white/90">{current.q}</p><div className="grid gap-2">{current.o.map((o) => <ArcadeGameButton key={o} color="#00f0ff" label={o} onClick={() => step(o === current.a)} />)}</div></div>
}

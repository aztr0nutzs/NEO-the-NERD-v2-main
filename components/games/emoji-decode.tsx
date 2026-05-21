"use client"

import { useMemo, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

type EmojiItem = { q: string; a: string; o: string[]; category: string; difficulty: "EASY" | "ADAPTIVE" | "HARD"; reveal: string }
const BANK: EmojiItem[] = [
  { q: "🤖⚡🌃", a: "CYBER ROBOT", o: ["CYBER ROBOT", "SLEEP MODE", "LASER CAT"], category: "cyber", difficulty: "EASY", reveal: "Robot + electric + city = cyber robot." },
  { q: "🎮🏆🔥", a: "HOT STREAK", o: ["HOT STREAK", "WIN SCREEN", "BOSS FIGHT"], category: "games", difficulty: "EASY", reveal: "Game + trophy + fire implies streak." },
  { q: "🔔😂🚪", a: "DOORBELL PRANK", o: ["DOORBELL PRANK", "FUNNY DELIVERY", "RING ALERT"], category: "prank", difficulty: "ADAPTIVE", reveal: "Bell + laugh + door = doorbell prank." },
  { q: "💾🧠⚙️", a: "MACHINE LEARNING", o: ["MACHINE LEARNING", "HARD DRIVE", "BRAIN CHIP"], category: "tech", difficulty: "ADAPTIVE", reveal: "Storage + brain + gear indicates ML system." },
  { q: "🛰️📡🌐", a: "GLOBAL NETWORK", o: ["GLOBAL NETWORK", "ALIEN SIGNAL", "SKY WIFI"], category: "tech", difficulty: "HARD", reveal: "Satellite + antenna + globe indicates network." },
  { q: "🎭🤖🔮", a: "PREDICTIVE BOT", o: ["PREDICTIVE BOT", "ROBOT MAGIC", "FUTURE MASK"], category: "cyber", difficulty: "HARD", reveal: "Mask + robot + crystal ball implies prediction." },
]

export function EmojiDecodeGame({ difficulty, update }: ArcadeGameComponentProps) {
  const rounds = difficulty === "HARD" ? 5 : difficulty === "ADAPTIVE" ? 4 : 3
  const session = useMemo(() => BANK.filter((x) => x.difficulty === difficulty).sort(() => Math.random() - 0.5).slice(0, rounds), [difficulty, rounds])
  const [idx, setIdx] = useState(0)
  const [combo, setCombo] = useState(0)
  const [score, setScore] = useState(0)
  const item = session[idx]
  const done = idx >= session.length
  const choose = (o: string) => {
    const ok = o === item.a
    const nextCombo = ok ? combo + 1 : 0
    setCombo(nextCombo)
    const gain = ok ? 1 + Math.min(2, nextCombo) : 0
    setScore((s) => s + gain)
    update("playing", ok ? `Decoded. Combo ${nextCombo}.` : `Decode miss. ${item.reveal}`, { score: gain, neoScore: ok ? 0 : 1, streak: nextCombo })
    const next = idx + 1
    setIdx(next)
    if (next >= session.length) update(score + gain >= Math.ceil(session.length * 1.5) ? "win" : "lose", `EMOJI SUMMARY // SCORE ${score + gain} // COMBO ${nextCombo}`, { score: score + gain, streak: nextCombo, forceProgression: true })
  }
  if (done) return <p className="rounded-lg bg-black/40 px-3 py-2 ps-mono text-[10px] tracking-[0.2em] text-pink-200">DECODE COMPLETE // SCORE {score}</p>
  return <div className="space-y-2"><p className="ps-mono text-[10px] tracking-[0.2em] text-pink-200">ROUND {idx + 1}/{session.length} {"//"} CAT {item.category.toUpperCase()} {"//"} COMBO {combo}</p><p className="text-3xl">{item.q}</p><div className="grid gap-2">{item.o.map((o) => <ArcadeGameButton key={o} color="#ff2d9c" label={o} onClick={() => choose(o)} />)}</div></div>
}

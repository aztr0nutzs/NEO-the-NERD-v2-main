"use client"

import { motion } from "framer-motion"
import { RotateCcw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { NeonPanel } from "../neon-panel"
import type { GameId, GameSessionState } from "@/lib/types"
import { useApp } from "@/lib/store"

type Difficulty = "EASY" | "ADAPTIVE" | "HARD"
type Result = GameSessionState["result"]

const ACCENT: Record<GameId, "cyan" | "purple" | "pink" | "green" | "orange"> = {
  tictactoe: "cyan",
  rps: "pink",
  memory: "purple",
  reaction: "orange",
  guess: "green",
  trivia: "cyan",
  scramble: "purple",
  emoji: "pink",
  rapidfire: "orange",
  wyr: "green",
}

const HEX = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

const TITLES: Record<GameId, string> = {
  tictactoe: "TIC_TAC_TOE",
  rps: "ROCK_PAPER_SCISSORS",
  memory: "MEMORY_MATCH",
  reaction: "REACTION_TAP",
  guess: "GUESS_THE_NUMBER",
  trivia: "TRIVIA_DUEL",
  scramble: "WORD_SCRAMBLE",
  emoji: "EMOJI_DECODE",
  rapidfire: "RAPID_FIRE",
  wyr: "WOULD_YOU_RATHER",
}

const TRASH = [
  "NEO logs this for calibration. Mostly for comedy.",
  "Bold move. The arcade cabinet is judging respectfully.",
  "Your reflexes filed a support ticket.",
]

const MEMORY_ICONS = ["⚡", "◆", "▲", "●", "★", "✚", "◇", "☽"]

function trash(enabled: boolean) {
  if (!enabled) return ""
  return ` ${TRASH[Math.floor(Math.random() * TRASH.length)]}`
}

function targetScore(difficulty: Difficulty) {
  return difficulty === "HARD" ? 5 : difficulty === "ADAPTIVE" ? 4 : 3
}

function memoryPairs(difficulty: Difficulty) {
  return difficulty === "HARD" ? 8 : difficulty === "ADAPTIVE" ? 6 : 4
}

function rangeMax(difficulty: Difficulty) {
  return difficulty === "HARD" ? 100 : difficulty === "ADAPTIVE" ? 50 : 25
}

function reactionDelay(difficulty: Difficulty) {
  return difficulty === "HARD" ? 1500 + Math.random() * 2200 : difficulty === "ADAPTIVE" ? 1200 + Math.random() * 1800 : 900 + Math.random() * 1300
}

function makeSession(game: GameId): GameSessionState {
  return {
    activeGame: game,
    score: { you: 0, neo: 0 },
    round: 1,
    result: "idle",
    robotResponse: "NEO is waiting. Begin the round.",
  }
}

export function ArcadeGame({
  game,
  difficulty,
  trashTalk,
  onClose,
}: {
  game: Exclude<GameId, "tictactoe" | "rps">
  difficulty: Difficulty
  trashTalk: boolean
  onClose: () => void
}) {
  const [session, setSession] = useState<GameSessionState>(() => makeSession(game))
  const { playAvatarReaction } = useApp()

  const update = (result: Result, robotResponse: string, you = 0, neo = 0) => {
    if (result === "win") playAvatarReaction("ecstatic")
    if (result === "lose") playAvatarReaction("angry")
    if (result === "draw") playAvatarReaction("surprised")
    setSession((cur) => ({
      ...cur,
      result,
      robotResponse: `${robotResponse}${trash(trashTalk)}`,
      round: cur.round + 1,
      score: { you: cur.score.you + you, neo: cur.score.neo + neo },
    }))
  }

  const reset = () => setSession(makeSession(game))
  const color = HEX[ACCENT[game]]

  return (
    <NeonPanel accent={ACCENT[game]} glow="strong" className="p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="ps-mono text-[10px] tracking-[0.3em]" style={{ color }}>
            {TITLES[game]}
          </p>
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/65">
            R{session.round} {"//"} YOU {session.score.you} · NEO {session.score.neo} {"//"} {session.result.toUpperCase()}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={reset}
            aria-label="Replay"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80"
            style={{ boxShadow: `inset 0 0 0 1px ${color}80` }}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 ps-mono text-[10px] tracking-[0.25em] text-white/85"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
          >
            EXIT
          </button>
        </div>
      </div>

      <p className="mt-2 rounded-lg bg-black/40 px-3 py-2 ps-mono text-[10px] tracking-[0.2em] text-white/70"
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
      >
        {session.robotResponse}
      </p>

      <div className="mt-3">
        {game === "memory" && <MemoryMatch difficulty={difficulty} update={update} />}
        {game === "reaction" && <ReactionTap difficulty={difficulty} update={update} />}
        {game === "guess" && <GuessNumber difficulty={difficulty} update={update} />}
        {game === "trivia" && <TriviaDuel difficulty={difficulty} update={update} />}
        {game === "scramble" && <WordScramble difficulty={difficulty} update={update} />}
        {game === "emoji" && <EmojiDecode difficulty={difficulty} update={update} />}
        {game === "rapidfire" && <RapidFire difficulty={difficulty} update={update} />}
        {game === "wyr" && <WouldYouRather update={update} />}
      </div>
    </NeonPanel>
  )
}

function GameButton({
  label,
  color,
  onClick,
  disabled,
}: {
  label: string
  color: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg px-3 py-2 ps-mono text-[10px] tracking-[0.22em]"
      style={{
        color: disabled ? "rgba(255,255,255,0.35)" : color,
        background: disabled ? "rgba(255,255,255,0.04)" : `${color}14`,
        boxShadow: `inset 0 0 0 1px ${disabled ? "rgba(255,255,255,0.12)" : `${color}77`}`,
      }}
    >
      {label}
    </motion.button>
  )
}

function MemoryMatch({ difficulty, update }: { difficulty: Difficulty; update: (r: Result, m: string, y?: number, n?: number) => void }) {
  const [deck, setDeck] = useState<string[]>([])
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])

  const resetDeck = () => {
    const pairs = MEMORY_ICONS.slice(0, memoryPairs(difficulty))
    setDeck([...pairs, ...pairs].sort(() => Math.random() - 0.5))
    setOpen([])
    setMatched([])
  }

  useEffect(resetDeck, [difficulty])

  const pick = (i: number) => {
    if (open.length === 2 || open.includes(i) || matched.includes(i)) return
    const next = [...open, i]
    setOpen(next)
    if (next.length === 2) {
      const ok = deck[next[0]] === deck[next[1]]
      setTimeout(() => {
        if (ok) {
          const all = [...matched, ...next]
          setMatched(all)
          update(all.length === deck.length ? "win" : "playing", all.length === deck.length ? "Memory grid cleared." : "Pair locked.", 1, 0)
        } else {
          update("lose", "Mismatch. NEO steals a point.", 0, 1)
        }
        setOpen([])
      }, 650)
    }
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {deck.map((v, i) => {
        const visible = open.includes(i) || matched.includes(i)
        return (
          <GameButton key={`${v}-${i}`} color="#b829ff" label={visible ? v : "?"} onClick={() => pick(i)} />
        )
      })}
    </div>
  )
}

function ReactionTap({ difficulty, update }: { difficulty: Difficulty; update: (r: Result, m: string, y?: number, n?: number) => void }) {
  const [armed, setArmed] = useState(false)
  const [ready, setReady] = useState(false)
  const [started, setStarted] = useState(0)

  const arm = () => {
    setArmed(true)
    setReady(false)
    window.setTimeout(() => {
      setReady(true)
      setStarted(Date.now())
    }, reactionDelay(difficulty))
  }

  const tap = () => {
    if (!armed) return arm()
    if (!ready) {
      setArmed(false)
      update("lose", "Too early. NEO awards itself a point.", 0, 1)
      return
    }
    const ms = Date.now() - started
    const pass = ms < (difficulty === "HARD" ? 360 : difficulty === "ADAPTIVE" ? 480 : 650)
    setArmed(false)
    setReady(false)
    update(pass ? "win" : "lose", `${ms}MS reaction. ${pass ? "Human reflexes accepted." : "NEO was faster."}`, pass ? 1 : 0, pass ? 0 : 1)
  }

  return (
    <GameButton color="#ff7a00" label={!armed ? "ARM TEST" : ready ? "TAP NOW" : "WAIT..."} onClick={tap} />
  )
}

function GuessNumber({ difficulty, update }: { difficulty: Difficulty; update: (r: Result, m: string, y?: number, n?: number) => void }) {
  const max = rangeMax(difficulty)
  const [target, setTarget] = useState(() => Math.floor(Math.random() * max) + 1)
  const [guess, setGuess] = useState("")
  const [tries, setTries] = useState(0)
  const limit = difficulty === "HARD" ? 6 : difficulty === "ADAPTIVE" ? 7 : 8

  const submit = () => {
    const n = Number(guess)
    const nextTries = tries + 1
    setTries(nextTries)
    if (n === target) {
      update("win", `Correct in ${nextTries}. Target was ${target}.`, 1, 0)
      setTarget(Math.floor(Math.random() * max) + 1)
      setTries(0)
    } else if (nextTries >= limit) {
      update("lose", `Out of guesses. Target was ${target}.`, 0, 1)
      setTarget(Math.floor(Math.random() * max) + 1)
      setTries(0)
    } else {
      update("playing", n < target ? "Hot/cold scan says higher." : "Hot/cold scan says lower.")
    }
    setGuess("")
  }

  return (
    <div className="flex gap-2">
      <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder={`1-${max}`} className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none" style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.4)" }} />
      <GameButton color="#39ff14" label="GUESS" onClick={submit} />
    </div>
  )
}

const TRIVIA = [
  { q: "Which planet is known as the red planet?", a: "MARS", o: ["MARS", "VENUS", "JUPITER"] },
  { q: "What does CPU stand for?", a: "CENTRAL PROCESSING UNIT", o: ["CENTRAL PROCESSING UNIT", "CORE POWER UNIT", "CYBER PULSE UNIT"] },
  { q: "Which language powers React components here?", a: "TYPESCRIPT", o: ["TYPESCRIPT", "COBOL", "LUA"] },
]

function TriviaDuel({ update }: { difficulty: Difficulty; update: (r: Result, m: string, y?: number, n?: number) => void }) {
  const [idx, setIdx] = useState(0)
  const q = TRIVIA[idx % TRIVIA.length]
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/85">{q.q}</p>
      <div className="grid gap-2">
        {q.o.map((o) => (
          <GameButton key={o} color="#00f0ff" label={o} onClick={() => {
            const ok = o === q.a
            update(ok ? "win" : "lose", ok ? "Correct. Trivia dignity preserved." : `Wrong. Answer: ${q.a}.`, ok ? 1 : 0, ok ? 0 : 1)
            setIdx((i) => i + 1)
          }} />
        ))}
      </div>
    </div>
  )
}

const WORDS = ["ROBOT", "NEON", "CYBER", "PRANK", "ARCADE", "MATRIX"]

function WordScramble({ difficulty, update }: { difficulty: Difficulty; update: (r: Result, m: string, y?: number, n?: number) => void }) {
  const word = WORDS[(difficulty === "HARD" ? 5 : difficulty === "ADAPTIVE" ? 2 : 0)]
  const scrambled = useMemo(() => word.split("").sort(() => Math.random() - 0.5).join(""), [word])
  const [answer, setAnswer] = useState("")
  return (
    <div className="space-y-2">
      <p className="ps-heading text-2xl ps-text-purple">{scrambled}</p>
      <div className="flex gap-2">
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none" style={{ boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.4)" }} />
        <GameButton color="#b829ff" label="SOLVE" onClick={() => {
          const ok = answer.trim().toUpperCase() === word
          update(ok ? "win" : "lose", ok ? "Word unscrambled." : `Nope. It was ${word}.`, ok ? 1 : 0, ok ? 0 : 1)
          setAnswer("")
        }} />
      </div>
    </div>
  )
}

const EMOJIS = [
  { q: "🤖⚡🌃", a: "CYBER ROBOT", o: ["CYBER ROBOT", "SLEEPY TOASTER", "MOON PIZZA"] },
  { q: "🔔😂🚪", a: "DOORBELL PRANK", o: ["DOORBELL PRANK", "CAR RACE", "RAIN CLOUD"] },
  { q: "🎮⚔️🏆", a: "GAME DUEL", o: ["GAME DUEL", "SANDWICH", "SPACE TAX"] },
]

function EmojiDecode({ update }: { difficulty: Difficulty; update: (r: Result, m: string, y?: number, n?: number) => void }) {
  const [idx, setIdx] = useState(0)
  const item = EMOJIS[idx % EMOJIS.length]
  return (
    <div className="space-y-2">
      <p className="text-3xl">{item.q}</p>
      <div className="grid gap-2">
        {item.o.map((o) => (
          <GameButton key={o} color="#ff2d9c" label={o} onClick={() => {
            const ok = o === item.a
            update(ok ? "win" : "lose", ok ? "Emoji signal decoded." : `Decode failed. It was ${item.a}.`, ok ? 1 : 0, ok ? 0 : 1)
            setIdx((i) => i + 1)
          }} />
        ))}
      </div>
    </div>
  )
}

const RAPID = [
  { q: "2 + 2?", a: "4" },
  { q: "Color of NEO cyan glow?", a: "CYAN" },
  { q: "Opposite of lose?", a: "WIN" },
]

function RapidFire({ difficulty, update }: { difficulty: Difficulty; update: (r: Result, m: string, y?: number, n?: number) => void }) {
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState("")
  const target = targetScore(difficulty)
  const q = RAPID[idx % RAPID.length]
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/85">{q.q} {"//"} FIRST TO {target}</p>
      <div className="flex gap-2">
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none" style={{ boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.4)" }} />
        <GameButton color="#ff7a00" label="FIRE" onClick={() => {
          const ok = answer.trim().toUpperCase() === q.a
          update(ok ? "win" : "lose", ok ? "Rapid point acquired." : `Miss. Answer: ${q.a}.`, ok ? 1 : 0, ok ? 0 : 1)
          setIdx((i) => i + 1)
          setAnswer("")
        }} />
      </div>
    </div>
  )
}

const WYR = [
  ["Have neon shoes", "Have a robot backpack"],
  ["Speak in modem sounds", "Glow when you lie"],
  ["Win trivia forever", "Never lose RPS"],
]

function WouldYouRather({ update }: { update: (r: Result, m: string, y?: number, n?: number) => void }) {
  const [idx, setIdx] = useState(0)
  const pair = WYR[idx % WYR.length]
  const choose = (pick: string) => {
    update("draw", `You chose: ${pick}. NEO respects the weirdness.`, 1, 1)
    setIdx((i) => i + 1)
  }
  return (
    <div className="grid gap-2">
      <GameButton color="#39ff14" label={pair[0]} onClick={() => choose(pair[0])} />
      <GameButton color="#39ff14" label={pair[1]} onClick={() => choose(pair[1])} />
    </div>
  )
}

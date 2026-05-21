"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Hand, Scissors, Square } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { NeonPanel } from "../neon-panel"
import { useApp } from "@/lib/store"

type Choice = "rock" | "paper" | "scissors"
const CHOICES: { id: Choice; icon: LucideIcon; label: string; color: string }[] = [
  { id: "rock", icon: Square, label: "ROCK", color: "#ff7a00" },
  { id: "paper", icon: Hand, label: "PAPER", color: "#00f0ff" },
  { id: "scissors", icon: Scissors, label: "SCISSORS", color: "#ff2d9c" },
]
const BEATS: Record<Choice, Choice> = { rock: "scissors", paper: "rock", scissors: "paper" }
const counter = (c: Choice): Choice => c === "rock" ? "paper" : c === "paper" ? "scissors" : "rock"

export function RockPaperScissorsGame({ onClose }: { onClose?: () => void }) {
  const { playAvatarReaction, settings, recordGameResult } = useApp()
  const [you, setYou] = useState<Choice | null>(null)
  const [bot, setBot] = useState<Choice | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [score, setScore] = useState({ you: 0, bot: 0 })
  const [history, setHistory] = useState<Choice[]>([])
  const [streak, setStreak] = useState(0)
  const target = settings.gameDifficulty === "HARD" ? 5 : 3
  const result = useMemo(() => you && bot ? (you === bot ? "draw" : BEATS[you] === bot ? "win" : "lose") : null, [you, bot])

  const botPick = (choice: Choice) => {
    const options: Choice[] = ["rock", "paper", "scissors"]
    if (settings.gameDifficulty === "EASY") return options[Math.floor(Math.random() * 3)]
    const recent = [...history.slice(-4), choice]
    const freq = recent.reduce((a, c) => ({ ...a, [c]: (a[c] ?? 0) + 1 }), {} as Record<Choice, number>)
    const most = (Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] as Choice | undefined) ?? choice
    if (settings.gameDifficulty === "ADAPTIVE") return Math.random() < 0.6 ? counter(most) : options[Math.floor(Math.random() * 3)]
    return Math.random() < 0.85 ? counter(most) : options[Math.floor(Math.random() * 3)]
  }

  const play = (choice: Choice) => {
    if (revealing || score.you >= target || score.bot >= target) return
    setYou(choice); setBot(null); setRevealing(true)
    setTimeout(() => {
      const pick = botPick(choice)
      setBot(pick); setRevealing(false); setHistory((h) => [...h, choice].slice(-6))
      if (choice === pick) { playAvatarReaction("surprised"); return }
      if (BEATS[choice] === pick) { playAvatarReaction("ecstatic"); setStreak((s) => s + 1); setScore((s) => ({ ...s, you: s.you + 1 })) }
      else { playAvatarReaction("angry"); setStreak(0); setScore((s) => ({ ...s, bot: s.bot + 1 })) }
    }, 900)
  }

  const done = score.you >= target || score.bot >= target
  if (done) recordGameResult({ game: "rps", result: score.you > score.bot ? "win" : "lose", difficulty: settings.gameDifficulty, score: score.you, streak })

  const status = revealing ? "NEO PREDICTION MATRIX RUNNING…" : done ? (score.you > score.bot ? "MATCH WON." : "MATCH LOST.") : result === "win" ? "YOU WIN ROUND." : result === "lose" ? "NEO TAKES ROUND." : result === "draw" ? "DRAW." : "PICK YOUR HAND"

  return <NeonPanel accent="pink" glow="strong" className="p-3"><div className="flex items-center justify-between"><div><p className="ps-mono text-[10px] tracking-[0.3em] ps-text-pink">ROCK_PAPER_SCISSORS // FIRST_TO_{target}</p><p className="ps-mono text-[10px] tracking-[0.25em] text-white/65">{status}</p></div><div className="flex items-center gap-2"><ScorePill label="YOU" value={score.you} color="#00f0ff" /><ScorePill label="NEO" value={score.bot} color="#ff2d9c" />{onClose && <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 ps-mono text-[10px] tracking-[0.25em] text-white/85" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}>EXIT</button>}</div></div>
  <div className="mt-2 flex flex-wrap gap-1">{history.map((h,i)=><span key={`${h}-${i}`} className="rounded-full px-2 py-1 ps-mono text-[9px] tracking-[0.2em]" style={{color:"#ffb1df",background:"rgba(255,45,156,0.16)",boxShadow:"inset 0 0 0 1px rgba(255,45,156,0.45)"}}>{h.toUpperCase()}</span>)}</div>
  <div className="mt-3 grid grid-cols-2 gap-2"><RevealSlot label="YOUR_HAND" choice={you} active={Boolean(you) && !revealing} color="#00f0ff" /><RevealSlot label="NEO_HAND" choice={bot} active={Boolean(bot)} color="#ff2d9c" loading={revealing} /></div>
  <div className="mt-3 grid grid-cols-3 gap-2">{CHOICES.map((c)=>{const Icon=c.icon; return <motion.button key={c.id} type="button" whileTap={{ scale: 0.95 }} onClick={() => play(c.id)} disabled={revealing || done} className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl" style={{ background: "rgba(0,0,0,0.5)", boxShadow: `inset 0 0 0 1px ${c.color}55, 0 0 12px ${c.color}33` }}><Icon className="h-5 w-5" style={{ color: c.color, filter: `drop-shadow(0 0 8px ${c.color})` }} /><span className="ps-mono text-[10px] tracking-[0.25em]" style={{ color: c.color }}>{c.label}</span></motion.button>})}</div>
  </NeonPanel>
}

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) { return <div className="flex items-center gap-1.5 rounded-full px-2 py-1" style={{ boxShadow: `inset 0 0 0 1px ${color}55` }}><span className="ps-mono text-[9px] tracking-[0.2em] text-white/55">{label}</span><span className="ps-mono text-[10px] tracking-widest font-bold" style={{ color, textShadow: `0 0 8px ${color}` }}>{value}</span></div> }
function RevealSlot({ label, choice, active, color, loading }: { label: string; choice: Choice | null; active: boolean; color: string; loading?: boolean }) { const c = CHOICES.find((x) => x.id === choice); const Icon = c?.icon; return <div className="flex h-28 flex-col items-center justify-center rounded-xl" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.6))", boxShadow: active ? `inset 0 0 0 1px ${color}, 0 0 18px ${color}55` : `inset 0 0 0 1px ${color}33` }}><p className="ps-mono text-[9px] tracking-[0.3em] text-white/55">{label}</p><AnimatePresence mode="wait">{loading ? <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1 flex items-center gap-1">{[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} animate={{ scale: [0.6, 1.1, 0.6] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />)}</motion.div> : Icon ? <motion.div key={choice} initial={{ opacity: 0, scale: 0.6, rotate: -15 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} className="mt-1 flex flex-col items-center"><Icon className="h-9 w-9" style={{ color, filter: `drop-shadow(0 0 12px ${color})` }} /><span className="mt-1 ps-mono text-[10px] tracking-[0.3em]" style={{ color }}>{choice?.toUpperCase()}</span></motion.div> : <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} className="mt-1 ps-mono text-[10px] tracking-[0.3em] text-white/40">—</motion.span>}</AnimatePresence></div> }

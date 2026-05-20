"use client"

import { motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { RotateCcw } from "lucide-react"
import { NeonPanel } from "../neon-panel"
import { useApp } from "@/lib/store"

type Cell = "X" | "O" | null
type Board = Cell[]
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

const bestOfByDiff = { EASY: 3, ADAPTIVE: 3, HARD: 5 } as const
const tieLines = ["Stalemate. Your logic core is suspiciously competent.", "Grid lock. NEO requests overtime.", "Tie game. Neither side blinked."]

const w = (b: Board) => { for (const l of LINES) { const [a,c,d] = l; if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: l as number[] } } return { who: null, line: null as number[] | null } }
const open = (b: Board) => b.map((v,i)=>v?null:i).filter((v):v is number => v !== null)
const heuristic = (b: Board) => { for (const i of open(b)) { const t=[...b]; t[i]="O"; if (w(t).who==="O") return i } for (const i of open(b)) { const t=[...b]; t[i]="X"; if (w(t).who==="X") return i } if (!b[4]) return 4; const corners=[0,2,6,8].filter(i=>!b[i]); if (corners.length) return corners[Math.floor(Math.random()*corners.length)]; const sides=[1,3,5,7].filter(i=>!b[i]); return sides[0] ?? -1 }
function minimax(b: Board, isBot: boolean): { score: number; idx: number } { const res = w(b).who; if (res === "O") return { score: 10, idx: -1 }; if (res === "X") return { score: -10, idx: -1 }; if (open(b).length===0) return { score: 0, idx: -1 }; let best = { score: isBot ? -999 : 999, idx: -1 }; for (const i of open(b)) { const next = [...b]; next[i] = isBot ? "O" : "X"; const r = minimax(next, !isBot); if (isBot ? r.score > best.score : r.score < best.score) best = { score: r.score, idx: i } } return best }

export function TicTacToeGame({ onClose }: { onClose?: () => void }) {
  const { playAvatarReaction, settings, recordGameResult } = useApp()
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [turn, setTurn] = useState<"X" | "O">("X")
  const [match, setMatch] = useState({ you: 0, neo: 0, draws: 0, round: 1 })
  const targetWins = useMemo(() => Math.ceil(bestOfByDiff[settings.gameDifficulty] / 2), [settings.gameDifficulty])
  const { who, line } = w(board)
  const isDraw = !who && board.every(Boolean)
  const roundOver = Boolean(who) || isDraw
  const matchOver = match.you >= targetWins || match.neo >= targetWins

  useEffect(() => {
    if (!roundOver) return
    if (who === "X") { playAvatarReaction("ecstatic"); setMatch((m)=>({ ...m, you: m.you + 1 })) }
    else if (who === "O") { playAvatarReaction("angry"); setMatch((m)=>({ ...m, neo: m.neo + 1 })) }
    else { playAvatarReaction("surprised"); setMatch((m)=>({ ...m, draws: m.draws + 1 })) }
  }, [roundOver, who, playAvatarReaction])

  useEffect(() => {
    if (turn !== "O" || roundOver || matchOver) return
    const id = setTimeout(() => {
      const m = settings.gameDifficulty === "HARD" ? minimax(board, true).idx : heuristic(board)
      const mistakeChance = settings.gameDifficulty === "EASY" ? 0.35 : settings.gameDifficulty === "ADAPTIVE" ? 0.12 : 0
      const useMistake = Math.random() < mistakeChance
      const pool = open(board)
      const move = useMistake && pool.length ? pool[Math.floor(Math.random() * pool.length)] : m
      if (move >= 0) { const next=[...board]; next[move]="O"; setBoard(next); setTurn("X") }
    }, 550)
    return () => clearTimeout(id)
  }, [turn, board, roundOver, matchOver, settings.gameDifficulty])

  useEffect(() => {
    if (!matchOver) return
    const result = match.you > match.neo ? "win" : "lose"
    recordGameResult({ game: "tictactoe", result, difficulty: settings.gameDifficulty, score: match.you, streak: match.you })
  }, [matchOver, match.you, match.neo, recordGameResult, settings.gameDifficulty])

  const status = roundOver
    ? who === "X" ? "ROUND WON. NEO REQUESTS REMATCH." : who === "O" ? "NEO TAKES THE ROUND." : tieLines[match.round % tieLines.length]
    : turn === "X" ? "YOUR TURN — PLAY X" : "NEO CALCULATING…"

  return <NeonPanel accent="cyan" glow="strong" className="p-3"><div className="flex items-center justify-between"><div><p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan">TIC_TAC_TOE // BEST_OF_{bestOfByDiff[settings.gameDifficulty]}</p><p className="ps-mono text-[10px] tracking-[0.25em] text-white/65">ROUND {match.round} · YOU {match.you} / NEO {match.neo} · {status}</p></div><div className="flex gap-1.5"><button type="button" onClick={()=>{setBoard(Array(9).fill(null));setTurn("X");setMatch({you:0,neo:0,draws:0,round:1})}} aria-label="Reset" className="grid h-9 w-9 place-items-center rounded-lg text-white/80" style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.5)" }}><RotateCcw className="h-4 w-4" /></button>{onClose && <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 ps-mono text-[10px] tracking-[0.25em] text-white/85" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}>EXIT</button>}</div></div>
  <div className="mx-auto mt-3 grid w-full max-w-[320px] grid-cols-3 gap-2">{board.map((cell,i)=>{const isLine=line?.includes(i); const color=cell==="X"?"#00f0ff":cell==="O"?"#ff2d9c":"#ffffff"; return <motion.button key={i} type="button" whileTap={{scale:0.95}} onClick={()=>{ if(board[i]||roundOver||turn!=="X"||matchOver) return; const next=[...board]; next[i]="X"; setBoard(next); setTurn("O") }} disabled={Boolean(cell)||roundOver||turn!=="X"||matchOver} className="relative aspect-square rounded-xl" style={{background:"rgba(0,0,0,0.5)",boxShadow:isLine?`inset 0 0 0 1px ${color}, 0 0 22px ${color}AA`:"inset 0 0 0 1px rgba(0,240,255,0.35)"}}>{cell && <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} className="ps-heading absolute inset-0 grid place-items-center text-4xl" style={{ color, textShadow: `0 0 14px ${color}` }}>{cell}</motion.span>}</motion.button>})}</div>
  {roundOver && !matchOver && <button type="button" onClick={()=>{setBoard(Array(9).fill(null)); setTurn("X"); setMatch(m=>({ ...m, round:m.round+1 }))}} className="mt-3 w-full rounded-lg py-2 ps-mono text-[11px] tracking-[0.25em]" style={{background:"rgba(0,240,255,0.14)", color:"#00f0ff", boxShadow:"inset 0 0 0 1px rgba(0,240,255,0.5)"}}>NEXT ROUND</button>}
  {matchOver && <p className="mt-3 rounded-lg bg-black/50 px-3 py-2 text-center ps-mono text-[10px] tracking-[0.2em] text-white/80">{match.you > match.neo ? "MATCH WON. NEO FLAGS YOU AS HIGH-RISK." : "MATCH LOST. NEO SAVES REPLAY FOR TRAINING."}</p>}
  </NeonPanel>
}

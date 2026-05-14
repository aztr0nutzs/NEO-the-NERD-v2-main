"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { NeonPanel } from "../neon-panel"
import { useApp } from "@/lib/store"

type Cell = "X" | "O" | null
type Board = Cell[]

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function checkWinner(b: Board): { who: Cell; line: number[] | null } {
  for (const l of LINES) {
    const [a, c, d] = l
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: l }
  }
  return { who: null, line: null }
}

function bestMove(b: Board): number {
  // Try win
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      const t = [...b] as Board
      t[i] = "O"
      if (checkWinner(t).who === "O") return i
    }
  }
  // Block
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      const t = [...b] as Board
      t[i] = "X"
      if (checkWinner(t).who === "X") return i
    }
  }
  if (!b[4]) return 4
  const corners = [0, 2, 6, 8].filter((i) => !b[i])
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)]
  const sides = [1, 3, 5, 7].filter((i) => !b[i])
  if (sides.length) return sides[Math.floor(Math.random() * sides.length)]
  return -1
}

export function TicTacToeGame({ onClose }: { onClose?: () => void }) {
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [turn, setTurn] = useState<"X" | "O">("X")
  const { playAvatarReaction } = useApp()
  const { who, line } = checkWinner(board)
  const isDraw = !who && board.every(Boolean)
  const over = Boolean(who) || isDraw

  useEffect(() => {
    if (who === "X") playAvatarReaction("ecstatic")
    if (who === "O") playAvatarReaction("angry")
    if (isDraw) playAvatarReaction("surprised")
  }, [isDraw, playAvatarReaction, who])

  useEffect(() => {
    if (turn === "O" && !over) {
      const t = setTimeout(() => {
        const m = bestMove(board)
        if (m >= 0) {
          const next = [...board]
          next[m] = "O"
          setBoard(next)
          setTurn("X")
        }
      }, 700)
      return () => clearTimeout(t)
    }
  }, [turn, board, over])

  const click = (i: number) => {
    if (board[i] || over || turn !== "X") return
    const next = [...board]
    next[i] = "X"
    setBoard(next)
    setTurn("O")
  }

  const reset = () => {
    setBoard(Array(9).fill(null))
    setTurn("X")
  }

  const status = who
    ? who === "X"
      ? "YOU WIN. NEO IS RECALIBRATING."
      : "NEO WINS. RUN IT BACK?"
    : isDraw
      ? "STALEMATE. BOTH HUMANS DETECTED."
      : turn === "X"
        ? "YOUR TURN — PLAY X"
        : "NEO IS THINKING…"

  return (
    <NeonPanel accent="cyan" glow="strong" className="p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan">TIC_TAC_TOE</p>
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/65">{status}</p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={reset}
            aria-label="Reset"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80"
            style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.5)" }}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 ps-mono text-[10px] tracking-[0.25em] text-white/85"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
            >
              EXIT
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto mt-3 grid w-full max-w-[320px] grid-cols-3 gap-2">
        {board.map((cell, i) => {
          const isLine = line?.includes(i)
          const color =
            cell === "X" ? "#00f0ff" : cell === "O" ? "#ff2d9c" : "#ffffff"
          return (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => click(i)}
              disabled={Boolean(cell) || over || turn !== "X"}
              className="relative aspect-square rounded-xl"
              style={{
                background: "rgba(0,0,0,0.5)",
                boxShadow: isLine
                  ? `inset 0 0 0 1px ${color}, 0 0 22px ${color}AA`
                  : "inset 0 0 0 1px rgba(0,240,255,0.35)",
              }}
            >
              {cell && (
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="ps-heading absolute inset-0 grid place-items-center text-4xl"
                  style={{
                    color,
                    textShadow: `0 0 14px ${color}`,
                  }}
                >
                  {cell}
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>
    </NeonPanel>
  )
}

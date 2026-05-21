"use client"

import { motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

const CONFIG = {
  EASY:     { size: 4, trapPct: 0.2,  seconds: 30 },
  ADAPTIVE: { size: 5, trapPct: 0.25, seconds: 35 },
  HARD:     { size: 6, trapPct: 0.3,  seconds: 35 },
} as const

type Cell = { trap: boolean; revealed: boolean; safe: boolean; onPath: boolean }
type Grid = Cell[][]

function neighbors(r: number, c: number, size: number): [number, number][] {
  const out: [number, number][] = []
  if (r > 0) out.push([r - 1, c])
  if (r < size - 1) out.push([r + 1, c])
  if (c > 0) out.push([r, c - 1])
  if (c < size - 1) out.push([r, c + 1])
  return out
}

function adjacentTrapCount(grid: Grid, r: number, c: number): number {
  let n = 0
  for (const [nr, nc] of neighbors(r, c, grid.length)) {
    if (grid[nr][nc].trap) n++
  }
  return n
}

function hasPath(grid: Grid): boolean {
  const size = grid.length
  if (grid[0][0].trap || grid[size - 1][size - 1].trap) return false
  const visited = Array.from({ length: size }, () => Array(size).fill(false))
  const stack: [number, number][] = [[0, 0]]
  visited[0][0] = true
  while (stack.length) {
    const [r, c] = stack.pop()!
    if (r === size - 1 && c === size - 1) return true
    for (const [nr, nc] of neighbors(r, c, size)) {
      if (!visited[nr][nc] && !grid[nr][nc].trap) {
        visited[nr][nc] = true
        stack.push([nr, nc])
      }
    }
  }
  return false
}

function generateGrid(size: number, trapPct: number): Grid {
  for (let attempt = 0; attempt < 50; attempt++) {
    const grid: Grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({ trap: false, revealed: false, safe: false, onPath: false })),
    )
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if ((r === 0 && c === 0) || (r === size - 1 && c === size - 1)) continue
        if (Math.random() < trapPct) grid[r][c].trap = true
      }
    }
    if (hasPath(grid)) return grid
  }
  // fallback: clear a straight corridor
  const grid: Grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ trap: false, revealed: false, safe: false, onPath: false })),
  )
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r === 0 && c === 0) || (r === size - 1 && c === size - 1) || r === 0 || c === size - 1) continue
      if (Math.random() < trapPct) grid[r][c].trap = true
    }
  }
  return grid
}

export function FirewallBreachGame({ difficulty, update }: ArcadeGameComponentProps) {
  const { size, trapPct, seconds } = CONFIG[difficulty]
  const [grid, setGrid] = useState<Grid>(() => generateGrid(size, trapPct))
  const [phase, setPhase] = useState<"playing" | "won" | "lost">("playing")
  const [path, setPath] = useState<[number, number][]>([])
  const [moves, setMoves] = useState(0)
  const [left, setLeft] = useState<number>(seconds)
  const [bestTime, setBestTime] = useState<number | null>(null)
  const [bestMoves, setBestMoves] = useState<number | null>(null)
  const [startAt, setStartAt] = useState<number>(() => Date.now())
  const recordedRef = useRef(false)

  const core: [number, number] = useMemo(() => [size - 1, size - 1], [size])

  const endRun = (result: "win" | "lose", reason: string) => {
    setPhase(result === "win" ? "won" : "lost")
    if (recordedRef.current) return
    recordedRef.current = true
    const elapsed = Date.now() - startAt
    if (result === "win") {
      setBestTime((b) => (b === null ? elapsed : Math.min(b, elapsed)))
      setBestMoves((b) => (b === null ? moves + 1 : Math.min(b, moves + 1)))
    }
    update(
      result,
      `${reason} · ${moves} MOVES · ${Math.ceil(elapsed / 1000)}S · ${difficulty}`,
      result === "win"
        ? { score: Math.max(1, 200 - moves * 5 - Math.ceil(elapsed / 1000)), completionTimeMs: elapsed, forceProgression: true }
        : { neoScore: 1, forceProgression: true },
    )
  }

  useEffect(() => {
    if (phase !== "playing") return
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== "playing") return
    if (left === 0) endRun("lose", "TIME EXPIRED")
  }, [left, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (r: number, c: number) => {
    if (phase !== "playing") return
    const lastInPath = path[path.length - 1]
    // First click must be entry (0,0)
    if (path.length === 0) {
      if (r !== 0 || c !== 0) return
    } else {
      const [lr, lc] = lastInPath
      const isAdjacent = Math.abs(lr - r) + Math.abs(lc - c) === 1
      if (!isAdjacent) return
      if (grid[r][c].revealed) return
    }
    const cell = grid[r][c]
    const nextGrid = grid.map((row) => row.map((c) => ({ ...c })))
    nextGrid[r][c].revealed = true
    if (cell.trap) {
      // reveal all traps on loss
      for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (nextGrid[i][j].trap) nextGrid[i][j].revealed = true
      setGrid(nextGrid)
      setMoves((m) => m + 1)
      endRun("lose", "TRAP TRIGGERED")
      return
    }
    nextGrid[r][c].safe = true
    nextGrid[r][c].onPath = true
    setGrid(nextGrid)
    setPath((p) => [...p, [r, c]])
    setMoves((m) => m + 1)

    if (r === core[0] && c === core[1]) {
      endRun("win", "CORE REACHED")
      return
    }
    update("playing", `Node clear · adj traps ${adjacentTrapCount(nextGrid, r, c)}.`, { score: 0 })
  }

  const newRound = () => {
    setGrid(generateGrid(size, trapPct))
    setPath([])
    setMoves(0)
    setLeft(seconds)
    setPhase("playing")
    setStartAt(Date.now())
    recordedRef.current = false
  }

  const cellSizeClass = size === 4 ? "h-14 w-14 text-base" : size === 5 ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs"

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 ps-mono text-[10px] tracking-[0.2em] text-pink-200">
        <p>GRID {size}×{size}</p>
        <p className="text-center">MOVES {moves}</p>
        <p className="text-right">T-{left}S</p>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${(left / seconds) * 100}%`,
            background: left <= 5 ? "linear-gradient(90deg,#ff2d9c,#ff7a00)" : "linear-gradient(90deg,#ff2d9c,#b829ff)",
          }}
        />
      </div>

      <div className={`grid gap-1 mx-auto`} style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, maxWidth: 360 }}>
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isEntry = r === 0 && c === 0
            const isCore = r === core[0] && c === core[1]
            const last = path[path.length - 1]
            const isLast = last && last[0] === r && last[1] === c
            const canTap = (() => {
              if (phase !== "playing") return false
              if (path.length === 0) return isEntry
              if (cell.revealed) return false
              return last && Math.abs(last[0] - r) + Math.abs(last[1] - c) === 1
            })()
            const adj = cell.safe ? adjacentTrapCount(grid, r, c) : 0
            const bg = cell.trap && cell.revealed
              ? "rgba(255,45,156,0.35)"
              : cell.onPath
                ? "rgba(57,255,20,0.18)"
                : isEntry
                  ? "rgba(57,255,20,0.12)"
                  : isCore
                    ? "rgba(255,45,156,0.12)"
                    : "rgba(0,0,0,0.5)"
            const shadow = cell.trap && cell.revealed
              ? "inset 0 0 0 1px #ff2d9c, 0 0 12px #ff2d9c88"
              : isLast
                ? "inset 0 0 0 1px #39ff14, 0 0 12px #39ff14aa"
                : cell.onPath
                  ? "inset 0 0 0 1px rgba(57,255,20,0.55)"
                  : isEntry
                    ? "inset 0 0 0 1px rgba(57,255,20,0.5)"
                    : isCore
                      ? "inset 0 0 0 1px rgba(255,45,156,0.5)"
                      : "inset 0 0 0 1px rgba(255,255,255,0.08)"
            const label = cell.trap && cell.revealed
              ? "✕"
              : cell.safe
                ? (adj > 0 ? `${adj}` : "·")
                : isEntry && path.length === 0
                  ? "⌂"
                  : isCore
                    ? "◎"
                    : ""
            return (
              <motion.button
                key={`${r}-${c}`}
                type="button"
                disabled={!canTap}
                onClick={() => tap(r, c)}
                whileTap={canTap ? { scale: 0.94 } : {}}
                className={`grid ${cellSizeClass} place-items-center rounded-md ps-mono`}
                style={{ background: bg, boxShadow: shadow, color: cell.trap && cell.revealed ? "#ff2d9c" : cell.onPath ? "#9bff8f" : "rgba(255,255,255,0.6)" }}
              >
                {label}
              </motion.button>
            )
          }),
        )}
      </div>

      {phase !== "playing" && (
        <div className="rounded-lg bg-black/55 px-3 py-2 space-y-2">
          <p className="ps-mono text-[11px] tracking-[0.25em]" style={{ color: phase === "won" ? "#39ff14" : "#ff2d9c" }}>
            {phase === "won" ? "CORE BREACHED" : "FIREWALL HELD"}
          </p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/60">
            {moves} MOVES · {Math.ceil((Date.now() - startAt) / 1000)}S · {difficulty}
          </p>
          {(bestTime !== null || bestMoves !== null) && (
            <p className="ps-mono text-[9px] tracking-[0.2em] text-white/45">
              BEST TIME {bestTime !== null ? `${Math.ceil(bestTime / 1000)}S` : "--"} · BEST MOVES {bestMoves ?? "--"}
            </p>
          )}
          <button
            type="button"
            onClick={newRound}
            className="w-full rounded-lg py-2 ps-mono text-[11px] tracking-[0.25em]"
            style={{ background: "rgba(255,45,156,0.16)", color: "#ff2d9c", boxShadow: "inset 0 0 0 1px rgba(255,45,156,0.5)" }}
          >
            NEW BREACH
          </button>
        </div>
      )}
    </div>
  )
}

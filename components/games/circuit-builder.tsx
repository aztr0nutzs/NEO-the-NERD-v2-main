"use client"

import { motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"

// sides[0]=N sides[1]=E sides[2]=S sides[3]=W
type Sides = [boolean, boolean, boolean, boolean]

const SHAPES = {
  empty:    [false, false, false, false] as Sides,
  straight: [true,  false, true,  false] as Sides,
  bend:     [true,  true,  false, false] as Sides,
  tee:      [true,  true,  true,  false] as Sides,
  cross:    [true,  true,  true,  true]  as Sides,
}

type Shape = keyof typeof SHAPES

interface Tile {
  shape: Shape
  rotation: 0 | 1 | 2 | 3
  fixed?: boolean // source/target
}

const CONFIG = {
  EASY:     { size: 3, junctions: 0, decoys: 1, seconds: 90 },
  ADAPTIVE: { size: 4, junctions: 1, decoys: 2, seconds: 120 },
  HARD:     { size: 5, junctions: 1, decoys: 3, seconds: 150 },
} as const

function rotated(sides: Sides, rot: number): Sides {
  // rotating 90° CW: new[i] = old[(i - 1 + 4) % 4]
  const out: boolean[] = [false, false, false, false]
  for (let i = 0; i < 4; i++) out[i] = sides[(i - rot + 4) % 4]
  return out as Sides
}

function tileSides(t: Tile): Sides {
  return rotated(SHAPES[t.shape], t.rotation)
}

function connects(a: Tile, b: Tile, dirFromA: number): boolean {
  const sa = tileSides(a)
  const sb = tileSides(b)
  const dirFromB = (dirFromA + 2) % 4
  return sa[dirFromA] && sb[dirFromB]
}

function isSolved(grid: Tile[][], size: number): { ok: boolean; path: Set<string> } {
  const visited = new Set<string>()
  const path = new Set<string>()
  const stack: [number, number][] = [[0, 0]]
  visited.add("0,0")
  while (stack.length) {
    const [r, c] = stack.pop()!
    path.add(`${r},${c}`)
    if (r === size - 1 && c === size - 1) return { ok: true, path }
    const neighbors: [number, number, number][] = [
      [r - 1, c, 0], [r, c + 1, 1], [r + 1, c, 2], [r, c - 1, 3],
    ]
    for (const [nr, nc, dir] of neighbors) {
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      if (connects(grid[r][c], grid[nr][nc], dir)) {
        visited.add(key)
        stack.push([nr, nc])
      }
    }
  }
  return { ok: false, path: new Set() }
}

function generate(size: number, junctions: number, decoys: number): Tile[][] {
  // Build an L-shaped solution path: row 0 west→east, then col (size-1) north→south.
  const grid: Tile[][] = []
  for (let r = 0; r < size; r++) {
    const row: Tile[] = []
    for (let c = 0; c < size; c++) row.push({ shape: "empty", rotation: 0 })
    grid.push(row)
  }
  // place path
  for (let c = 0; c < size; c++) {
    if (c === 0) {
      // source corner: bend N-E (open east + south)
      grid[0][c] = { shape: "bend", rotation: 1, fixed: true } // sides after rot=1: [W,N,E,S]→shift: actually we want E + S
    } else if (c === size - 1) {
      // top-right corner: bend E-S becomes after using shape bend [N,E,S,W]=[1,1,0,0]; we want W + S
      grid[0][c] = { shape: "bend", rotation: 2 } // bend rotated twice → [S,W,N,E]→[true,true,false,false] rotated 2 → originally [N,E,S,W]=[T,T,F,F] → rot2 = [S,W,N,E]=[T,T,F,F]→ [T,T,F,F] mapped... ; we'll just use straight if needed
    } else {
      grid[0][c] = { shape: "straight", rotation: 1 } // straight rotated 90° → E-W
    }
  }
  for (let r = 1; r < size; r++) {
    if (r === size - 1) {
      grid[r][size - 1] = { shape: "bend", rotation: 3, fixed: true } // we'll adjust
    } else {
      grid[r][size - 1] = { shape: "straight", rotation: 0 } // straight N-S
    }
  }
  // Recompute corner tiles with explicit sides via custom shapes
  // Use bend variants manually: bend default = [N,E,S,W] = [T,T,F,F] (N+E). Rotations:
  //  rot 0: N+E
  //  rot 1: E+S
  //  rot 2: S+W
  //  rot 3: W+N
  // source corner (0,0): needs E + S → rot 1
  grid[0][0] = { shape: "bend", rotation: 1, fixed: true }
  // top-right corner (0, size-1): needs W + S → rot 2
  grid[0][size - 1] = { shape: "bend", rotation: 2 }
  // bottom-right target (size-1, size-1): needs N + W → rot 3
  grid[size - 1][size - 1] = { shape: "bend", rotation: 3, fixed: true }

  // Optionally turn one path tile into a tee (junction) with the path-required sides
  let junctionsLeft = junctions
  const innerPath: [number, number][] = []
  for (let c = 1; c < size - 1; c++) innerPath.push([0, c])
  for (let r = 1; r < size - 1; r++) innerPath.push([r, size - 1])
  for (const [r, c] of innerPath) {
    if (junctionsLeft <= 0) break
    if (Math.random() < 0.5) {
      // turn into tee that keeps the original two sides connected
      // straight rot 1 → sides E+W; straight rot 0 → N+S
      // we need a tee whose three sides include those two; rotate accordingly
      const isHoriz = r === 0
      // tee default sides [N,E,S,W]=[T,T,T,F]. We need both E and W open AND one extra (N or S).
      // For horizontal: need E + W → tee rot 2 → [S,W,N,E] = [T,F,T,T] — that's W,N,E open, S closed; lacks W actually let's pick:
      // We'll just put a cross — it has all four, always connects through the existing axis. Decoy "junction".
      grid[r][c] = { shape: "cross", rotation: 0 }
      junctionsLeft--
    }
  }

  // Sprinkle decoy tiles on non-path cells
  let decoysLeft = decoys
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c].shape !== "empty") continue
      if (decoysLeft <= 0) break
      if (Math.random() < 0.45) {
        const shapes: Shape[] = ["straight", "bend", "tee"]
        const shape = shapes[Math.floor(Math.random() * shapes.length)]
        grid[r][c] = { shape, rotation: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3 }
        decoysLeft--
      }
    }
  }

  // Randomize rotation on every non-fixed tile so the player has to solve it.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = grid[r][c]
      if (t.fixed || t.shape === "empty") continue
      // ensure starting rotation differs from solved rotation when possible (so puzzle isn't pre-solved)
      let rot = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3
      if (rot === t.rotation) rot = ((rot + 1) % 4) as 0 | 1 | 2 | 3
      t.rotation = rot
    }
  }

  return grid
}

function tilePath(t: Tile): string {
  const sides = tileSides(t)
  if (!sides.some(Boolean)) return ""
  // Draw lines from center to each open side midpoint.
  // Cell coord system 0..100.
  const midpoints = [
    [50, 0],   // N
    [100, 50], // E
    [50, 100], // S
    [0, 50],   // W
  ]
  const parts: string[] = []
  for (let i = 0; i < 4; i++) {
    if (sides[i]) parts.push(`M 50 50 L ${midpoints[i][0]} ${midpoints[i][1]}`)
  }
  return parts.join(" ")
}

export function CircuitBuilderGame({ difficulty, update }: ArcadeGameComponentProps) {
  const { size, junctions, decoys, seconds } = CONFIG[difficulty]
  const [grid, setGrid] = useState<Tile[][]>(() => generate(size, junctions, decoys))
  const [moves, setMoves] = useState(0)
  const [left, setLeft] = useState<number>(seconds)
  const [phase, setPhase] = useState<"playing" | "won" | "lost">("playing")
  const [startAt, setStartAt] = useState<number>(() => Date.now())
  const recordedRef = useRef(false)

  const solve = useMemo(() => isSolved(grid, size), [grid, size])

  useEffect(() => {
    if (phase !== "playing") return
    if (solve.ok) {
      const elapsed = Date.now() - startAt
      setPhase("won")
      if (!recordedRef.current) {
        recordedRef.current = true
        update(
          "win",
          `CIRCUIT LIVE · ${moves} MOVES · ${Math.ceil(elapsed / 1000)}S · ${difficulty}`,
          { score: Math.max(1, 200 - moves * 4 - Math.ceil(elapsed / 1000)), completionTimeMs: elapsed, forceProgression: true },
        )
      }
    }
  }, [solve.ok, phase, moves, startAt, difficulty, update])

  useEffect(() => {
    if (phase !== "playing") return
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== "playing") return
    if (left === 0 && !solve.ok && !recordedRef.current) {
      recordedRef.current = true
      setPhase("lost")
      update("lose", `CIRCUIT TIMEOUT · ${moves} MOVES · ${difficulty}`, { neoScore: 1, forceProgression: true })
    }
  }, [left, phase, solve.ok, moves, difficulty, update])

  const rotate = (r: number, c: number) => {
    if (phase !== "playing") return
    const t = grid[r][c]
    if (t.fixed || t.shape === "empty") return
    const next = grid.map((row) => row.map((cell) => ({ ...cell })))
    next[r][c].rotation = ((next[r][c].rotation + 1) % 4) as 0 | 1 | 2 | 3
    setGrid(next)
    setMoves((m) => m + 1)
  }

  const newRound = () => {
    setGrid(generate(size, junctions, decoys))
    setMoves(0)
    setLeft(seconds)
    setPhase("playing")
    setStartAt(Date.now())
    recordedRef.current = false
  }

  const cellSizeClass = size === 3 ? "h-20 w-20" : size === 4 ? "h-16 w-16" : "h-12 w-12"

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 ps-mono text-[10px] tracking-[0.2em] text-green-200">
        <p>GRID {size}×{size}</p>
        <p className="text-center">MOVES {moves}</p>
        <p className="text-right">T-{left}S</p>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${(left / seconds) * 100}%`,
            background: left <= 10 ? "linear-gradient(90deg,#ff2d9c,#ff7a00)" : "linear-gradient(90deg,#39ff14,#00f0ff)",
          }}
        />
      </div>

      <div
        className="grid gap-1 mx-auto"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, maxWidth: 360 }}
      >
        {grid.map((row, r) =>
          row.map((tile, c) => {
            const isSource = r === 0 && c === 0
            const isTarget = r === size - 1 && c === size - 1
            const cellKey = `${r},${c}`
            const live = phase === "won" || (solve.ok && solve.path.has(cellKey))
            const color = isSource ? "#39ff14" : isTarget ? "#00f0ff" : tile.shape === "empty" ? "rgba(255,255,255,0.05)" : "#9bff8f"
            const wireColor = live ? "#39ff14" : tile.shape === "empty" ? "transparent" : "rgba(155,255,143,0.85)"
            return (
              <motion.button
                key={cellKey}
                type="button"
                onClick={() => rotate(r, c)}
                disabled={tile.fixed || tile.shape === "empty" || phase !== "playing"}
                whileTap={tile.fixed || tile.shape === "empty" ? {} : { scale: 0.94 }}
                className={`relative grid ${cellSizeClass} place-items-center rounded-md`}
                style={{
                  background: isSource ? "rgba(57,255,20,0.12)" : isTarget ? "rgba(0,240,255,0.12)" : "rgba(0,0,0,0.5)",
                  boxShadow: live
                    ? `inset 0 0 0 1px ${color}, 0 0 14px ${color}aa`
                    : `inset 0 0 0 1px ${tile.shape === "empty" ? "rgba(255,255,255,0.06)" : "rgba(57,255,20,0.35)"}`,
                }}
                aria-label={`Cell ${r},${c}`}
              >
                {tile.shape !== "empty" && (
                  <svg viewBox="0 0 100 100" className="absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)]">
                    <path
                      d={tilePath(tile)}
                      stroke={wireColor}
                      strokeWidth={live ? 12 : 8}
                      strokeLinecap="round"
                      fill="none"
                      style={{ filter: live ? `drop-shadow(0 0 6px ${wireColor})` : "none" }}
                    />
                    {tile.shape !== "straight" && (
                      <circle cx={50} cy={50} r={live ? 8 : 6} fill={live ? color : "rgba(155,255,143,0.7)"} />
                    )}
                  </svg>
                )}
                {(isSource || isTarget) && (
                  <span
                    className="absolute ps-mono text-[9px] tracking-[0.2em]"
                    style={{ color, top: 2, left: 4 }}
                  >
                    {isSource ? "SRC" : "TGT"}
                  </span>
                )}
              </motion.button>
            )
          }),
        )}
      </div>

      {phase !== "playing" && (
        <div className="rounded-lg bg-black/55 px-3 py-2 space-y-2">
          <p className="ps-mono text-[11px] tracking-[0.25em]" style={{ color: phase === "won" ? "#39ff14" : "#ff2d9c" }}>
            {phase === "won" ? "CIRCUIT LIVE" : "CIRCUIT FAILED"}
          </p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/65">
            {moves} MOVES · {Math.ceil((Date.now() - startAt) / 1000)}S · {difficulty}
          </p>
          <ArcadeGameButton color="#39ff14" label="NEW CIRCUIT" onClick={newRound} />
        </div>
      )}
    </div>
  )
}

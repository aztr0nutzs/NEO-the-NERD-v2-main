/**
 * N.E.O. CONNECT 4 / Knxt 4 — Game core (TypeScript)
 * Ported from the standalone game-core.js.
 * Board is row-major 6x7, index 0 = top row. 0 = empty, 1 = P1 (you), 2 = P2 (NEO).
 */

export const ROWS = 6
export const COLS = 7

export type Cell = 0 | 1 | 2
export type Player = 1 | 2
export type Board = Cell[][]

export interface WinResult {
  player: Player
  cells: { r: number; c: number }[]
}

export const makeBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0))

export const cloneBoard = (b: Board): Board => b.map((r) => r.slice() as Cell[])

export const dropRow = (b: Board, c: number): number => {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r][c] === 0) return r
  return -1
}

export const drop = (b: Board, c: number, p: Player): { r: number; c: number } | null => {
  const r = dropRow(b, c)
  if (r < 0) return null
  b[r][c] = p
  return { r, c }
}

export const validCols = (b: Board): number[] => {
  const out: number[] = []
  for (let c = 0; c < COLS; c++) if (b[0][c] === 0) out.push(c)
  return out
}

export const isFull = (b: Board): boolean => validCols(b).length === 0

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

export const findWin = (b: Board): WinResult | null => {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c]
      if (!p) continue
      for (const [dr, dc] of DIRS) {
        const cells = [{ r, c }]
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k
          const nc = c + dc * k
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break
          if (b[nr][nc] !== p) break
          cells.push({ r: nr, c: nc })
        }
        if (cells.length === 4) return { player: p as Player, cells }
      }
    }
  }
  return null
}

const scoreWindow = (w: Cell[], p: Player): number => {
  const o = (3 - p) as Player
  let pc = 0
  let oc = 0
  let e = 0
  for (const v of w) {
    if (v === p) pc++
    else if (v === o) oc++
    else e++
  }
  if (pc === 4) return 100000
  if (oc === 4) return -100000
  if (pc === 3 && e === 1) return 80
  if (oc === 3 && e === 1) return -90
  if (pc === 2 && e === 2) return 6
  if (oc === 2 && e === 2) return -8
  return 0
}

const scoreBoard = (b: Board, p: Player): number => {
  let s = 0
  for (let r = 0; r < ROWS; r++) if (b[r][3] === p) s += 3
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRS) {
        const w: Cell[] = []
        let ok = true
        for (let k = 0; k < 4; k++) {
          const nr = r + dr * k
          const nc = c + dc * k
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
            ok = false
            break
          }
          w.push(b[nr][nc])
        }
        if (ok) s += scoreWindow(w, p)
      }
    }
  }
  return s
}

interface MinimaxResult {
  score: number
  col: number
}

const minimax = (
  b: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean,
  player: Player,
): MinimaxResult => {
  const win = findWin(b)
  if (win) {
    return {
      score: win.player === player ? 1e6 - (10 - depth) : -1e6 + (10 - depth),
      col: -1,
    }
  }
  if (isFull(b) || depth === 0) return { score: scoreBoard(b, player), col: -1 }

  const cols = validCols(b)
  cols.sort((a, c) => Math.abs(3 - a) - Math.abs(3 - c))

  let bestCol = cols[0]
  if (maximising) {
    let best = -Infinity
    for (const c of cols) {
      const nb = cloneBoard(b)
      drop(nb, c, player)
      const { score } = minimax(nb, depth - 1, alpha, beta, false, player)
      if (score > best) {
        best = score
        bestCol = c
      }
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
    return { score: best, col: bestCol }
  }
  let best = Infinity
  for (const c of cols) {
    const nb = cloneBoard(b)
    drop(nb, c, (3 - player) as Player)
    const { score } = minimax(nb, depth - 1, alpha, beta, true, player)
    if (score < best) {
      best = score
      bestCol = c
    }
    beta = Math.min(beta, best)
    if (alpha >= beta) break
  }
  return { score: best, col: bestCol }
}

export interface AiLevelCfg {
  name: string
  depth: number
  randomChance: number
  color: string
}

export const AI_LEVELS: Record<1 | 2 | 3 | 4 | 5, AiLevelCfg> = {
  1: { name: "ECHO",  depth: 1, randomChance: 0.55, color: "#39ff14" },
  2: { name: "VOLT",  depth: 2, randomChance: 0.2,  color: "#00f0ff" },
  3: { name: "PULSE", depth: 4, randomChance: 0.05, color: "#00f0ff" },
  4: { name: "NULL",  depth: 5, randomChance: 0,    color: "#ffe600" },
  5: { name: "N.E.O.",depth: 6, randomChance: 0,    color: "#ff2eba" },
}

export type AiLevelId = 1 | 2 | 3 | 4 | 5

export const aiMove = (b: Board, level: AiLevelId, player: Player = 2): number | null => {
  const cfg = AI_LEVELS[level] || AI_LEVELS[3]
  const cols = validCols(b)
  if (cols.length === 0) return null
  // Take immediate win
  for (const c of cols) {
    const nb = cloneBoard(b)
    drop(nb, c, player)
    if (findWin(nb)?.player === player) return c
  }
  // Block immediate enemy win
  const enemy = (3 - player) as Player
  for (const c of cols) {
    const nb = cloneBoard(b)
    drop(nb, c, enemy)
    if (findWin(nb)?.player === enemy) return c
  }
  if (Math.random() < cfg.randomChance) {
    return cols[Math.floor(Math.random() * cols.length)]
  }
  const { col } = minimax(b, cfg.depth, -Infinity, Infinity, true, player)
  return col >= 0 ? col : cols[0]
}

// Mode metadata — preserved from the standalone hub.
export type ModeId = "classic" | "quick" | "timed" | "challenge"

export interface ModeDef {
  id: ModeId
  name: string
  subtitle: string
  ai: AiLevelId
  timerMs?: number
}

export const MODES: ModeDef[] = [
  { id: "classic",   name: "CLASSIC",   subtitle: "Standard duel · 6×7 reactor",            ai: 3 },
  { id: "quick",     name: "QUICK",     subtitle: "Faster AI, lighter difficulty",          ai: 2 },
  { id: "timed",     name: "TIMED",     subtitle: "60 sec per side, no stalling",           ai: 3, timerMs: 60_000 },
  { id: "challenge", name: "CHALLENGE", subtitle: "Master node · N.E.O. plays solved lines", ai: 5 },
]

// Power-up definitions — kept narrow for the integrated mode.
export type PowerId = "peek" | "bomb" | "double"

export interface PowerDef {
  id: PowerId
  name: string
  desc: string
  color: string
  cost: number
}

export const POWERS: Record<PowerId, PowerDef> = {
  peek:   { id: "peek",   name: "PEEK",   desc: "Reveal NEO's next column.",            color: "#ffe600", cost: 1 },
  bomb:   { id: "bomb",   name: "BOMB",   desc: "Vaporize one enemy token, gravity.",   color: "#ff7a00", cost: 3 },
  double: { id: "double", name: "DOUBLE", desc: "Place two of your tokens this turn.",  color: "#39ff14", cost: 2 },
}

// Used by BOMB power: removes (r,c) and re-stacks the column.
export const vaporize = (b: Board, r: number, c: number): Board => {
  const nb = cloneBoard(b)
  nb[r][c] = 0
  const stack: Cell[] = []
  for (let rr = ROWS - 1; rr >= 0; rr--) if (nb[rr][c] !== 0) stack.push(nb[rr][c])
  for (let rr = 0; rr < ROWS; rr++) nb[rr][c] = 0
  for (let i = 0; i < stack.length; i++) nb[ROWS - 1 - i][c] = stack[i]
  return nb
}

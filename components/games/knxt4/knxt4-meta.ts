"use client"

import { COLS, ROWS, cloneBoard, drop as dropToken, dropRow, findWin, makeBoard } from "./knxt4-core"
import type { AiLevelId, Board, Cell, Player } from "./knxt4-core"

export interface Knxt4Recent {
  result: "win" | "loss" | "draw"
  mode: string
  opponent?: string
  moves: number
  ts?: number
}

export interface Knxt4Save {
  name?: string
  xp: number
  level: number
  wins: number
  losses: number
  draws: number
  games: number
  streak: number
  bestStreak: number
  currentLadder: number
  laddersBeaten: number[]
  selectedToken: string
  unlockedTokens: string[]
  unlockedPowers: string[]
  energy: number
  recent: Knxt4Recent[]
  hintsLeft: number
  prefs: Record<string, boolean>
}

export interface TokenSkin {
  id: string
  name: string
  p1: [string, string, string]
  p2: [string, string, string]
  unlocked?: boolean
  rarity: string
  anim?: "pulse" | "flicker"
}

export interface LadderLevel {
  id: number
  name: string
  ai: string
  aiLevel: AiLevelId
  color: "cyan" | "lime" | "magenta" | "violet" | "yellow"
  bg: string
  desc: string
  unlock?: { token?: string; power?: string; title?: string }
  xp: number
}

export const TOKENS: TokenSkin[] = [
  { id: "core", name: "CORE", p1: ["#B5F8FF", "#00E8FF", "#003540"], p2: ["#FFC2EE", "#FF2EBA", "#3A0028"], unlocked: true, rarity: "STANDARD" },
  { id: "pulse", name: "PULSE", p1: ["#fff", "#00E8FF", "#FF2EBA"], p2: ["#fff", "#FF2EBA", "#00E8FF"], rarity: "RARE", anim: "pulse" },
  { id: "chrome", name: "CHROME", p1: ["#fff", "#aab2c2", "#1a1f2e"], p2: ["#fff", "#aab2c2", "#1a1f2e"], rarity: "RARE" },
  { id: "aurora", name: "AURORA", p1: ["#BFFF1A", "#00E8FF", "#003540"], p2: ["#FF6BCB", "#B36BFF", "#3A0028"], rarity: "EPIC" },
  { id: "void", name: "VOID", p1: ["#1a1f2e", "#000", "#B36BFF"], p2: ["#1a1f2e", "#000", "#FF2EBA"], rarity: "EPIC", anim: "flicker" },
  { id: "inferno", name: "INFERNO", p1: ["#FFE600", "#FF9A2E", "#FF3556"], p2: ["#FF3556", "#B81080", "#3A0028"], rarity: "EPIC" },
  { id: "glitch", name: "GLITCH", p1: ["#BFFF1A", "#FF2EBA", "#00E8FF"], p2: ["#FFE600", "#00E8FF", "#FF2EBA"], rarity: "EPIC", anim: "flicker" },
  { id: "neo", name: "N.E.O.", p1: ["#fff", "#B36BFF", "#FF2EBA"], p2: ["#fff", "#00E8FF", "#BFFF1A"], rarity: "LEGEND", anim: "pulse" },
]

export const LEVELS: LadderLevel[] = [
  { id: 1, name: "NEON DOCK", ai: "ECHO", aiLevel: 1, color: "cyan", bg: "cyan", desc: "Standard 7x6. Echo plays loose.", unlock: { token: "pulse" }, xp: 25 },
  { id: 2, name: "CIRCUIT VAULT", ai: "VOLT", aiLevel: 2, color: "lime", bg: "lime", desc: "Power-cell terrain. Volt tracks the diagonals.", unlock: { power: "shift" }, xp: 50 },
  { id: 3, name: "MAGENTA CORE", ai: "PULSE", aiLevel: 3, color: "magenta", bg: "magenta", desc: "Plasma chamber. Pulse builds traps fast.", unlock: { token: "aurora" }, xp: 100 },
  { id: 4, name: "VOID SECTOR", ai: "NULL", aiLevel: 4, color: "violet", bg: "void", desc: "Deep space. Null sees 5 moves ahead.", unlock: { power: "gravity", token: "void" }, xp: 200 },
  { id: 5, name: "OVERDRIVE", ai: "BLAZE", aiLevel: 4, color: "yellow", bg: "yellow", desc: "Aggressive forcing lines. Move fast.", unlock: { token: "inferno" }, xp: 350 },
  { id: 6, name: "N.E.O. MASTER", ai: "N.E.O.", aiLevel: 5, color: "magenta", bg: "master", desc: "Solved play. The final node.", unlock: { token: "neo", title: "NEURAL OVERRIDE" }, xp: 1000 },
]

export const defaultSave = (): Knxt4Save => ({
  xp: 0,
  level: 1,
  wins: 0,
  losses: 0,
  draws: 0,
  games: 0,
  streak: 0,
  bestStreak: 0,
  currentLadder: 1,
  laddersBeaten: [],
  selectedToken: "core",
  unlockedTokens: ["core"],
  unlockedPowers: ["bomb", "peek", "double"],
  energy: 6,
  recent: [],
  hintsLeft: 3,
  prefs: { sound: true, haptic: true, hints: true, reducedMotion: false, contrast: false },
})

export const xpForLevel = (n: number) => (n - 1) * 150

export const xpProgress = (save: Knxt4Save) => {
  const prev = xpForLevel(save.level)
  const next = xpForLevel(save.level + 1)
  const span = next - prev
  const pct = Math.max(0, Math.min(100, ((save.xp - prev) / span) * 100))
  return { prev, next, pct, into: save.xp - prev, span }
}

export const winRate = (save: Knxt4Save) => save.games > 0 ? Math.round((save.wins / save.games) * 100) : 0

export const tokenColors = (skinId: string, player: 1 | 2) => {
  const skin = TOKENS.find((t) => t.id === skinId) || TOKENS[0]
  return player === 1 ? skin.p1 : skin.p2
}

export const tokenAnim = (skinId: string) => (TOKENS.find((t) => t.id === skinId) || TOKENS[0]).anim

/* ───── POWERS (extended definitions w/ exec functions) ─────────────── */
export type PowerId = "peek" | "bomb" | "double" | "shift" | "gravity"

export interface PowerDef {
  id: PowerId
  name: string
  desc: string
  icon: string
  color: "yellow" | "orange" | "lime" | "cyan" | "violet"
  cost: number
  target: "none" | "self" | "token" | "column"
  exec: (
    board: Board | null,
    target: { r?: number; c?: number; dir?: -1 | 1; col?: number } | null,
    me: Player,
  ) => { ok?: boolean; message?: string; peekCol?: number | null; newBoard?: Board }
}

export const POWERS: Record<PowerId, PowerDef> = {
  peek: {
    id: "peek", name: "PEEK", desc: "Reveal NEO's next column.", icon: "eye", color: "yellow", cost: 1, target: "none",
    exec: (board) => {
      if (!board) return { message: "NO TARGET" }
      const enemy = 2 as Player
      let best = -1
      for (let c = 0; c < COLS; c++) {
        const r = dropRow(board, c)
        if (r < 0) continue
        const nb = cloneBoard(board)
        dropToken(nb, c, enemy)
        if (findWin(nb)?.player === enemy) { best = c; break }
        if (best < 0) best = c
      }
      return { peekCol: best >= 0 ? best : null, message: best >= 0 ? `THREAT VECTOR · C-${best + 1}` : "NO TARGET" }
    },
  },
  bomb: {
    id: "bomb", name: "BOMB", desc: "Vaporize one enemy token.", icon: "spark", color: "orange", cost: 3, target: "token",
    exec: (board, target, me) => {
      if (!board || !target || target.r == null || target.c == null) return { ok: false, message: "INVALID" }
      const enemy = (3 - me) as Player
      if (board[target.r][target.c] !== enemy) return { ok: false, message: "PICK ENEMY TOKEN" }
      const nb = cloneBoard(board)
      nb[target.r][target.c] = 0
      const stack: Cell[] = []
      for (let rr = ROWS - 1; rr >= 0; rr--) if (nb[rr][target.c] !== 0) stack.push(nb[rr][target.c])
      for (let rr = 0; rr < ROWS; rr++) nb[rr][target.c] = 0
      for (let i = 0; i < stack.length; i++) nb[ROWS - 1 - i][target.c] = stack[i]
      return { ok: true, newBoard: nb, message: "TOKEN VAPORIZED" }
    },
  },
  double: {
    id: "double", name: "DOUBLE", desc: "Place two of your tokens this turn.", icon: "plus", color: "lime", cost: 2, target: "self",
    exec: () => ({ ok: true, message: "DOUBLE DROP ARMED" }),
  },
  shift: {
    id: "shift", name: "SHIFT", desc: "Slide a column one slot left or right.", icon: "arrow-r", color: "cyan", cost: 3, target: "column",
    exec: (board, target) => {
      if (!board || !target || target.c == null || (target.dir !== 1 && target.dir !== -1)) return { ok: false, message: "INVALID" }
      const c = target.c, dest = c + target.dir
      if (dest < 0 || dest >= COLS) return { ok: false, message: "BLOCKED" }
      const nb = cloneBoard(board)
      for (let r = 0; r < ROWS; r++) {
        if (nb[r][c] !== 0 && nb[r][dest] !== 0) return { ok: false, message: "DEST FULL" }
      }
      for (let r = 0; r < ROWS; r++) { nb[r][dest] = nb[r][c]; nb[r][c] = 0 }
      for (const col of [c, dest]) {
        const stack: Cell[] = []
        for (let rr = ROWS - 1; rr >= 0; rr--) if (nb[rr][col] !== 0) stack.push(nb[rr][col])
        for (let rr = 0; rr < ROWS; rr++) nb[rr][col] = 0
        for (let i = 0; i < stack.length; i++) nb[ROWS - 1 - i][col] = stack[i]
      }
      return { ok: true, newBoard: nb, message: "COLUMN SHIFTED" }
    },
  },
  gravity: {
    id: "gravity", name: "GRAVITY", desc: "Drop a token at the top of a column.", icon: "arrow-d", color: "violet", cost: 2, target: "column",
    exec: () => ({ ok: true, message: "GRAVITY INVERTED" }),
  },
}

/* ───── PUZZLES (challenge stubs) ───────────────────────────────────── */
export interface Puzzle {
  id: number
  name: string
  task: string
  moves: { col: number; player: Player }[]
  solCol: number
}

export const PUZZLES: Puzzle[] = [
  { id: 1, name: "OPENER",        task: "Win in 1 · centre press",      moves: [{ col: 3, player: 1 }, { col: 0, player: 2 }, { col: 3, player: 1 }, { col: 0, player: 2 }, { col: 3, player: 1 }, { col: 0, player: 2 }], solCol: 3 },
  { id: 2, name: "TRAP LINE",     task: "Find the winning column",      moves: [{ col: 2, player: 1 }, { col: 3, player: 2 }, { col: 2, player: 1 }, { col: 3, player: 2 }, { col: 2, player: 1 }, { col: 3, player: 2 }], solCol: 2 },
  { id: 3, name: "DOUBLE THREAT", task: "Block + win",                  moves: [{ col: 4, player: 1 }, { col: 4, player: 2 }, { col: 3, player: 1 }, { col: 3, player: 2 }, { col: 2, player: 1 }, { col: 5, player: 2 }], solCol: 1 },
  { id: 4, name: "DIAGONAL",      task: "Complete the diagonal",        moves: [{ col: 0, player: 1 }, { col: 1, player: 2 }, { col: 1, player: 1 }, { col: 2, player: 2 }, { col: 2, player: 1 }, { col: 3, player: 2 }, { col: 2, player: 1 }, { col: 3, player: 2 }, { col: 3, player: 1 }, { col: 6, player: 2 }], solCol: 3 },
  { id: 5, name: "MIRROR",        task: "Symmetric trap",               moves: [{ col: 3, player: 1 }, { col: 3, player: 2 }, { col: 2, player: 1 }, { col: 4, player: 2 }, { col: 2, player: 1 }, { col: 4, player: 2 }], solCol: 2 },
]

export const movesToBoard = (moves: { col: number; player: Player }[]): Board => {
  const b = makeBoard()
  for (const m of moves) dropToken(b, m.col, m.player)
  return b
}

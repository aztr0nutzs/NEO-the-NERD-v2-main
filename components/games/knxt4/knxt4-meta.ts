"use client"

import type { AiLevelId } from "./knxt4-core"

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

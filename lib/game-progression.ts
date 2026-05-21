import type { ArcadeProgressionState, GameId, GameProgressionStats } from "./types"

export function createDefaultGameStats(): GameProgressionStats {
  return { playCount: 0, wins: 0, losses: 0, draws: 0, bestScore: 0, bestStreak: 0, fastestCompletionMs: null, averageReactionMs: null, reactionSamples: 0, lastPlayedAt: null }
}

export function createDefaultArcadeProgression(): ArcadeProgressionState {
  return {
    totalGamesPlayed: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, arcadeXp: 0, arcadeLevel: 1,
    currentWinStreak: 0, longestWinStreak: 0, achievements: [], dailyChallengeHistory: [],
    perGame: { tictactoe: createDefaultGameStats(), rps: createDefaultGameStats(), memory: createDefaultGameStats(), reaction: createDefaultGameStats(), guess: createDefaultGameStats(), trivia: createDefaultGameStats(), scramble: createDefaultGameStats(), emoji: createDefaultGameStats(), rapidfire: createDefaultGameStats(), wyr: createDefaultGameStats(), codebreaker: createDefaultGameStats(), signal: createDefaultGameStats(), firewall: createDefaultGameStats(), heist: createDefaultGameStats(), dodge: createDefaultGameStats(), circuit: createDefaultGameStats() },
  }
}

export function computeLevel(xp: number) { return Math.max(1, Math.floor(xp / 100) + 1) }

export function applyGameProgression(prev: ArcadeProgressionState, params: { game: GameId; result: "win" | "lose" | "draw"; difficulty: "EASY" | "ADAPTIVE" | "HARD"; score?: number; completionTimeMs?: number; reactionTimeMs?: number; streak?: number }): ArcadeProgressionState {
  const gameStats = prev.perGame[params.game] ?? createDefaultGameStats()
  const nextGame = { ...gameStats, playCount: gameStats.playCount + 1, lastPlayedAt: Date.now() }
  if (params.result === "win") nextGame.wins += 1
  if (params.result === "lose") nextGame.losses += 1
  if (params.result === "draw") nextGame.draws += 1
  if (typeof params.score === "number") nextGame.bestScore = Math.max(nextGame.bestScore, params.score)
  if (typeof params.streak === "number") nextGame.bestStreak = Math.max(nextGame.bestStreak, params.streak)
  if (typeof params.completionTimeMs === "number") nextGame.fastestCompletionMs = nextGame.fastestCompletionMs == null ? params.completionTimeMs : Math.min(nextGame.fastestCompletionMs, params.completionTimeMs)
  if (typeof params.reactionTimeMs === "number") {
    const total = (nextGame.averageReactionMs ?? 0) * nextGame.reactionSamples + params.reactionTimeMs
    nextGame.reactionSamples += 1
    nextGame.averageReactionMs = Math.round(total / nextGame.reactionSamples)
  }
  const xpBase = params.result === "win" ? 30 : params.result === "draw" ? 18 : 10
  const diffBonus = params.difficulty === "HARD" ? 15 : params.difficulty === "ADAPTIVE" ? 8 : 4
  const nextXp = prev.arcadeXp + xpBase + diffBonus
  const currentWinStreak = params.result === "win" ? prev.currentWinStreak + 1 : 0
  return {
    ...prev,
    totalGamesPlayed: prev.totalGamesPlayed + 1,
    totalWins: prev.totalWins + (params.result === "win" ? 1 : 0),
    totalLosses: prev.totalLosses + (params.result === "lose" ? 1 : 0),
    totalDraws: prev.totalDraws + (params.result === "draw" ? 1 : 0),
    arcadeXp: nextXp,
    arcadeLevel: computeLevel(nextXp),
    currentWinStreak,
    longestWinStreak: Math.max(prev.longestWinStreak, currentWinStreak),
    perGame: { ...prev.perGame, [params.game]: nextGame },
  }
}

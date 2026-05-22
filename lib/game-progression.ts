import type { ArcadeProgressionState, GameId, GameProgressionStats } from "./types"
import { checkUnlocks, getAchievementDef } from "./games/achievements"
import { ensureDailyChallenge, isChallengeMet, todayKey } from "./games/daily-challenge"
import { gmLine, type GMEvent } from "./games/game-master"

export interface Celebration {
  id: string
  type: "achievement" | "daily" | "best" | "level"
  title: string
  line: string
  game?: GameId
  xp?: number
  timestamp: number
}

export interface ProgressionUpdateResult {
  state: ArcadeProgressionState
  celebrations: Celebration[]
}

export function createDefaultGameStats(): GameProgressionStats {
  return { playCount: 0, wins: 0, losses: 0, draws: 0, bestScore: 0, bestStreak: 0, fastestCompletionMs: null, averageReactionMs: null, reactionSamples: 0, lastPlayedAt: null }
}

export function createDefaultArcadeProgression(): ArcadeProgressionState {
  return {
    totalGamesPlayed: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, arcadeXp: 0, arcadeLevel: 1,
    currentWinStreak: 0, longestWinStreak: 0, achievements: [], dailyChallengeHistory: [], dailyChallenge: null,
    perGame: { tictactoe: createDefaultGameStats(), rps: createDefaultGameStats(), memory: createDefaultGameStats(), reaction: createDefaultGameStats(), guess: createDefaultGameStats(), trivia: createDefaultGameStats(), scramble: createDefaultGameStats(), emoji: createDefaultGameStats(), rapidfire: createDefaultGameStats(), wyr: createDefaultGameStats(), codebreaker: createDefaultGameStats(), signal: createDefaultGameStats(), firewall: createDefaultGameStats(), heist: createDefaultGameStats(), dodge: createDefaultGameStats(), circuit: createDefaultGameStats(), knxt4: createDefaultGameStats() },
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

// Wrapper that runs the base progression update, then folds in:
//  - newly unlocked achievements (with XP reward)
//  - daily challenge generation if missing / day rolled over
//  - daily challenge completion (with XP reward)
//  - personal-best detection
//  - level-up detection
// Returns the next state plus the list of celebrations the UI should surface.
export function applyGameProgressionWithEvents(
  prev: ArcadeProgressionState,
  params: { game: GameId; result: "win" | "lose" | "draw"; difficulty: "EASY" | "ADAPTIVE" | "HARD"; score?: number; completionTimeMs?: number; reactionTimeMs?: number; streak?: number },
  ctx: { personalityId: string; trashTalk: boolean },
): ProgressionUpdateResult {
  const withDaily = ensureDailyChallenge(prev)
  const baseNext = applyGameProgression(withDaily, params)
  const celebrations: Celebration[] = []
  const now = Date.now()

  const fireGM = (event: GMEvent) => gmLine(event, ctx)

  // personal best detection — compare prev vs next per-game
  const prevGame = withDaily.perGame[params.game]
  const nextGame = baseNext.perGame[params.game]
  if (nextGame.bestScore > prevGame.bestScore && nextGame.bestScore > 0 && params.result === "win") {
    celebrations.push({
      id: `best-${params.game}-score-${now}`,
      type: "best",
      title: "PERSONAL BEST",
      line: `${fireGM("new_record")} (${params.game.toUpperCase()} score ${nextGame.bestScore})`,
      game: params.game,
      timestamp: now,
    })
  } else if (
    nextGame.fastestCompletionMs != null &&
    (prevGame.fastestCompletionMs == null || nextGame.fastestCompletionMs < prevGame.fastestCompletionMs) &&
    params.result === "win"
  ) {
    celebrations.push({
      id: `best-${params.game}-fast-${now}`,
      type: "best",
      title: "FASTEST CLEAR",
      line: `${fireGM("new_record")} (${params.game.toUpperCase()} ${Math.ceil(nextGame.fastestCompletionMs / 1000)}s)`,
      game: params.game,
      timestamp: now,
    })
  }

  // first-win
  if (prev.totalWins === 0 && baseNext.totalWins === 1) {
    celebrations.push({
      id: `first-win-${now}`,
      type: "best",
      title: "FIRST WIN",
      line: fireGM("first_win"),
      timestamp: now,
    })
  }

  // level up
  if (baseNext.arcadeLevel > withDaily.arcadeLevel) {
    celebrations.push({
      id: `level-${baseNext.arcadeLevel}-${now}`,
      type: "level",
      title: `LEVEL ${baseNext.arcadeLevel}`,
      line: fireGM("level_up"),
      timestamp: now,
    })
  }

  // daily challenge completion (against new per-game stats)
  let nextState: ArcadeProgressionState = baseNext
  if (baseNext.dailyChallenge && !baseNext.dailyChallenge.completed) {
    const dailyStats = baseNext.perGame[baseNext.dailyChallenge.gameId]
    if (isChallengeMet(baseNext.dailyChallenge, dailyStats)) {
      const xp = baseNext.dailyChallenge.xpReward
      nextState = {
        ...baseNext,
        dailyChallenge: { ...baseNext.dailyChallenge, completed: true, completedAt: now },
        arcadeXp: baseNext.arcadeXp + xp,
        arcadeLevel: computeLevel(baseNext.arcadeXp + xp),
        dailyChallengeHistory: [
          ...baseNext.dailyChallengeHistory,
          { dayKey: baseNext.dailyChallenge.dayKey, gameId: baseNext.dailyChallenge.gameId, completed: true, completedAt: now },
        ],
      }
      celebrations.push({
        id: `daily-${baseNext.dailyChallenge.dayKey}-${now}`,
        type: "daily",
        title: "DAILY CLEARED",
        line: `${fireGM("daily_complete")} +${xp} XP`,
        xp,
        timestamp: now,
      })
      // re-evaluate level-up triggered by daily XP
      if (nextState.arcadeLevel > baseNext.arcadeLevel) {
        celebrations.push({
          id: `level-${nextState.arcadeLevel}-${now}-daily`,
          type: "level",
          title: `LEVEL ${nextState.arcadeLevel}`,
          line: fireGM("level_up"),
          timestamp: now,
        })
      }
    }
  }

  // achievements
  const unlocks = checkUnlocks(prev, nextState)
  if (unlocks.length > 0) {
    let xpFromAch = 0
    const ts = now
    const newAchievements = unlocks.map((u) => ({ id: u.id, unlockedAt: ts }))
    xpFromAch = unlocks.reduce((sum, u) => sum + u.xpReward, 0)
    nextState = {
      ...nextState,
      achievements: [...nextState.achievements, ...newAchievements],
      arcadeXp: nextState.arcadeXp + xpFromAch,
      arcadeLevel: computeLevel(nextState.arcadeXp + xpFromAch),
    }
    for (const u of unlocks) {
      celebrations.push({
        id: `ach-${u.id}-${now}`,
        type: "achievement",
        title: u.title.toUpperCase(),
        line: `${gmLine("achievement", ctx)} +${u.xpReward} XP · ${u.description}`,
        xp: u.xpReward,
        timestamp: now,
      })
    }
  }

  return { state: nextState, celebrations }
}

export function getDailyChallengeFor(progression: ArcadeProgressionState) {
  return progression.dailyChallenge?.dayKey === todayKey() ? progression.dailyChallenge : null
}


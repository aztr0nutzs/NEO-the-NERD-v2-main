import type { ArcadeProgressionState, GameId } from "@/lib/types"

export interface AchievementDef {
  id: string
  title: string
  description: string
  xpReward: number
  check: (state: ArcadeProgressionState) => boolean
}

function playedGames(state: ArcadeProgressionState): number {
  let n = 0
  for (const id in state.perGame) {
    const s = state.perGame[id as GameId]
    if (s.wins + s.losses + s.draws > 0) n++
  }
  return n
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_win",
    title: "First Win",
    description: "Win any arcade run.",
    xpReward: 20,
    check: (s) => s.totalWins >= 1,
  },
  {
    id: "five_wins",
    title: "Five Wins",
    description: "Total of 5 arcade wins.",
    xpReward: 25,
    check: (s) => s.totalWins >= 5,
  },
  {
    id: "ten_wins",
    title: "Decimator",
    description: "Total of 10 arcade wins.",
    xpReward: 40,
    check: (s) => s.totalWins >= 10,
  },
  {
    id: "reflex_350",
    title: "Sub-350 Reflex",
    description: "Average reaction below 350ms in Reaction Tap.",
    xpReward: 30,
    check: (s) => {
      const r = s.perGame.reaction
      return r.reactionSamples > 0 && (r.averageReactionMs ?? Infinity) <= 350
    },
  },
  {
    id: "memory_master",
    title: "Memory Master",
    description: "Clear Memory Match in under 30 seconds.",
    xpReward: 30,
    check: (s) => {
      const fast = s.perGame.memory.fastestCompletionMs
      return fast != null && fast <= 30000
    },
  },
  {
    id: "codebreaker_cleared",
    title: "Code Cracker",
    description: "Break a Neon Codebreaker sequence.",
    xpReward: 25,
    check: (s) => s.perGame.codebreaker.wins >= 1,
  },
  {
    id: "firewall_breach",
    title: "Firewall Breached",
    description: "Reach the core in Firewall Breach.",
    xpReward: 25,
    check: (s) => s.perGame.firewall.wins >= 1,
  },
  {
    id: "trivia_streak_5",
    title: "Trivia Pulse",
    description: "Land a 5-question streak in Trivia Duel.",
    xpReward: 25,
    check: (s) => s.perGame.trivia.bestStreak >= 5,
  },
  {
    id: "signal_round_10",
    title: "Signal Master",
    description: "Reach round 10 in Signal Sequence.",
    xpReward: 30,
    check: (s) => s.perGame.signal.bestStreak >= 10,
  },
  {
    id: "arcade_streak_5",
    title: "Arcade Streak ×5",
    description: "Win 5 arcade runs in a row.",
    xpReward: 35,
    check: (s) => s.longestWinStreak >= 5,
  },
  {
    id: "game_collector_5",
    title: "Game Collector",
    description: "Play 5 different arcade games.",
    xpReward: 25,
    check: (s) => playedGames(s) >= 5,
  },
  {
    id: "game_collector_10",
    title: "Arcade Curator",
    description: "Play 10 different arcade games.",
    xpReward: 50,
    check: (s) => playedGames(s) >= 10,
  },
]

export function checkUnlocks(prev: ArcadeProgressionState, next: ArcadeProgressionState): AchievementDef[] {
  const owned = new Set(prev.achievements.map((a) => a.id))
  const newlyUnlocked: AchievementDef[] = []
  for (const def of ACHIEVEMENTS) {
    if (owned.has(def.id)) continue
    if (def.check(next)) newlyUnlocked.push(def)
  }
  return newlyUnlocked
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

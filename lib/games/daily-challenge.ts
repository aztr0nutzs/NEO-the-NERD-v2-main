import type {
  ArcadeProgressionState,
  DailyChallenge,
  DailyChallengeMetric,
  GameId,
  GameProgressionStats,
} from "@/lib/types"

interface ChallengeTemplate {
  gameId: GameId
  label: string
  metric: DailyChallengeMetric
  // delta target relative to baseline. e.g., need wins >= baseline + 1.
  delta: number
  comparator: "gte" | "lte"
  xpReward: number
}

// Each daily picks one template. Day-deterministic so all clients on the same
// local date see the same challenge — no server required.
const TEMPLATES: ChallengeTemplate[] = [
  { gameId: "memory", label: "Clear Memory Match once today.", metric: "wins", delta: 1, comparator: "gte", xpReward: 40 },
  { gameId: "reaction", label: "Land any Reaction Tap run.", metric: "playCount", delta: 1, comparator: "gte", xpReward: 30 },
  { gameId: "trivia", label: "Land a 4-streak in Trivia Duel.", metric: "bestStreak", delta: 0, comparator: "gte", xpReward: 50 },
  { gameId: "codebreaker", label: "Break a Codebreaker sequence today.", metric: "wins", delta: 1, comparator: "gte", xpReward: 50 },
  { gameId: "signal", label: "Reach round 6 in Signal Sequence.", metric: "bestStreak", delta: 0, comparator: "gte", xpReward: 50 },
  { gameId: "firewall", label: "Breach the Firewall core once.", metric: "wins", delta: 1, comparator: "gte", xpReward: 50 },
  { gameId: "rapidfire", label: "Score 8+ in Rapid Fire.", metric: "bestScore", delta: 0, comparator: "gte", xpReward: 40 },
  { gameId: "tictactoe", label: "Win a Tic Tac Toe match today.", metric: "wins", delta: 1, comparator: "gte", xpReward: 25 },
  { gameId: "rps", label: "Win a Rock Paper Scissors match.", metric: "wins", delta: 1, comparator: "gte", xpReward: 25 },
  { gameId: "scramble", label: "Solve a Word Scramble session.", metric: "wins", delta: 1, comparator: "gte", xpReward: 30 },
  { gameId: "emoji", label: "Score 6+ in Emoji Decode.", metric: "bestScore", delta: 0, comparator: "gte", xpReward: 30 },
  { gameId: "circuit", label: "Light up a Circuit Builder grid.", metric: "wins", delta: 1, comparator: "gte", xpReward: 50 },
  { gameId: "dodge", label: "Run a Drone Dodge to completion.", metric: "playCount", delta: 1, comparator: "gte", xpReward: 30 },
  { gameId: "heist", label: "Complete a Cyber Heist run.", metric: "playCount", delta: 1, comparator: "gte", xpReward: 30 },
]

const ABSOLUTE_TARGETS: Partial<Record<string, number>> = {
  "trivia.bestStreak": 4,
  "signal.bestStreak": 6,
  "rapidfire.bestScore": 8,
  "emoji.bestScore": 6,
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function readMetric(stats: GameProgressionStats, metric: DailyChallengeMetric): number {
  switch (metric) {
    case "wins": return stats.wins
    case "playCount": return stats.playCount
    case "bestScore": return stats.bestScore
    case "bestStreak": return stats.bestStreak
    case "fastestCompletionMs": return stats.fastestCompletionMs ?? Number.POSITIVE_INFINITY
    case "averageReactionMs": return stats.averageReactionMs ?? Number.POSITIVE_INFINITY
  }
}

export function generateDailyChallenge(progression: ArcadeProgressionState, dayKey = todayKey()): DailyChallenge {
  const template = TEMPLATES[hashString(dayKey) % TEMPLATES.length]
  const stats = progression.perGame[template.gameId]
  const baseline = readMetric(stats, template.metric)
  const absKey = `${template.gameId}.${template.metric}`
  const absoluteTarget = ABSOLUTE_TARGETS[absKey]
  const target = absoluteTarget != null
    ? absoluteTarget
    : template.comparator === "gte"
      ? baseline + template.delta
      : Math.max(0, baseline - template.delta)
  return {
    dayKey,
    gameId: template.gameId,
    label: template.label,
    metric: template.metric,
    target,
    comparator: template.comparator,
    xpReward: template.xpReward,
    completed: false,
    baselineValue: Number.isFinite(baseline) ? baseline : 0,
  }
}

export function ensureDailyChallenge(progression: ArcadeProgressionState): ArcadeProgressionState {
  const key = todayKey()
  if (progression.dailyChallenge && progression.dailyChallenge.dayKey === key) return progression
  return { ...progression, dailyChallenge: generateDailyChallenge(progression, key) }
}

export function isChallengeMet(challenge: DailyChallenge, stats: GameProgressionStats): boolean {
  const value = readMetric(stats, challenge.metric)
  if (challenge.comparator === "gte") return value >= challenge.target
  return value <= challenge.target
}

export function challengeProgress(challenge: DailyChallenge, stats: GameProgressionStats): { current: number; target: number } {
  return { current: readMetric(stats, challenge.metric), target: challenge.target }
}

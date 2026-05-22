import type {
  DeviceIdentityRecord,
  NetworkAlert,
  NetworkAssistantSnapshot,
  NetworkEvent,
  NetworkHealthSnapshot,
  NetworkMonitorState,
  NetworkSettings,
  ScanComparisonSummary,
  SpeedTestResult,
} from "./network/types"
import type { EntitlementState } from "./entitlements/tiers"

export type AssistantMood =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "playful"
  | "gaming"

export type ResponseCategory =
  | "Helpful"
  | "Funny"
  | "Prank"
  | "Game"
  | "System"
  | "Advice"

export type LibraryResponseCategory =
  | "Jokes"
  | "Comebacks"
  | "Helpful answers"
  | "Prank ideas"
  | "Game invites"
  | "Greetings"
  | "Random thoughts"
  | "Motivational lines"
  | "Tech help"
  | "Story starters"
  | "Robot reactions"
  | "Celebration lines"
  | "Status Quips"
  | "Loading / Thinking Lines"

export type AccentColor = "cyan" | "purple" | "pink" | "green" | "orange"

export type BackgroundMode = "auto" | "portrait" | "square"

export type AvatarReactionKey =
  | "wakeup"
  | "thinking"
  | "happy"
  | "ecstatic"
  | "surprised"
  | "angry"
  | "shutdown"

export interface AvatarReactionState {
  id: number
  key: AvatarReactionKey
  priority: number
}

export type RobotSource = "image" | "gif" | "mp4" | "lottie" | "sprite"

export type ChatSendState = "idle" | "sending" | "responding" | "success" | "error"

export type CapabilityState =
  | "unknown"
  | "checking"
  | "granted"
  | "denied"
  | "unavailable"

export type CapabilityId =
  | "microphone"
  | "notifications"
  | "storage"
  | "bluetooth"
  | "network"

export interface VoiceParams {
  speed: number
  pitch: number
  volume: number
  emotion: number
}

/**
 * User-facing voice quality preference. Determines whether the voice
 * runtime is allowed to pick the high-quality provider TTS path or
 * must stay on the device-local fallback (native Android TextToSpeech
 * or, in browsers, SpeechSynthesis). Default is "prefer-high-quality"
 * because provider TTS is materially more realistic than fallback —
 * we do not want to hide it behind a setting the user never finds.
 */
export type VoiceQualityPreference = "prefer-high-quality" | "fallback-only"

export interface AssistantSettings {
  memoryEnabled: boolean
  randomGameInvites: boolean
  randomJokes: boolean
  prankSuggestions: boolean
  autoGreeting: boolean
  soundEffects: boolean
  animationIntensity: number
  responseLength: "Short" | "Balanced" | "Detailed"
  safetyLevel: "Strict" | "Standard" | "Loose"
  notificationStyle: "Banner" | "Quiet" | "Off"
  wakePhrase: string
  offlineMode: boolean
  theme: "NEO_BLACK" | "VOID" | "PRANK"
  assetPath:
    | "/robot.png"
    | "/robot.gif"
    | "/robot.mp4"
    | "/robot.json"
    | "/robot-sprite.png"
  gameDifficulty: "EASY" | "ADAPTIVE" | "HARD"
  trashTalk: boolean
  autoScroll: boolean
  showMoodTags: boolean
  reducedMotion: boolean
  backgroundService: boolean
  debugMode: boolean
  voiceQualityPreference: VoiceQualityPreference
  permissions: Record<CapabilityId, CapabilityState>
  onboarding: OnboardingState
  entitlement: EntitlementState
}

export interface OnboardingState {
  completed: boolean
  skipped: boolean
  completedAt?: string
  monitoringOptIn: boolean
  initialScanRequested: boolean
}

export interface PersistedAppState {
  version: number
  voiceId: string
  voiceFavoriteIds?: string[]
  recentVoiceIds?: string[]
  personalityId: string
  voiceParams: VoiceParams
  conversationMode: ConversationMode
  settings: AssistantSettings
  accentColor: AccentColor
  robotSource: RobotSource
  responses: SavedResponse[]
  messages: ChatMessage[]
  networkDeviceIdentities?: DeviceIdentityRecord[]
  networkEvents?: NetworkEvent[]
  lastNetworkScanDelta?: ScanComparisonSummary | null
  networkSettings?: NetworkSettings
  networkMonitorState?: NetworkMonitorState
  networkAlerts?: NetworkAlert[]
  networkHealthSnapshots?: NetworkHealthSnapshot[]
  networkAssistantSnapshot?: NetworkAssistantSnapshot | null
  speedTestHistory?: SpeedTestResult[]
  prankSoundFavoriteIds?: string[]
  recentPrankSoundIds?: string[]
  prankMessageFavorites?: PrankMessageRecord[]
  prankMessageHistory?: PrankMessageRecord[]
  prankTrapsHistory?: PrankTrap[]
  prankChaosHistory?: ChaosHistoryEntry[]
  arcadeProgression?: ArcadeProgressionState
}

export interface PrankMessageRecord {
  id: string
  text: string
  categoryId: string
  toneId: string
  personalityId?: string
  createdAt: number
}

export type PrankTrapKind = "sound" | "random-safe-sound" | "spoken-message"

export type PrankTrapStatus =
  | "armed"
  | "counting-down"
  | "triggering"
  | "fired"
  | "cancelled"
  | "failed"

export interface PrankTrap {
  id: string
  kind: PrankTrapKind
  label: string
  createdAt: number
  triggerAt: number
  delayMs: number
  status: PrankTrapStatus
  soundId?: string
  soundName?: string
  messageText?: string
  voiceId?: string
  voiceQualityPreference?: VoiceQualityPreference
  personalityId?: string
  lastError?: string
  firedAt?: number
}

export interface TrapIntent {
  kind: PrankTrapKind
  soundId?: string
  messageText?: string
}

export type ChaosActionKind =
  | "random-sound"
  | "safe-random-sound"
  | "random-message"
  | "spoken-message"
  | "sound-plus-message"
  | "sequence"

export type ChaosIntensity = "mild" | "goofy" | "chaotic" | "maximum"

export type ChaosPoolFilter = "playable-all" | "safe-only"

export type ChaosExecutionStatus =
  | "idle"
  | "ready"
  | "playing"
  | "speaking"
  | "running-sequence"
  | "complete"
  | "cancelled"
  | "failed"

export interface ChaosHistoryEntry {
  id: string
  kind: ChaosActionKind
  intensity: ChaosIntensity
  summary: string
  status: "complete" | "cancelled" | "failed"
  createdAt: number
  completedAt?: number
  error?: string
}

export interface ChaosIntent {
  kind?: ChaosActionKind
  soundId?: string
  messageText?: string
}

export type ConversationMode =
  | "Helpful Assistant"
  | "Funny Companion"
  | "Prank Coach"
  | "Game Buddy"
  | "Tech Helper"
  | "Chill Mode"

export interface Voice {
  id: string
  name: string
  description: string
  fit: string
  tags: string[]
  speed: number // 0-100
  pitch: number // 0-100
  energy: number // 0-100
  accent: "cyan" | "purple" | "pink" | "green" | "orange"
}

export interface Personality {
  id: string
  name: string
  description: string
  traits: string[]
  humor: number
  helpfulness: number
  energy: number
  randomness: number
  accent: "cyan" | "purple" | "pink" | "green" | "orange"
  sample: string
}

export type GameId =
  | "tictactoe"
  | "rps"
  | "memory"
  | "reaction"
  | "guess"
  | "trivia"
  | "scramble"
  | "emoji"
  | "rapidfire"
  | "wyr"
  | "codebreaker"
  | "signal"
  | "firewall"
  | "heist"
  | "dodge"
  | "circuit"
  | "knxt4"


export interface GameProgressionStats {
  playCount: number
  wins: number
  losses: number
  draws: number
  bestScore: number
  bestStreak: number
  fastestCompletionMs: number | null
  averageReactionMs: number | null
  reactionSamples: number
  lastPlayedAt: number | null
}

export interface ArcadeAchievement {
  id: string
  unlockedAt: number
}

export interface DailyChallengeRecord {
  dayKey: string
  gameId: GameId
  completed: boolean
  completedAt?: number
}

export type DailyChallengeMetric =
  | "wins"
  | "playCount"
  | "bestScore"
  | "bestStreak"
  | "fastestCompletionMs"
  | "averageReactionMs"

export interface DailyChallenge {
  dayKey: string
  gameId: GameId
  label: string
  metric: DailyChallengeMetric
  target: number
  comparator: "gte" | "lte"
  xpReward: number
  completed: boolean
  completedAt?: number
  baselineValue: number // metric value when the challenge was created — completion is measured against this
}

export interface ArcadeProgressionState {
  totalGamesPlayed: number
  totalWins: number
  totalLosses: number
  totalDraws: number
  perGame: Record<GameId, GameProgressionStats>
  arcadeXp: number
  arcadeLevel: number
  currentWinStreak: number
  longestWinStreak: number
  achievements: ArcadeAchievement[]
  dailyChallengeHistory: DailyChallengeRecord[]
  dailyChallenge: DailyChallenge | null
}

export interface GameDef {
  id: GameId
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  estTime: string
  behavior: string
  multiplayer: "You vs Robot" | "Turn-based" | "Quick duel" | "Party mode"
  accent: "cyan" | "purple" | "pink" | "green" | "orange"
  playable?: boolean
  category: "strategy" | "reflex" | "puzzle" | "trivia" | "party"
  skillType: "logic" | "memory" | "reaction" | "language" | "social"
  supportsScore: boolean
  supportsTimer: boolean
  supportsStreakMode: boolean
  recommendedDifficulty: "EASY" | "ADAPTIVE" | "HARD"
  unlockRequirement?: { minLevel?: number; achievementId?: string }
}

export interface GameSessionState {
  activeGame: GameId
  score: {
    you: number
    neo: number
  }
  round: number
  result: "idle" | "win" | "lose" | "draw" | "playing"
  robotResponse: string
}

export interface SavedResponse {
  id: string
  title: string
  body: string
  text?: string
  category: LibraryResponseCategory
  subcategory?: string
  mood: AssistantMood
  toneTags?: string[]
  useCaseTags?: string[]
  humorLevel?: number
  intensity?: number
  safeForAutoUse?: boolean
  voiceCompat: string[]
  favorite: boolean
  createdBy?: "system" | "user"
  createdAt?: string
  updatedAt?: string
  timesUsed?: number
  lastUsedAt?: string
  linkedPersonalityIds?: string[]
  linkedVoiceProfileIds?: string[]
  pinned?: boolean
  archived?: boolean
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  category?: ResponseCategory
  mood?: AssistantMood
  intent?: string
  emotion?: string
  followUpSuggestions?: string[]
  ts: number
  source?: "assistant" | "demo" | "system"
}

export type ScreenId =
  | "main"
  | "chat"
  | "voices"
  | "personalities"
  | "games"
  | "controls"
  | "network"
  | "speed"
  | "library"
  | "prank"
  | "prankLibrary"
  | "prankMessages"
  | "prankTraps"
  | "prankChaos"
  | "settings"

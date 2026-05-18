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
}

export interface PrankMessageRecord {
  id: string
  text: string
  categoryId: string
  toneId: string
  personalityId?: string
  createdAt: number
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

export interface GameDef {
  id: GameId
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  estTime: string
  behavior: string
  multiplayer: "You vs Robot" | "Turn-based" | "Quick duel" | "Party mode"
  accent: "cyan" | "purple" | "pink" | "green" | "orange"
  playable?: boolean
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
  | "settings"

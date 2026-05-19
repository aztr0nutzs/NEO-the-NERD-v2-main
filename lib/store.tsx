"use client"

import {
  createContext,
  type Dispatch,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react"
import type {
  AccentColor,
  AvatarReactionKey,
  AvatarReactionState,
  AssistantSettings,
  AssistantMood,
  CapabilityId,
  CapabilityState,
  ChaosHistoryEntry,
  ChatSendState,
  ChatMessage,
  ConversationMode,
  PersistedAppState,
  PrankMessageRecord,
  PrankTrap,
  SoundForgeIntent,
  SoundForgeSequence,
  TrapIntent,
  RobotSource,
  SavedResponse,
  ScreenId,
  VoiceParams,
} from "./types"
import type { DeviceIdentityRecord } from "./network/types"
import type {
  NetworkAlert,
  NetworkAssistantSnapshot,
  NetworkEvent,
  NetworkHealthSnapshot,
  NetworkMonitorState,
  NetworkSettings,
  ScanComparisonSummary,
  SpeedTestResult,
} from "./network/types"
import {
  createSpeedTestCompletedEvent,
  createSpeedTestFailedEvent,
  createSpeedTestStartedEvent,
  appendNetworkEvents,
} from "./network/networkEvents"
import { PERSONALITIES, SAVED_RESPONSES, VOICES } from "./data"
import { isPlayableSoundId } from "./prankstar/soundCatalog"
import { prankTrapsManager } from "./prankstar/prankTraps"
import { chaosManager } from "./prankstar/chaosRandomizer"
import {
  SOUND_FORGE_SEQUENCES_CAP,
  normalizeStoredSequences,
  soundForgeManager,
} from "./prankstar/soundForge"
import {
  duplicateResponse,
  markResponseUsed,
  normalizeImportedResponse,
  normalizeResponseInput,
  responseKey,
} from "./responses/responseUtils"
import type { CapabilityPlatform } from "./native/capabilities"
import { checkCapabilities, requestCapability } from "./native/capabilities"
import {
  clearStoredState,
  readStoredState,
  STORAGE_SCHEMA_VERSION,
  writeStoredState,
} from "./persistence"
import { DEFAULT_ENTITLEMENT_STATE } from "./entitlements/tiers"
import { generateAssistantReply } from "@/lib/assistant/assistant-runtime"
import { buildNetworkAssistantContext } from "@/lib/network/networkAssistantContext"

interface AppState {
  screen: ScreenId
  setScreen: (s: ScreenId) => void

  mood: AssistantMood
  setMood: (m: AssistantMood) => void
  avatarReaction: AvatarReactionState | null
  playAvatarReaction: (reactionKey: AvatarReactionKey) => void
  clearAvatarReaction: () => void

  voiceId: string
  setVoiceId: (id: string) => void
  voiceFavoriteIds: string[]
  recentVoiceIds: string[]
  toggleVoiceFavorite: (id: string) => void

  prankSoundFavoriteIds: string[]
  recentPrankSoundIds: string[]
  togglePrankSoundFavorite: (id: string) => void
  recordPrankSoundPlay: (id: string) => void

  prankMessageHistory: PrankMessageRecord[]
  prankMessageFavorites: PrankMessageRecord[]
  addPrankMessageToHistory: (m: PrankMessageRecord) => void
  removePrankMessageFromHistory: (id: string) => void
  clearPrankMessageHistory: () => void
  togglePrankMessageFavorite: (m: PrankMessageRecord | string) => void

  prankTrapsRecent: PrankTrap[]
  syncPrankTrapsRecent: (recent: readonly PrankTrap[]) => void
  trapIntent: TrapIntent | null
  setTrapIntent: (intent: TrapIntent | null) => void

  prankChaosHistory: ChaosHistoryEntry[]

  prankSoundForgeSequences: SoundForgeSequence[]
  saveSoundForgeSequence: (sequence: SoundForgeSequence) => void
  deleteSoundForgeSequence: (id: string) => void
  duplicateSoundForgeSequence: (id: string) => SoundForgeSequence | null
  toggleSoundForgeFavorite: (id: string) => void
  markSoundForgeSequencePlayed: (id: string) => void
  soundForgeIntent: SoundForgeIntent | null
  setSoundForgeIntent: (intent: SoundForgeIntent | null) => void

  personalityId: string
  setPersonalityId: (id: string) => void

  voiceParams: VoiceParams
  setVoiceParams: (p: Partial<VoiceParams>) => void

  conversationMode: ConversationMode
  setConversationMode: (m: ConversationMode) => void

  messages: ChatMessage[]
  chatSendState: ChatSendState
  sendMessage: (text: string) => Promise<void>
  clearMessages: () => void

  responses: SavedResponse[]
  toggleFavorite: (id: string) => void
  deleteResponse: (id: string) => void
  restoreResponse: (id: string) => void
  restoreAllArchived: () => number
  addResponse: (r: Omit<SavedResponse, "id">) => { id: string; duplicate: boolean }
  updateResponse: (
    id: string,
    r: Omit<SavedResponse, "id">,
  ) => { duplicate: boolean }
  duplicateResponse: (id: string) => { id: string | null; duplicate: boolean }
  togglePinnedResponse: (id: string) => void
  useResponseInChat: (id: string) => void
  exportResponses: () => void
  importResponses: (json: string) => Promise<{ ok: boolean; imported: number; skipped: number }>

  settings: AssistantSettings
  updateSettings: (p: Partial<AssistantSettings>) => void
  capabilityPlatform: CapabilityPlatform
  networkConnected: boolean | null
  refreshCapabilities: () => Promise<void>
  requestPermission: (id: CapabilityId) => Promise<void>

  accentColor: AccentColor
  setAccentColor: (c: AccentColor) => void

  robotSource: RobotSource
  setRobotSource: (s: RobotSource) => void

  exportSettings: () => void
  importSettings: (json: string) => Promise<boolean>
  resetApp: () => Promise<void>
  networkDeviceIdentities: DeviceIdentityRecord[]
  setNetworkDeviceIdentities: Dispatch<SetStateAction<DeviceIdentityRecord[]>>
  networkEvents: NetworkEvent[]
  setNetworkEvents: Dispatch<SetStateAction<NetworkEvent[]>>
  lastNetworkScanDelta: ScanComparisonSummary | null
  setLastNetworkScanDelta: Dispatch<SetStateAction<ScanComparisonSummary | null>>
  persistedNetworkSettings: NetworkSettings | null
  setPersistedNetworkSettings: Dispatch<SetStateAction<NetworkSettings | null>>
  networkMonitorState: NetworkMonitorState
  setNetworkMonitorState: Dispatch<SetStateAction<NetworkMonitorState>>
  networkAlerts: NetworkAlert[]
  setNetworkAlerts: Dispatch<SetStateAction<NetworkAlert[]>>
  networkHealthSnapshots: NetworkHealthSnapshot[]
  setNetworkHealthSnapshots: Dispatch<SetStateAction<NetworkHealthSnapshot[]>>
  networkAssistantSnapshot: NetworkAssistantSnapshot | null
  setNetworkAssistantSnapshot: Dispatch<SetStateAction<NetworkAssistantSnapshot | null>>
  speedTestHistory: SpeedTestResult[]
  recordSpeedTestStarted: (runId: string, provider: string) => void
  recordSpeedTestResult: (result: SpeedTestResult) => void
  clearSpeedTestHistory: () => void

  notificationOpen: boolean
  setNotificationOpen: (o: boolean) => void
  acceptedGameInvite: string | null
  acceptGameInvite: (g: string) => void
  dismissGameInvite: () => void
}

const Ctx = createContext<AppState | null>(null)

const DEFAULT_VOICE_PARAMS: VoiceParams = {
  speed: 50,
  pitch: 50,
  volume: 75,
  emotion: 60,
}

const DEFAULT_SETTINGS: AssistantSettings = {
  memoryEnabled: true,
  randomGameInvites: true,
  randomJokes: true,
  prankSuggestions: true,
  autoGreeting: true,
  soundEffects: true,
  animationIntensity: 70,
  responseLength: "Balanced",
  safetyLevel: "Standard",
  notificationStyle: "Banner",
  wakePhrase: "Hey NEO",
  offlineMode: false,
  theme: "NEO_BLACK",
  assetPath: "/robot.png",
  gameDifficulty: "ADAPTIVE",
  trashTalk: true,
  autoScroll: true,
  showMoodTags: true,
  reducedMotion: false,
  backgroundService: false,
  debugMode: false,
  // Default: prefer the high-quality neural provider voice whenever it
  // is reachable. Users can flip to fallback-only in Settings if they
  // want strictly device-local TTS for cost / offline / privacy reasons.
  voiceQualityPreference: "prefer-high-quality",
  permissions: {
    microphone: "unknown",
    notifications: "unknown",
    storage: "unknown",
    bluetooth: "unavailable",
    network: "unknown",
  },
  onboarding: {
    completed: false,
    skipped: false,
    monitoringOptIn: false,
    initialScanRequested: false,
  },
  entitlement: { ...DEFAULT_ENTITLEMENT_STATE },
}

const DEFAULT_NETWORK_MONITOR_STATE: NetworkMonitorState = {
  enabled: false,
  nextRunAt: null,
  lastRunAt: null,
  lastCompletedAt: null,
  lastIssue: null,
  schedulerStatus: "idle",
  backgroundCapability: "in-app-only",
  notificationCapability: "unsupported-platform",
}

const CHECKING_PERMISSIONS: Record<CapabilityId, CapabilityState> = {
  microphone: "checking",
  notifications: "checking",
  storage: "checking",
  bluetooth: "unavailable",
  network: "checking",
}

const AVATAR_REACTION_PRIORITY: Record<AvatarReactionKey, number> = {
  thinking: 20,
  happy: 30,
  surprised: 40,
  ecstatic: 50,
  angry: 60,
  wakeup: 80,
  shutdown: 90,
}

const MIN_THINKING_DELAY_MS = 450
const MAX_THINKING_DELAY_MS = 1800

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function responseDelayFor(text: string, fallback?: boolean) {
  const byLength = Math.min(MAX_THINKING_DELAY_MS, MIN_THINKING_DELAY_MS + text.length * 7)
  return fallback ? Math.max(650, byLength) : Math.min(900, byLength)
}

function reactionForAssistantResponse({
  category,
  mood,
  reactionClip,
}: {
  category?: ChatMessage["category"]
  mood?: AssistantMood
  reactionClip?: AvatarReactionKey
}): AvatarReactionKey {
  if (reactionClip) return reactionClip
  if (category === "Game" || mood === "gaming") return "ecstatic"
  if (category === "Funny" || category === "Prank" || mood === "playful") return "surprised"
  if (category === "System" || mood === "thinking") return "surprised"
  return "happy"
}

function pickRelevantResponseLibraryContext(prompt: string, responses: SavedResponse[]) {
  const tokens = new Set(
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3),
  )
  if (!tokens.size) return []

  return responses
    .map((response) => {
      const haystack = `${response.title} ${response.body} ${response.category}`.toLowerCase()
      const score = [...tokens].reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0)
      return { response, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.response)
}

function normalizePermissions(
  permissions?: Partial<Record<CapabilityId, CapabilityState | boolean>>,
) {
  void permissions
  // Permission grants are device facts, not trusted imported settings.
  // They are re-checked after hydration before "granted" can be shown.
  const next = { ...DEFAULT_SETTINGS.permissions }
  return next
}

function createDefaultMessages(): ChatMessage[] {
  return [
    {
      id: "m1",
      role: "assistant",
      text: "Boot sequence complete. NEO online. Ask anything, or pick a game.",
      mood: "speaking",
      category: "System",
      ts: Date.now() - 60000,
    },
  ]
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<ScreenId>("main")
  const [mood, setMood] = useState<AssistantMood>("idle")
  const [avatarReaction, setAvatarReaction] = useState<AvatarReactionState | null>(null)
  const [voiceId, setVoiceIdState] = useState<string>(VOICES[0].id)
  const [voiceFavoriteIds, setVoiceFavoriteIds] = useState<string[]>([])
  const [recentVoiceIds, setRecentVoiceIds] = useState<string[]>([])
  const [personalityId, setPersonalityIdState] = useState<string>(PERSONALITIES[0].id)
  const [voiceParams, _setVoiceParams] = useState<VoiceParams>(DEFAULT_VOICE_PARAMS)
  const [conversationMode, setConversationMode] = useState<ConversationMode>(
    "Helpful Assistant",
  )
  const [messages, setMessages] = useState<ChatMessage[]>(createDefaultMessages)
  const [chatSendState, setChatSendState] = useState<ChatSendState>("idle")
  const [responses, setResponses] = useState<SavedResponse[]>(SAVED_RESPONSES)
  const [settings, setSettings] = useState<AssistantSettings>(DEFAULT_SETTINGS)
  const [accentColor, setAccentColor] = useState<AccentColor>("cyan")
  const [robotSource, setRobotSource] = useState<RobotSource>("image")
  const [capabilityPlatform, setCapabilityPlatform] =
    useState<CapabilityPlatform>("unknown")
  const [networkConnected, setNetworkConnected] = useState<boolean | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState<boolean>(true)
  const [acceptedGameInvite, setAcceptedGameInvite] = useState<string | null>(null)
  const [networkDeviceIdentities, setNetworkDeviceIdentities] = useState<DeviceIdentityRecord[]>([])
  const [networkEvents, setNetworkEvents] = useState<NetworkEvent[]>([])
  const [lastNetworkScanDelta, setLastNetworkScanDelta] =
    useState<ScanComparisonSummary | null>(null)
  const [persistedNetworkSettings, setPersistedNetworkSettings] =
    useState<NetworkSettings | null>(null)
  const [networkMonitorState, setNetworkMonitorState] =
    useState<NetworkMonitorState>(DEFAULT_NETWORK_MONITOR_STATE)
  const [networkAlerts, setNetworkAlerts] = useState<NetworkAlert[]>([])
  const [networkHealthSnapshots, setNetworkHealthSnapshots] = useState<NetworkHealthSnapshot[]>([])
  const [networkAssistantSnapshot, setNetworkAssistantSnapshot] =
    useState<NetworkAssistantSnapshot | null>(null)
  const [speedTestHistory, setSpeedTestHistory] = useState<SpeedTestResult[]>([])
  const [prankSoundFavoriteIds, setPrankSoundFavoriteIds] = useState<string[]>([])
  const [recentPrankSoundIds, setRecentPrankSoundIds] = useState<string[]>([])
  const [prankMessageHistory, setPrankMessageHistory] = useState<PrankMessageRecord[]>([])
  const [prankMessageFavorites, setPrankMessageFavorites] = useState<PrankMessageRecord[]>([])
  const [prankTrapsRecent, setPrankTrapsRecent] = useState<PrankTrap[]>([])
  const [trapIntent, setTrapIntent] = useState<TrapIntent | null>(null)
  const [prankChaosHistory, setPrankChaosHistory] = useState<ChaosHistoryEntry[]>([])
  const [prankSoundForgeSequences, setPrankSoundForgeSequences] = useState<
    SoundForgeSequence[]
  >([])
  const [soundForgeIntent, setSoundForgeIntent] = useState<SoundForgeIntent | null>(null)

  const avatarReactionIdRef = useRef(0)
  const skipNextPersist = useRef(false)

  const buildPersistedState = useCallback(
    (nextSettings = settings): PersistedAppState => ({
      version: STORAGE_SCHEMA_VERSION,
      voiceId,
      voiceFavoriteIds,
      recentVoiceIds,
      personalityId,
      voiceParams,
      conversationMode,
      settings: nextSettings,
      accentColor,
      robotSource,
      responses,
      messages: nextSettings.memoryEnabled ? messages : [],
      networkDeviceIdentities,
      networkEvents,
      lastNetworkScanDelta,
      networkSettings: persistedNetworkSettings ?? undefined,
      networkMonitorState,
      networkAlerts,
      networkHealthSnapshots,
      networkAssistantSnapshot,
      speedTestHistory,
      prankSoundFavoriteIds,
      recentPrankSoundIds,
      prankMessageHistory,
      prankMessageFavorites,
      prankTrapsHistory: prankTrapsRecent,
      prankChaosHistory,
      prankSoundForgeSequences,
    }),
    [
      accentColor,
      conversationMode,
      messages,
      networkDeviceIdentities,
      networkEvents,
      lastNetworkScanDelta,
      persistedNetworkSettings,
      networkMonitorState,
      networkAlerts,
      networkHealthSnapshots,
      networkAssistantSnapshot,
      speedTestHistory,
      prankSoundFavoriteIds,
      recentPrankSoundIds,
      prankMessageHistory,
      prankMessageFavorites,
      prankTrapsRecent,
      prankChaosHistory,
      prankSoundForgeSequences,
      personalityId,
      recentVoiceIds,
      responses,
      robotSource,
      settings,
      voiceId,
      voiceFavoriteIds,
      voiceParams,
    ],
  )

  const applyPersistedState = useCallback((stored: Partial<PersistedAppState>) => {
    if (stored.voiceId && VOICES.some((v) => v.id === stored.voiceId)) {
      setVoiceIdState(stored.voiceId)
    }
    if (stored.voiceFavoriteIds?.length) setVoiceFavoriteIds(stored.voiceFavoriteIds)
    if (stored.recentVoiceIds?.length) setRecentVoiceIds(stored.recentVoiceIds)
    if (
      stored.personalityId &&
      PERSONALITIES.some((p) => p.id === stored.personalityId)
    ) {
      setPersonalityIdState(stored.personalityId)
    }
    if (stored.voiceParams) {
      _setVoiceParams({ ...DEFAULT_VOICE_PARAMS, ...stored.voiceParams })
    }
    if (stored.conversationMode) setConversationMode(stored.conversationMode)
    if (stored.settings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...stored.settings,
        permissions: normalizePermissions(stored.settings.permissions),
        onboarding: {
          ...DEFAULT_SETTINGS.onboarding,
          ...(stored.settings.onboarding ?? {}),
        },
        entitlement: {
          ...DEFAULT_SETTINGS.entitlement,
          ...(stored.settings.entitlement ?? {}),
        },
      })
    }
    if (stored.accentColor) setAccentColor(stored.accentColor)
    if (stored.robotSource) setRobotSource(stored.robotSource)
    if (stored.responses?.length) setResponses(stored.responses)
    if (stored.settings?.memoryEnabled !== false && stored.messages?.length) {
      setMessages(stored.messages)
    }
    if (stored.networkDeviceIdentities?.length) {
      setNetworkDeviceIdentities(stored.networkDeviceIdentities)
    }
    if (stored.networkEvents?.length) setNetworkEvents(stored.networkEvents)
    if (stored.lastNetworkScanDelta) setLastNetworkScanDelta(stored.lastNetworkScanDelta)
    if (stored.networkSettings) setPersistedNetworkSettings(stored.networkSettings)
    if (stored.networkMonitorState) {
      setNetworkMonitorState({ ...DEFAULT_NETWORK_MONITOR_STATE, ...stored.networkMonitorState })
    }
    if (stored.networkAlerts?.length) setNetworkAlerts(stored.networkAlerts)
    if (stored.networkHealthSnapshots?.length) {
      setNetworkHealthSnapshots(stored.networkHealthSnapshots)
    }
    if (stored.networkAssistantSnapshot) setNetworkAssistantSnapshot(stored.networkAssistantSnapshot)
    if (stored.speedTestHistory?.length) setSpeedTestHistory(stored.speedTestHistory)
    if (stored.prankSoundFavoriteIds?.length) {
      const filtered = stored.prankSoundFavoriteIds.filter(isPlayableSoundId)
      if (filtered.length) setPrankSoundFavoriteIds(filtered)
    }
    if (stored.recentPrankSoundIds?.length) {
      const filtered = stored.recentPrankSoundIds.filter(isPlayableSoundId)
      if (filtered.length) setRecentPrankSoundIds(filtered)
    }
    if (stored.prankMessageHistory?.length) {
      setPrankMessageHistory(stored.prankMessageHistory)
    }
    if (stored.prankMessageFavorites?.length) {
      setPrankMessageFavorites(stored.prankMessageFavorites)
    }
    if (stored.prankTrapsHistory?.length) {
      const recent = stored.prankTrapsHistory.filter(
        (t) => t.status === "fired" || t.status === "cancelled" || t.status === "failed",
      )
      setPrankTrapsRecent(recent)
      prankTrapsManager.hydrateRecent(recent)
    }
    if (stored.prankChaosHistory?.length) {
      setPrankChaosHistory(stored.prankChaosHistory)
      chaosManager.hydrateHistory(stored.prankChaosHistory)
    }
    if (stored.prankSoundForgeSequences?.length) {
      const normalized = normalizeStoredSequences(stored.prankSoundForgeSequences)
      if (normalized.length) setPrankSoundForgeSequences(normalized)
    }
  }, [])

  const recordSpeedTestStarted = useCallback((runId: string, provider: string) => {
    setNetworkEvents((current) =>
      appendNetworkEvents(current, [createSpeedTestStartedEvent(runId, provider)]),
    )
  }, [])

  const recordSpeedTestResult = useCallback((result: SpeedTestResult) => {
    setSpeedTestHistory((current) => [result, ...current].slice(0, 50))
    setNetworkEvents((current) => {
      const event = result.success
        ? createSpeedTestCompletedEvent(result)
        : createSpeedTestFailedEvent(
            result.id,
            result.provider,
            result.failureReason ?? "unknown-error",
            result.completedAt,
          )
      return appendNetworkEvents(current, [event])
    })
  }, [])

  const clearSpeedTestHistory = useCallback(() => {
    setSpeedTestHistory([])
  }, [])

  useEffect(() => {
    let cancelled = false

    readStoredState()
      .then((stored) => {
        if (cancelled) return
        if (stored) applyPersistedState(stored)
      })
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [applyPersistedState])

  useEffect(() => {
    if (!hydrated) return
    if (skipNextPersist.current) {
      skipNextPersist.current = false
      return
    }
    writeStoredState(buildPersistedState()).catch(() => {})
  }, [buildPersistedState, hydrated])

  const setVoiceParams = useCallback((p: Partial<VoiceParams>) => {
    _setVoiceParams((cur) => ({ ...cur, ...p }))
  }, [])

  const setVoiceId = useCallback((id: string) => {
    if (!VOICES.some((voice) => voice.id === id)) return
    setVoiceIdState(id)
    setRecentVoiceIds((current) => [id, ...current.filter((voiceId) => voiceId !== id)].slice(0, 8))
  }, [])

  const setPersonalityId = useCallback((id: string) => {
    if (!PERSONALITIES.some((personality) => personality.id === id)) return
    setPersonalityIdState(id)
  }, [])

  const playAvatarReaction = useCallback((reactionKey: AvatarReactionKey) => {
    const priority = AVATAR_REACTION_PRIORITY[reactionKey]
    setAvatarReaction((current) => {
      if (current && priority < current.priority) return current
      avatarReactionIdRef.current += 1
      return { id: avatarReactionIdRef.current, key: reactionKey, priority }
    })
  }, [])

  const clearAvatarReaction = useCallback(() => {
    setAvatarReaction(null)
  }, [])

  const toggleVoiceFavorite = useCallback((id: string) => {
    setVoiceFavoriteIds((current) =>
      current.includes(id)
        ? current.filter((voiceId) => voiceId !== id)
        : [id, ...current],
    )
    playAvatarReaction("happy")
  }, [playAvatarReaction])

  const togglePrankSoundFavorite = useCallback((id: string) => {
    setPrankSoundFavoriteIds((current) =>
      current.includes(id)
        ? current.filter((soundId) => soundId !== id)
        : [id, ...current],
    )
  }, [])

  const recordPrankSoundPlay = useCallback((id: string) => {
    setRecentPrankSoundIds((current) => {
      const next = [id, ...current.filter((soundId) => soundId !== id)]
      return next.slice(0, 24)
    })
  }, [])

  const addPrankMessageToHistory = useCallback((m: PrankMessageRecord) => {
    setPrankMessageHistory((current) => {
      const deduped = current.filter((existing) => existing.text !== m.text)
      return [m, ...deduped].slice(0, 50)
    })
  }, [])

  const removePrankMessageFromHistory = useCallback((id: string) => {
    setPrankMessageHistory((current) => current.filter((m) => m.id !== id))
  }, [])

  const clearPrankMessageHistory = useCallback(() => {
    setPrankMessageHistory([])
  }, [])

  const syncPrankTrapsRecent = useCallback((recent: readonly PrankTrap[]) => {
    setPrankTrapsRecent([...recent])
  }, [])

  // Mirror the trap manager's recent-history slice into store state so it
  // participates in the persistence pipeline alongside other Prankstar
  // history. Active armed traps live in the manager only and are NOT
  // persisted — closed-app firing is not supported in this build.
  useEffect(() => {
    return prankTrapsManager.subscribe((snap) => {
      setPrankTrapsRecent([...snap.recent])
    })
  }, [])

  // Mirror the chaos manager's history slice into store state so it
  // participates in the persistence pipeline. The in-flight `current` action
  // lives in the manager only and is NOT persisted — closed-app execution
  // is not supported.
  useEffect(() => {
    return chaosManager.subscribe((snap) => {
      setPrankChaosHistory([...snap.history])
    })
  }, [])

  const saveSoundForgeSequence = useCallback((sequence: SoundForgeSequence) => {
    setPrankSoundForgeSequences((current) => {
      const filtered = current.filter((s) => s.id !== sequence.id)
      return [sequence, ...filtered].slice(0, SOUND_FORGE_SEQUENCES_CAP)
    })
  }, [])

  const deleteSoundForgeSequence = useCallback((id: string) => {
    setPrankSoundForgeSequences((current) => current.filter((s) => s.id !== id))
  }, [])

  const duplicateSoundForgeSequence = useCallback(
    (id: string): SoundForgeSequence | null => {
      const source = prankSoundForgeSequences.find((s) => s.id === id)
      if (!source) return null
      const now = Date.now()
      const copy: SoundForgeSequence = {
        ...source,
        id: `sf-seq-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${source.name} (Copy)`.slice(0, 60),
        createdAt: now,
        updatedAt: now,
        favorite: false,
        lastPlayedAt: undefined,
        steps: source.steps.map((step) => ({
          ...step,
          id: `sf-step-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        })),
      }
      setPrankSoundForgeSequences((current) =>
        [copy, ...current].slice(0, SOUND_FORGE_SEQUENCES_CAP),
      )
      return copy
    },
    [prankSoundForgeSequences],
  )

  const toggleSoundForgeFavorite = useCallback((id: string) => {
    setPrankSoundForgeSequences((current) =>
      current.map((seq) =>
        seq.id === id ? { ...seq, favorite: !seq.favorite } : seq,
      ),
    )
  }, [])

  const markSoundForgeSequencePlayed = useCallback((id: string) => {
    setPrankSoundForgeSequences((current) =>
      current.map((seq) =>
        seq.id === id ? { ...seq, lastPlayedAt: Date.now() } : seq,
      ),
    )
  }, [])

  const togglePrankMessageFavorite = useCallback(
    (input: PrankMessageRecord | string) => {
      if (typeof input === "string") {
        setPrankMessageFavorites((current) =>
          current.filter((m) => m.id !== input),
        )
        return
      }
      setPrankMessageFavorites((current) => {
        const existingByText = current.find((m) => m.text === input.text)
        if (existingByText) {
          return current.filter((m) => m.id !== existingByText.id)
        }
        return [input, ...current].slice(0, 80)
      })
    },
    [],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      if (chatSendState === "sending" || chatSendState === "responding") return

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text: text.trim(),
        ts: Date.now(),
      }
      const nextMessages = [...messages, userMsg]
      setMessages(nextMessages)
      setChatSendState("sending")
      setMood("thinking")
      playAvatarReaction("thinking")

      setChatSendState("responding")
      const reply = await generateAssistantReply({
        userMessage: userMsg.text,
        recentMessages: nextMessages.map((message) => ({
          role: message.role,
          text: message.text,
        })),
        personalityId,
        conversationMode,
        responseLibraryContext: pickRelevantResponseLibraryContext(userMsg.text, responses),
        networkContext: buildNetworkAssistantContext({
          prompt: userMsg.text,
          snapshot: networkAssistantSnapshot,
          events: networkEvents,
          latestScan: lastNetworkScanDelta,
          healthSnapshots: networkHealthSnapshots,
          alerts: networkAlerts,
          monitorState: networkMonitorState,
        }),
      })

      const isLocalEngine = reply.mode === "local-engine"
      await wait(responseDelayFor(reply.text, isLocalEngine))

      if (process.env.NODE_ENV !== "production" && reply.status !== "ok") {
        console.info("[assistant-runtime]", {
          status: reply.status,
          mode: reply.mode,
          fallbackReason: reply.fallbackReason,
          error: reply.error,
        })
      }

      const aMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: reply.text,
        mood: reply.mood ?? (isLocalEngine ? "thinking" : "speaking"),
        category: reply.category,
        intent: reply.detectedIntent,
        emotion: reply.emotion,
        followUpSuggestions: reply.suggestedActions?.slice(0, 2),
        ts: Date.now(),
        source: reply.status === "hard-fail" ? "system" : isLocalEngine ? "demo" : "assistant",
      }
      setMessages((m) => [...m, aMsg])
      setMood(aMsg.mood ?? "speaking")

      if (reply.status === "hard-fail") {
        playAvatarReaction("angry")
      } else {
        playAvatarReaction(
          reactionForAssistantResponse({
            category: aMsg.category,
            mood: aMsg.mood,
            reactionClip: reply.reactionClip,
          }),
        )
      }

      setChatSendState(reply.status === "hard-fail" ? "error" : "success")
      setTimeout(() => setMood("idle"), 2200)
      setTimeout(() => setChatSendState("idle"), 1200)
    },
    [
      chatSendState,
      conversationMode,
      lastNetworkScanDelta,
      messages,
      networkAlerts,
      networkAssistantSnapshot,
      networkEvents,
      networkHealthSnapshots,
      networkMonitorState,
      personalityId,
      playAvatarReaction,
      responses,
    ],
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    let favorited = false
    setResponses((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r
        favorited = !r.favorite
        return { ...r, favorite: !r.favorite }
      }),
    )
    if (favorited) playAvatarReaction("happy")
  }, [playAvatarReaction])

  const deleteResponse = useCallback((id: string) => {
    setResponses((rs) =>
      rs.map((response) =>
        response.id === id
          ? { ...response, archived: true, updatedAt: new Date().toISOString() }
          : response,
      ),
    )
  }, [])

  const restoreResponse = useCallback((id: string) => {
    setResponses((rs) =>
      rs.map((response) =>
        response.id === id && response.archived
          ? { ...response, archived: false, updatedAt: new Date().toISOString() }
          : response,
      ),
    )
  }, [])

  const restoreAllArchived = useCallback(() => {
    let restored = 0
    setResponses((rs) =>
      rs.map((response) => {
        if (!response.archived) return response
        restored += 1
        return { ...response, archived: false, updatedAt: new Date().toISOString() }
      }),
    )
    return restored
  }, [])

  const addResponse = useCallback((r: Omit<SavedResponse, "id">) => {
    const id = `r-${Date.now()}`
    const normalized = normalizeResponseInput(r)
    const duplicate = responses.some((existing) => !existing.archived && responseKey(existing) === responseKey(normalized))
    if (!duplicate) setResponses((rs) => [{ ...normalized, id }, ...rs])
    playAvatarReaction(duplicate ? "angry" : r.category === "Celebration lines" ? "ecstatic" : "happy")
    return { id, duplicate }
  }, [playAvatarReaction, responses])

  const updateResponse = useCallback(
    (id: string, r: Omit<SavedResponse, "id">) => {
      const normalized = normalizeResponseInput(r)
      const duplicate = responses.some(
        (existing) => existing.id !== id && !existing.archived && responseKey(existing) === responseKey(normalized),
      )
      if (!duplicate) {
        setResponses((rs) =>
          rs.map((existing) => (existing.id === id ? { ...normalized, id } : existing)),
        )
      }
      playAvatarReaction(duplicate ? "angry" : "happy")
      return { duplicate }
    },
    [playAvatarReaction, responses],
  )

  const duplicateSavedResponse = useCallback((id: string) => {
    const source = responses.find((response) => response.id === id)
    if (!source) return { id: null, duplicate: true }
    const next = duplicateResponse(source)
    const nextId = `r-${Date.now()}`
    const duplicate = responses.some((existing) => !existing.archived && responseKey(existing) === responseKey(next))
    if (!duplicate) setResponses((rs) => [{ ...next, id: nextId }, ...rs])
    playAvatarReaction(duplicate ? "angry" : "happy")
    return { id: duplicate ? null : nextId, duplicate }
  }, [playAvatarReaction, responses])

  const togglePinnedResponse = useCallback((id: string) => {
    let pinned = false
    setResponses((rs) =>
      rs.map((response) => {
        if (response.id !== id) return response
        pinned = !response.pinned
        return { ...response, pinned, updatedAt: new Date().toISOString() }
      }),
    )
    if (pinned) playAvatarReaction("happy")
  }, [playAvatarReaction])

  const useResponseInChat = useCallback((id: string) => {
    const response = responses.find((item) => item.id === id)
    if (!response) return
    const now = Date.now()
    setResponses((rs) => rs.map((item) => (item.id === id ? markResponseUsed(item) : item)))
    setMessages((current) => [
      ...current,
      {
        id: `vault-${now}`,
        role: "assistant",
        text: response.body,
        category:
          response.category === "Jokes" || response.category === "Comebacks"
            ? "Funny"
            : response.category === "Prank ideas"
              ? "Prank"
              : response.category === "Game invites"
                ? "Game"
                : "Helpful",
        mood: response.mood,
        ts: now,
        source: "system",
      },
    ])
    setScreen("chat")
    playAvatarReaction(response.category === "Celebration lines" ? "ecstatic" : "happy")
  }, [playAvatarReaction, responses])

  const exportResponses = useCallback(() => {
    if (typeof window === "undefined") return
    const payload = JSON.stringify(
      {
        version: STORAGE_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        app: "NEO the Nerd",
        responses,
      },
      null,
      2,
    )
    const blob = new Blob([payload], { type: "application/json" })
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement("a")
    link.href = url
    link.download = "neo-the-nerd-response-vault.json"
    link.click()
    window.URL.revokeObjectURL(url)
  }, [responses])

  const importResponses = useCallback(async (json: string) => {
    try {
      const parsed = JSON.parse(json) as
        | SavedResponse[]
        | { responses?: Partial<SavedResponse>[] }
      const incoming = Array.isArray(parsed) ? parsed : parsed.responses
      if (!Array.isArray(incoming)) {
        return { ok: false, imported: 0, skipped: 0 }
      }

      let imported = 0
      let skipped = 0
      const keys = new Set(responses.map(responseKey))
      const additions: SavedResponse[] = []
      incoming.forEach((item, index) => {
        const normalized = normalizeImportedResponse(item, index)
        if (!normalized) {
          skipped += 1
          return
        }
        const key = responseKey(normalized)
        if (keys.has(key)) {
          skipped += 1
          return
        }
        keys.add(key)
        imported += 1
        additions.push(normalized)
      })
      if (additions.length) setResponses((current) => [...additions, ...current])
      return { ok: true, imported, skipped }
    } catch {
      return { ok: false, imported: 0, skipped: 0 }
    }
  }, [responses])

  const updateSettings = useCallback((p: Partial<AssistantSettings>) => {
    setSettings((s) => ({ ...s, ...p }))
  }, [])

  const refreshCapabilities = useCallback(async () => {
    setSettings((s) => ({
      ...s,
      permissions: { ...s.permissions, ...CHECKING_PERMISSIONS },
    }))
    const status = await checkCapabilities()
    setCapabilityPlatform(status.platform)
    setNetworkConnected(status.networkConnected)
    setSettings((s) => ({
      ...s,
      permissions: status.states,
      offlineMode:
        status.networkConnected === false ? true : s.offlineMode,
    }))
  }, [])

  const requestPermission = useCallback(
    async (id: CapabilityId) => {
      setSettings((s) => ({
        ...s,
        permissions: { ...s.permissions, [id]: "checking" },
      }))
      const state = await requestCapability(id)
      setSettings((s) => ({
        ...s,
        permissions: { ...s.permissions, [id]: state },
      }))
      await refreshCapabilities()
    },
    [refreshCapabilities],
  )

  useEffect(() => {
    if (!hydrated) return
    refreshCapabilities().catch(() => {
      setSettings((s) => ({
        ...s,
        permissions: DEFAULT_SETTINGS.permissions,
      }))
    })
  }, [hydrated, refreshCapabilities])

  const acceptGameInvite = useCallback((g: string) => {
    setAcceptedGameInvite(g)
    setNotificationOpen(false)
    setScreen("games")
  }, [])

  const dismissGameInvite = useCallback(() => {
    setNotificationOpen(false)
  }, [])

  const exportSettings = useCallback(() => {
    if (typeof window === "undefined") return
    const payload = JSON.stringify(buildPersistedState(), null, 2)
    const blob = new Blob([payload], { type: "application/json" })
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement("a")
    link.href = url
    link.download = "neo-the-nerd-settings.json"
    link.click()
    window.URL.revokeObjectURL(url)
  }, [buildPersistedState])

  const importSettings = useCallback(
    async (json: string) => {
      try {
        const parsed = JSON.parse(json) as Partial<PersistedAppState>
        applyPersistedState(parsed)
        await writeStoredState({
          ...buildPersistedState(),
          ...parsed,
          version: STORAGE_SCHEMA_VERSION,
          settings: {
            ...DEFAULT_SETTINGS,
            ...parsed.settings,
            permissions: normalizePermissions(parsed.settings?.permissions),
            onboarding: {
              ...DEFAULT_SETTINGS.onboarding,
              ...(parsed.settings?.onboarding ?? {}),
            },
            entitlement: {
              ...DEFAULT_SETTINGS.entitlement,
              ...(parsed.settings?.entitlement ?? {}),
            },
          },
          voiceParams: { ...DEFAULT_VOICE_PARAMS, ...parsed.voiceParams },
          voiceFavoriteIds: parsed.voiceFavoriteIds ?? voiceFavoriteIds,
          recentVoiceIds: parsed.recentVoiceIds ?? recentVoiceIds,
          responses: parsed.responses ?? responses,
          networkDeviceIdentities: parsed.networkDeviceIdentities ?? networkDeviceIdentities,
          networkEvents: parsed.networkEvents ?? networkEvents,
          lastNetworkScanDelta: parsed.lastNetworkScanDelta ?? lastNetworkScanDelta,
          networkSettings: parsed.networkSettings ?? persistedNetworkSettings ?? undefined,
          networkMonitorState: parsed.networkMonitorState ?? networkMonitorState,
          networkAlerts: parsed.networkAlerts ?? networkAlerts,
          networkHealthSnapshots: parsed.networkHealthSnapshots ?? networkHealthSnapshots,
          networkAssistantSnapshot: parsed.networkAssistantSnapshot ?? networkAssistantSnapshot,
          speedTestHistory: parsed.speedTestHistory ?? speedTestHistory,
          prankSoundFavoriteIds:
            parsed.prankSoundFavoriteIds ?? prankSoundFavoriteIds,
          recentPrankSoundIds:
            parsed.recentPrankSoundIds ?? recentPrankSoundIds,
          prankMessageHistory:
            parsed.prankMessageHistory ?? prankMessageHistory,
          prankMessageFavorites:
            parsed.prankMessageFavorites ?? prankMessageFavorites,
          prankTrapsHistory:
            parsed.prankTrapsHistory ?? prankTrapsRecent,
          prankChaosHistory:
            parsed.prankChaosHistory ?? prankChaosHistory,
          prankSoundForgeSequences:
            parsed.prankSoundForgeSequences ?? prankSoundForgeSequences,
          messages:
            parsed.settings?.memoryEnabled === false
              ? []
              : parsed.messages ?? messages,
        })
        return true
      } catch {
        return false
      }
    },
    [
      applyPersistedState,
      buildPersistedState,
      messages,
      networkDeviceIdentities,
      networkEvents,
      lastNetworkScanDelta,
      persistedNetworkSettings,
      networkMonitorState,
      networkAlerts,
      networkHealthSnapshots,
      networkAssistantSnapshot,
      speedTestHistory,
      prankSoundFavoriteIds,
      recentPrankSoundIds,
      prankMessageHistory,
      prankMessageFavorites,
      prankTrapsRecent,
      prankChaosHistory,
      prankSoundForgeSequences,
      recentVoiceIds,
      responses,
      voiceFavoriteIds,
    ],
  )

  const resetApp = useCallback(async () => {
    await clearStoredState()
    skipNextPersist.current = true
    setScreen("main")
    setMood("idle")
    setVoiceIdState(VOICES[0].id)
    setVoiceFavoriteIds([])
    setRecentVoiceIds([])
    setPersonalityId(PERSONALITIES[0].id)
    _setVoiceParams(DEFAULT_VOICE_PARAMS)
    setConversationMode("Helpful Assistant")
    setMessages(createDefaultMessages())
    setResponses(SAVED_RESPONSES)
    setSettings(DEFAULT_SETTINGS)
    setAccentColor("cyan")
    setRobotSource("image")
    setNotificationOpen(true)
    setAcceptedGameInvite(null)
    setNetworkDeviceIdentities([])
    setNetworkEvents([])
    setLastNetworkScanDelta(null)
    setPersistedNetworkSettings(null)
    setNetworkMonitorState(DEFAULT_NETWORK_MONITOR_STATE)
    setNetworkAlerts([])
    setNetworkHealthSnapshots([])
    setNetworkAssistantSnapshot(null)
    setSpeedTestHistory([])
    setPrankSoundFavoriteIds([])
    setRecentPrankSoundIds([])
    setPrankMessageHistory([])
    setPrankMessageFavorites([])
    prankTrapsManager.cancelAll()
    prankTrapsManager.clearHistory()
    setPrankTrapsRecent([])
    setTrapIntent(null)
    chaosManager.cancel()
    chaosManager.clearHistory()
    setPrankChaosHistory([])
    soundForgeManager.reset()
    setPrankSoundForgeSequences([])
    setSoundForgeIntent(null)
  }, [setPersonalityId])

  const value = useMemo<AppState>(
    () => ({
      screen, setScreen,
      mood, setMood,
      avatarReaction, playAvatarReaction, clearAvatarReaction,
      voiceId, setVoiceId,
      voiceFavoriteIds, recentVoiceIds, toggleVoiceFavorite,
      personalityId, setPersonalityId,
      voiceParams, setVoiceParams,
      conversationMode, setConversationMode,
      messages, chatSendState, sendMessage, clearMessages,
      responses, toggleFavorite, deleteResponse, restoreResponse, restoreAllArchived, addResponse,
      updateResponse, duplicateResponse: duplicateSavedResponse,
      togglePinnedResponse, useResponseInChat, exportResponses, importResponses,
      settings, updateSettings,
      capabilityPlatform, networkConnected, refreshCapabilities, requestPermission,
      accentColor, setAccentColor,
      robotSource, setRobotSource,
      exportSettings, importSettings, resetApp,
      networkDeviceIdentities, setNetworkDeviceIdentities,
      networkEvents, setNetworkEvents,
      lastNetworkScanDelta, setLastNetworkScanDelta,
      persistedNetworkSettings, setPersistedNetworkSettings,
      networkMonitorState, setNetworkMonitorState,
      networkAlerts, setNetworkAlerts,
      networkHealthSnapshots, setNetworkHealthSnapshots,
      networkAssistantSnapshot, setNetworkAssistantSnapshot,
      speedTestHistory, recordSpeedTestStarted, recordSpeedTestResult, clearSpeedTestHistory,
      notificationOpen, setNotificationOpen,
      acceptedGameInvite, acceptGameInvite, dismissGameInvite,
      prankSoundFavoriteIds, recentPrankSoundIds,
      togglePrankSoundFavorite, recordPrankSoundPlay,
      prankMessageHistory, prankMessageFavorites,
      addPrankMessageToHistory, removePrankMessageFromHistory,
      clearPrankMessageHistory, togglePrankMessageFavorite,
      prankTrapsRecent, syncPrankTrapsRecent,
      trapIntent, setTrapIntent,
      prankChaosHistory,
      prankSoundForgeSequences,
      saveSoundForgeSequence,
      deleteSoundForgeSequence,
      duplicateSoundForgeSequence,
      toggleSoundForgeFavorite,
      markSoundForgeSequencePlayed,
      soundForgeIntent,
      setSoundForgeIntent,
    }),
    [
      screen, mood, avatarReaction, voiceId, voiceFavoriteIds, recentVoiceIds, personalityId, voiceParams, conversationMode,
      messages, chatSendState, responses, settings, accentColor, robotSource,
      capabilityPlatform,
      networkConnected,
      notificationOpen,
      acceptedGameInvite,
      networkDeviceIdentities,
      networkEvents,
      lastNetworkScanDelta,
      persistedNetworkSettings,
      networkMonitorState,
      networkAlerts,
      networkHealthSnapshots,
      networkAssistantSnapshot,
      speedTestHistory,
      recordSpeedTestStarted,
      recordSpeedTestResult,
      clearSpeedTestHistory,
      sendMessage, clearMessages, toggleFavorite, deleteResponse, restoreResponse, restoreAllArchived, addResponse,
      updateResponse, duplicateSavedResponse, togglePinnedResponse, useResponseInChat,
      exportResponses, importResponses,
      updateSettings, setVoiceId, setVoiceParams, toggleVoiceFavorite, acceptGameInvite, dismissGameInvite,
      refreshCapabilities, requestPermission,
      exportSettings, importSettings, resetApp, playAvatarReaction, clearAvatarReaction, setPersonalityId,
      prankSoundFavoriteIds, recentPrankSoundIds,
      togglePrankSoundFavorite, recordPrankSoundPlay,
      prankMessageHistory, prankMessageFavorites,
      addPrankMessageToHistory, removePrankMessageFromHistory,
      clearPrankMessageHistory, togglePrankMessageFavorite,
      prankTrapsRecent, syncPrankTrapsRecent,
      trapIntent,
      prankChaosHistory,
      prankSoundForgeSequences,
      saveSoundForgeSequence,
      deleteSoundForgeSequence,
      duplicateSoundForgeSequence,
      toggleSoundForgeFavorite,
      markSoundForgeSequencePlayed,
      soundForgeIntent,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useApp must be used inside AppProvider")
  return ctx
}

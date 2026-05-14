import type {
  AssistantMood,
  AvatarReactionKey,
  ConversationMode,
  ResponseCategory,
  SavedResponse,
} from "@/lib/types"
import type {
  PersonalityResponseStyle,
  PersonalityTone,
  PersonalityVerbosity,
} from "@/lib/personality/personalityProfiles"

export type AssistantMessageRole = "user" | "assistant" | "system"

export type AssistantMessageSource = "provider" | "local-engine" | "response-library"

export type AssistantIntent =
  | "greet"
  | "ask-for-help"
  | "joke-request"
  | "prank-request"
  | "tech-question"
  | "play-game"
  | "react-to-comment"
  | "continue-conversation"
  | "gratitude"
  | "frustration"
  | "unknown"

export type AssistantEmotionState =
  | "calm"
  | "focused"
  | "playful"
  | "hyped"
  | "curious"
  | "concerned"
  | "amused"
  | "apologetic"

export interface AssistantMessage {
  id: string
  role: AssistantMessageRole
  content: string
  createdAt: number
  mood?: AssistantMood
  personalityId?: string
  intent?: AssistantIntent
  source: AssistantMessageSource
}

export interface AssistantPersonalityProfile {
  id: string
  name: string
  description: string
  tone: PersonalityTone
  responseStyle: PersonalityResponseStyle
  verbosity: PersonalityVerbosity
  humor: number
  aggressiveness: number
  voiceId: string
  coreIdentity: string
  preferredResponseShape: string
  sampleResponseText: string
  recommendedQuickPrompts: string[]
  toneKeywords: string[]
  humorLevel: number
  warmthLevel: number
  snarkLevel: number
  creativityLevel: number
  directnessLevel: number
  idealUseCases: string[]
  greetingStyle: string
  fillerPhrasePool: string[]
  reactionBias: Partial<Record<AssistantIntent, AssistantEmotionState>>
  rhythm: "crisp" | "warm" | "chaotic" | "cinematic" | "tactical" | "gentle"
  followUpStyle: "direct-question" | "offer-options" | "challenge" | "soft-check-in" | "none"
}

export interface AssistantContextSnapshot {
  activePersonality: AssistantPersonalityProfile
  activeMood: AssistantMood
  recentMessages: AssistantMessage[]
  conversationMode: ConversationMode
  userPrompt: string
  lastAssistantTopic?: string
  appStateHints?: string[]
  responseLibraryMatches?: SavedResponse[]
}

export interface AssistantMemorySnapshot {
  recentIntent?: AssistantIntent
  lastTopic?: string
  lastUsedJokeCategory?: string
  recentAssistantPhrases: string[]
}

export interface AssistantResponseDraft {
  content: string
  source: AssistantMessageSource
  detectedIntent: AssistantIntent
  emotion: AssistantEmotionState
  category: ResponseCategory
  optionalSuggestedActions?: string[]
  optionalReactionClip?: AvatarReactionKey
}

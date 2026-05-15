import type { ChatMessage, ConversationMode } from "@/lib/types"
import { getAssistantPersonalityProfile } from "./personalityProfiles"
import { getPersonalityResponseTags, getVoiceToneSummary } from "./assistantIntegrations"

const PROFILE_SUGGESTIONS: Record<string, string[]> = {
  genius: ["Help me plan", "Explain this simply", "Find the clean path"],
  chaos: ["Give me a harmless prank", "Write a ridiculous comeback", "Make it weirder"],
  friendly: ["Help me with this", "Encourage me", "Make it simple"],
  snark: ["Roast this lightly", "Give me a sharp comeback", "Make it less painful"],
  gm: ["Challenge me", "Start a mini-game", "Give me trivia"],
  wizard: ["Debug this", "Explain the error", "Make a fix plan"],
  motivator: ["Hype me up", "Plan my next 30 minutes", "Keep me moving"],
  detective: ["Analyze this clue", "Find the pattern", "Ask me evidence questions"],
  story: ["Start a story", "Make it cinematic", "Build a world"],
  calm: ["Slow this down", "Help me focus", "Make a gentle plan"],
  hype: ["Start a challenge", "Give me energy", "Make it fast"],
  strat: ["Prioritize this", "Compare my options", "Give me a strategy"],
}

const MODE_SUGGESTIONS: Record<ConversationMode, string[]> = {
  "Helpful Assistant": ["Help me plan", "Explain this simply", "Give me next steps"],
  "Funny Companion": ["Tell me a quick joke", "Roast me lightly", "Make this funny"],
  "Prank Coach": ["Give me a harmless prank", "Make it reversible", "Prank safety check"],
  "Game Buddy": ["Challenge me", "Start a mini-game", "Give me trivia"],
  "Tech Helper": ["Debug this", "Quick tech tip", "Explain the error"],
  "Chill Mode": ["Slow this down", "Talk me through it", "Make a calm plan"],
}

const NETWORK_SUGGESTIONS = [
  "Explain my network",
  "What changed?",
  "Show unknown devices",
  "Why is health degraded?",
]

export function getAssistantPromptSuggestions({
  personalityId,
  conversationMode,
  lastAssistantMessage,
  voiceId,
}: {
  personalityId: string
  conversationMode: ConversationMode
  lastAssistantMessage?: ChatMessage
  voiceId?: string
}) {
  const profile = getAssistantPersonalityProfile(personalityId)
  const profileSuggestions = PROFILE_SUGGESTIONS[profile.id] ?? PROFILE_SUGGESTIONS.genius
  const modeSuggestions = MODE_SUGGESTIONS[conversationMode]
  const contextual = contextualSuggestions(lastAssistantMessage)
  const responseTagSuggestions = getPersonalityResponseTags(profile.id).slice(0, 2).map((tag) => `Use ${tag} tone`)
  const voiceSuggestion = voiceId ? [`Match ${getVoiceToneSummary(voiceId).split(" // ")[0]}`] : []

  return uniqueShortSuggestions([
    ...contextual,
    ...NETWORK_SUGGESTIONS,
    ...voiceSuggestion,
    ...responseTagSuggestions,
    ...profileSuggestions,
    ...modeSuggestions,
  ]).slice(0, 6)
}

function contextualSuggestions(message?: ChatMessage) {
  if (!message) return []
  if (message.category === "Funny") return ["Another one", "Make it nerdier"]
  if (message.category === "Prank") return ["Make it safer", "Give me another prank"]
  if (message.category === "Game") return ["Play now", "Pick another game"]
  if (message.category === "Helpful") return ["Give me steps", "Simplify it"]
  if (message.intent === "frustration") return ["Slow down", "Find the blocker"]
  return message.followUpSuggestions ?? []
}

function uniqueShortSuggestions(suggestions: string[]) {
  const seen = new Set<string>()
  return suggestions.filter((suggestion) => {
    const key = suggestion.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return suggestion.length <= 34
  })
}

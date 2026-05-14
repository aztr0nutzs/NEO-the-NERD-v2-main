import type { ChatMessage, ConversationMode, SavedResponse } from "@/lib/types"
import { SAVED_RESPONSES } from "@/lib/data"
import { getAssistantPersonalityProfile } from "./personalityProfiles"
import type { AssistantContextSnapshot, AssistantMessage } from "./types"

export function toAssistantMessage(
  message: Pick<ChatMessage, "role" | "text">,
  index: number,
): AssistantMessage {
  return {
    id: `chat-${index}`,
    role: message.role,
    content: message.text,
    createdAt: Date.now() - index,
    source: "provider",
  }
}

export function findResponseLibraryMatches(
  prompt: string,
  responses: SavedResponse[] = SAVED_RESPONSES,
) {
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

export function buildAssistantContext({
  messages,
  personalityId,
  conversationMode,
  responseLibrary,
}: {
  messages: Pick<ChatMessage, "role" | "text">[]
  personalityId: string
  conversationMode: ConversationMode
  responseLibrary?: SavedResponse[]
}): AssistantContextSnapshot {
  const recentMessages = messages.slice(-16).map(toAssistantMessage)
  const userPrompt =
    [...recentMessages].reverse().find((message) => message.role === "user")?.content ?? ""

  return {
    activePersonality: getAssistantPersonalityProfile(personalityId),
    activeMood: "thinking",
    recentMessages,
    conversationMode,
    userPrompt,
    responseLibraryMatches: findResponseLibraryMatches(userPrompt, responseLibrary),
  }
}

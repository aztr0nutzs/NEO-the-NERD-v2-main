import type { ChatMessage, ConversationMode, ResponseCategory, SavedResponse } from "@/lib/types"
import type { AssistantEmotionState, AssistantIntent } from "./types"
import type { AssistantMood, AvatarReactionKey } from "@/lib/types"
import type { NetworkAssistantContext } from "@/lib/network/types"

export interface AssistantProviderChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface AssistantProviderRequest {
  userMessage: string
  recentMessages: AssistantProviderChatMessage[]
  personalityId: string
  conversationMode: ConversationMode
  responseLibraryContext?: SavedResponse[]
  networkContext?: NetworkAssistantContext | null
}

export interface AssistantProviderPrompt {
  instructions: string
  messages: AssistantProviderChatMessage[]
}

export interface AssistantProviderCompletion {
  text: string
  provider: "openai"
  model: string
}

export interface AssistantProviderStatus {
  provider: "openai"
  providerConfigured: boolean
  model: string
  supportsStreaming: boolean
  message: string
}

export interface AssistantProviderAdapter {
  sendChatCompletion(prompt: AssistantProviderPrompt): Promise<AssistantProviderCompletion>
  streamChatCompletion?: (
    prompt: AssistantProviderPrompt,
  ) => Promise<ReadableStream<Uint8Array>>
  providerStatus(): AssistantProviderStatus
}

export interface AssistantChatApiRequest {
  userMessage?: string
  recentMessages?: Pick<ChatMessage, "role" | "text">[]
  personalityId?: string
  conversationMode?: ConversationMode
  responseLibraryContext?: SavedResponse[]
  networkContext?: NetworkAssistantContext | null
}

export interface AssistantChatApiResponse {
  text: string
  category: ResponseCategory
  provider: "openai" | "demo"
  fallback: boolean
  providerConfigured: boolean
  mood?: AssistantMood
  intent?: AssistantIntent
  emotion?: AssistantEmotionState
  suggestedActions?: string[]
  reactionClip?: AvatarReactionKey
  error?: string
}

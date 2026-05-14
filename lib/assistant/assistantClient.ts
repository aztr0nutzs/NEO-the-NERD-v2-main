import type { AssistantMood, AvatarReactionKey, ChatMessage, ConversationMode, ResponseCategory } from "@/lib/types"
import { buildAssistantContext } from "./assistantContext"
import { createAssistantProvider } from "./assistantProvider"
import { emotionToMood } from "./assistantEmotion"
import { buildAssistantProviderInstructions } from "./assistantPromptBuilder"
import { generateAssistantResponseDraft } from "./assistantResponseEngine"
import type { AssistantEmotionState, AssistantIntent } from "./types"

export interface AssistantRequest {
  messages: Pick<ChatMessage, "role" | "text">[]
  personalityId: string
  conversationMode: ConversationMode
}

export interface AssistantResult {
  text: string
  category: ResponseCategory
  provider: "openai" | "demo"
  fallback: boolean
  providerConfigured?: boolean
  mood?: AssistantMood
  intent?: AssistantIntent
  emotion?: AssistantEmotionState
  suggestedActions?: string[]
  reactionClip?: AvatarReactionKey
}

interface AssistantProvider {
  complete: (request: AssistantRequest) => Promise<AssistantResult>
}

function localResult(request: AssistantRequest, providerConfigured: boolean, error?: string): AssistantResult {
  const context = buildAssistantContext({
    messages: request.messages,
    personalityId: request.personalityId,
    conversationMode: request.conversationMode,
  })
  const draft = generateAssistantResponseDraft(context)
  return {
    text: error ? `${draft.content}\n\n[Provider fallback: ${error}]` : draft.content,
    category: draft.category,
    provider: "demo",
    fallback: true,
    providerConfigured,
    mood: emotionToMood(draft.emotion),
    intent: draft.detectedIntent,
    emotion: draft.emotion,
    suggestedActions: draft.optionalSuggestedActions,
    reactionClip: draft.optionalReactionClip,
  }
}

class ProviderBackedAssistantClient implements AssistantProvider {
  async complete(request: AssistantRequest): Promise<AssistantResult> {
    const provider = createAssistantProvider()
    const status = provider.providerStatus()

    if (!status.providerConfigured) {
      return localResult(request, false)
    }

    const context = buildAssistantContext({
      messages: request.messages,
      personalityId: request.personalityId,
      conversationMode: request.conversationMode,
    })
    const draft = generateAssistantResponseDraft(context)

    try {
      const completion = await provider.sendChatCompletion({
        instructions: buildAssistantProviderInstructions(context),
        messages: context.recentMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      })

      return {
        text: completion.text,
        category: draft.category,
        provider: completion.provider,
        fallback: false,
        providerConfigured: true,
        mood: "speaking",
        intent: draft.detectedIntent,
        emotion: draft.emotion,
        suggestedActions: draft.optionalSuggestedActions,
        reactionClip: draft.optionalReactionClip,
      }
    } catch (error) {
      return localResult(
        request,
        true,
        error instanceof Error ? error.message : "assistant provider request failed",
      )
    }
  }
}

export function createAssistantClient(): AssistantProvider {
  return new ProviderBackedAssistantClient()
}

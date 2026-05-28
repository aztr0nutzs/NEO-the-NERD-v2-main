import { buildAssistantContext } from "@/lib/assistant/assistantContext"
import { createAssistantProvider } from "@/lib/assistant/assistantProvider"
import { buildAssistantProviderInstructions } from "@/lib/assistant/assistantPromptBuilder"
import { generateAssistantResponseDraft } from "@/lib/assistant/assistantResponseEngine"
import { emotionToMood } from "@/lib/assistant/assistantEmotion"
import { jsonWithCors, optionsWithCors } from "@/lib/runtime/api-cors"
import type {
  AssistantChatApiRequest,
  AssistantChatApiResponse,
  AssistantProviderChatMessage,
} from "@/lib/assistant/providerTypes"
import type { ChatMessage } from "@/lib/types"

export async function OPTIONS(request: Request) {
  return optionsWithCors(request)
}

export async function POST(request: Request) {
  let body: AssistantChatApiRequest
  try {
    body = (await request.json()) as AssistantChatApiRequest
  } catch {
    return jsonWithCors(
      request,
      { error: "Invalid assistant chat request JSON." },
      { status: 400 },
    )
  }

  if (!body.userMessage?.trim() || !body.personalityId || !body.conversationMode) {
    return jsonWithCors(
      request,
      { error: "Missing user message, personality, or conversation mode." },
      { status: 400 },
    )
  }

  const recentMessages = normalizeRecentMessages(body.recentMessages ?? [], body.userMessage)
  const context = buildAssistantContext({
    messages: recentMessages,
    personalityId: body.personalityId,
    conversationMode: body.conversationMode,
    responseLibrary: body.responseLibraryContext?.slice(0, 4),
  })
  context.networkContext = body.networkContext ?? null
  const localDraft = generateAssistantResponseDraft(context)
  const provider = createAssistantProvider()
  const status = provider.providerStatus()

  if (!status.providerConfigured) {
    return jsonWithCors(request, localResponse(localDraft, status.providerConfigured))
  }

  try {
    const completion = await provider.sendChatCompletion({
      instructions: buildAssistantProviderInstructions(context),
      messages: context.recentMessages.map((message): AssistantProviderChatMessage => ({
        role: message.role,
        content: message.content,
      })),
    })

    return jsonWithCors(request, {
      text: completion.text,
      category: localDraft.category,
      provider: completion.provider,
      fallback: false,
      providerConfigured: true,
      mood: "speaking",
      intent: localDraft.detectedIntent,
      emotion: localDraft.emotion,
      suggestedActions: localDraft.optionalSuggestedActions,
      reactionClip: localDraft.optionalReactionClip,
    } satisfies AssistantChatApiResponse)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Assistant provider request failed."

    return jsonWithCors(
      request,
      {
        ...localResponse(localDraft, true),
        error: message,
      } satisfies AssistantChatApiResponse,
      { status: 200 },
    )
  }
}

export async function GET(request: Request) {
  return jsonWithCors(request, createAssistantProvider().providerStatus())
}

function normalizeRecentMessages(
  messages: Pick<ChatMessage, "role" | "text">[],
  userMessage: string,
) {
  const recent = messages
    .slice(-15)
    .filter((message) => message.role === "user" || message.role === "assistant")

  const last = recent[recent.length - 1]
  if (last?.role === "user" && last.text.trim() === userMessage.trim()) {
    return recent
  }

  return [...recent, { role: "user" as const, text: userMessage.trim() }]
}

function localResponse(
  draft: ReturnType<typeof generateAssistantResponseDraft>,
  providerConfigured: boolean,
): AssistantChatApiResponse {
  return {
    text: draft.content,
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

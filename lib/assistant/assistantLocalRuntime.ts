/**
 * Browser-side execution of the local assistant response engine.
 *
 * Mirrors the shape returned by `/api/assistant/chat` so the UI can treat a local result
 * the same as a server-derived demo result. This keeps Capacitor/native sessions usable
 * even when no backend is reachable.
 */

import type { AssistantChatApiRequest, AssistantChatApiResponse } from "./providerTypes";
import { buildAssistantContext } from "./assistantContext";
import { generateAssistantResponseDraft } from "./assistantResponseEngine";
import { emotionToMood } from "./assistantEmotion";

export function runAssistantLocally(
  request: AssistantChatApiRequest,
): AssistantChatApiResponse {
  const userMessage = request.userMessage?.trim() ?? "";
  const recent = request.recentMessages ?? [];
  const lastIsUser =
    recent.length > 0 &&
    recent[recent.length - 1]?.role === "user" &&
    recent[recent.length - 1]?.text?.trim() === userMessage;
  const messages = lastIsUser
    ? recent
    : [...recent, { role: "user" as const, text: userMessage }];

  const context = buildAssistantContext({
    messages,
    personalityId: request.personalityId ?? "genius",
    conversationMode: request.conversationMode ?? "Helpful Assistant",
    responseLibrary: request.responseLibraryContext?.slice(0, 4),
  });
  context.networkContext = request.networkContext ?? null;

  const draft = generateAssistantResponseDraft(context);

  return {
    text: draft.content,
    category: draft.category,
    provider: "demo",
    fallback: true,
    providerConfigured: false,
    mood: emotionToMood(draft.emotion),
    intent: draft.detectedIntent,
    emotion: draft.emotion,
    suggestedActions: draft.optionalSuggestedActions,
    reactionClip: draft.optionalReactionClip,
  };
}

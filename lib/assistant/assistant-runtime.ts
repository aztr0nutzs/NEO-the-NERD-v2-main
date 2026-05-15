/**
 * Canonical assistant execution service for NEO the N.E.R.D.
 *
 * `generateAssistantReply` is the single entry point used by the chat store.
 * It owns the decision tree across web, Capacitor, hosted-with-backend, and
 * outage modes, and always returns a typed result. It never throws.
 *
 * Decision tree:
 *
 *   1. Resolve BackendConfig + cached BackendHealth.
 *   2. If BackendMode === "unavailable" (Capacitor static, no remote URL),
 *      run the in-browser local engine and return mode = "local-engine".
 *   3. If health says "unreachable", same: skip the round trip, return local.
 *   4. If health says provider is reachable but not configured, prefer local
 *      to avoid a server round trip that would just return its own demo.
 *   5. Otherwise call the runtime transport (`postAssistantChat`).
 *      - On `remote-success` with valid text: return mode = "provider".
 *      - On any failure (`remote-error`, malformed payload, transport
 *        `local-fallback`): run local engine and return mode = "local-engine"
 *        with `fallbackReason` set.
 *   6. If both paths somehow fail, return a graceful hard-fail result —
 *      callers can surface a friendly assistant error message instead of
 *      hanging in "thinking".
 */

import type {
  AssistantMood,
  AvatarReactionKey,
  ChatMessage,
  ConversationMode,
  ResponseCategory,
  SavedResponse,
} from "@/lib/types"
import type { NetworkAssistantContext } from "@/lib/network/types"
import type { AssistantEmotionState, AssistantIntent } from "./types"
import type { AssistantChatApiResponse } from "./providerTypes"
import { runAssistantLocally } from "./assistantLocalRuntime"
import { postAssistantChat } from "@/lib/runtime/backend-client"
import {
  checkBackendAvailability,
  type BackendHealthSnapshot,
} from "@/lib/runtime/backend-health"
import { getBackendConfig } from "@/lib/runtime/backend-config"

const FALLBACK_INTENT: AssistantIntent = "unknown"
const FALLBACK_EMOTION: AssistantEmotionState = "curious"
const HARD_FAIL_EMOTION: AssistantEmotionState = "concerned"

export type AssistantReplyMode = "provider" | "local-engine"

export type AssistantReplyStatus =
  | "ok"
  | "provider-fallback"
  | "config-fallback"
  | "hard-fail"

export interface AssistantReplyInput {
  userMessage: string
  recentMessages: Pick<ChatMessage, "role" | "text">[]
  personalityId: string
  conversationMode: ConversationMode
  responseLibraryContext?: SavedResponse[]
  networkContext?: NetworkAssistantContext | null
}

export interface AssistantReplyResult {
  /** The assistant message body to render. */
  text: string
  /** Which engine produced the body. */
  mode: AssistantReplyMode
  /** Whether a live AI provider is actually reachable AND configured. */
  providerAvailable: boolean
  /** Human-readable reason when the local engine was used as a fallback. */
  fallbackReason?: string
  /** Outcome category for state machines and avatar reactions. */
  status: AssistantReplyStatus
  /** Optional response category for the chat bubble theme. */
  category: ResponseCategory
  /** Suggested mood for the avatar following the response. */
  mood?: AssistantMood
  /** Detected intent from the local engine (always populated). */
  detectedIntent?: AssistantIntent
  /** Resolved emotion from the local engine (always populated). */
  emotion?: AssistantEmotionState
  /** Optional avatar reaction clip to play. */
  reactionClip?: AvatarReactionKey
  /** Optional follow-up prompt suggestions. */
  suggestedActions?: string[]
  /** Underlying error message when something went wrong. */
  error?: string
  /** Health snapshot at the time of the call (diagnostics). */
  health?: BackendHealthSnapshot
}

const HARD_FAIL_TEXT =
  "Signal lost on every channel. I could not reach the provider and my local engine refused to draft a reply. Try again in a moment, or check the runtime status badge for details."

function mapLocalPayload(
  payload: AssistantChatApiResponse,
  options: {
    providerAvailable: boolean
    status: AssistantReplyStatus
    fallbackReason?: string
    error?: string
    health?: BackendHealthSnapshot
  },
): AssistantReplyResult {
  return {
    text: payload.text,
    mode: "local-engine",
    providerAvailable: options.providerAvailable,
    fallbackReason: options.fallbackReason,
    status: options.status,
    category: payload.category ?? "Helpful",
    mood: payload.mood,
    detectedIntent: payload.intent ?? FALLBACK_INTENT,
    emotion: payload.emotion ?? FALLBACK_EMOTION,
    reactionClip: payload.reactionClip,
    suggestedActions: payload.suggestedActions,
    error: options.error,
    health: options.health,
  }
}

function localReply(
  input: AssistantReplyInput,
  options: {
    providerAvailable: boolean
    status: AssistantReplyStatus
    fallbackReason?: string
    error?: string
    health?: BackendHealthSnapshot
    /** Pre-computed local payload from an upstream call (avoids re-running the engine). */
    precomputed?: AssistantChatApiResponse
  },
): AssistantReplyResult {
  try {
    const local = options.precomputed ?? runAssistantLocally(input)
    return mapLocalPayload(local, options)
  } catch (error) {
    return {
      text: HARD_FAIL_TEXT,
      mode: "local-engine",
      providerAvailable: options.providerAvailable,
      fallbackReason:
        options.fallbackReason ??
        (error instanceof Error ? error.message : "Local engine raised."),
      status: "hard-fail",
      category: "System",
      mood: "thinking",
      detectedIntent: FALLBACK_INTENT,
      emotion: HARD_FAIL_EMOTION,
      reactionClip: "surprised",
      error: error instanceof Error ? error.message : "Local engine raised.",
      health: options.health,
    }
  }
}

function isUsableProviderText(text: string | undefined | null) {
  if (!text || typeof text !== "string") return false
  const trimmed = text.trim()
  if (!trimmed) return false
  return true
}

export async function generateAssistantReply(
  input: AssistantReplyInput,
): Promise<AssistantReplyResult> {
  const safeInput: AssistantReplyInput = {
    userMessage: input.userMessage?.trim() ?? "",
    recentMessages: input.recentMessages ?? [],
    personalityId: input.personalityId,
    conversationMode: input.conversationMode,
    responseLibraryContext: input.responseLibraryContext,
    networkContext: input.networkContext ?? null,
  }

  if (!safeInput.userMessage) {
    return {
      text: "I need a message to work with. Type something and I'll respond.",
      mode: "local-engine",
      providerAvailable: false,
      status: "ok",
      category: "System",
      mood: "thinking",
      detectedIntent: FALLBACK_INTENT,
      emotion: FALLBACK_EMOTION,
      reactionClip: "surprised",
    }
  }

  const [config, health] = await Promise.all([
    getBackendConfig().catch(() => null),
    checkBackendAvailability().catch(() => null),
  ])

  if (!config || config.mode === "unavailable") {
    return localReply(safeInput, {
      providerAvailable: false,
      status: "config-fallback",
      fallbackReason:
        config?.reason ??
        "Backend transport is unavailable in this runtime.",
      health: health ?? undefined,
    })
  }

  if (health?.state === "unreachable") {
    return localReply(safeInput, {
      providerAvailable: false,
      status: "provider-fallback",
      fallbackReason: health.error ?? "Backend probe failed.",
      health,
    })
  }

  if (health?.state === "available-no-provider") {
    return localReply(safeInput, {
      providerAvailable: false,
      status: "config-fallback",
      fallbackReason:
        health.providerStatus?.message ??
        "Backend reachable but no live AI provider is configured.",
      health,
    })
  }

  let transportResult
  try {
    transportResult = await postAssistantChat({
      userMessage: safeInput.userMessage,
      recentMessages: safeInput.recentMessages,
      personalityId: safeInput.personalityId,
      conversationMode: safeInput.conversationMode,
      responseLibraryContext: safeInput.responseLibraryContext,
      networkContext: safeInput.networkContext,
    })
  } catch (error) {
    return localReply(safeInput, {
      providerAvailable: true,
      status: "provider-fallback",
      fallbackReason: error instanceof Error ? error.message : "Transport raised.",
      error: error instanceof Error ? error.message : undefined,
      health: health ?? undefined,
    })
  }

  const transportHealth = transportResult.health ?? health ?? undefined
  const payload = transportResult.response

  if (
    transportResult.outcome === "remote-success" &&
    payload &&
    isUsableProviderText(payload.text) &&
    !payload.fallback
  ) {
    return {
      text: payload.text,
      mode: "provider",
      providerAvailable: true,
      status: "ok",
      category: payload.category ?? "Helpful",
      mood: payload.mood,
      detectedIntent: payload.intent,
      emotion: payload.emotion,
      reactionClip: payload.reactionClip,
      suggestedActions: payload.suggestedActions,
      health: transportHealth,
    }
  }

  // Server itself returned a fallback (provider unconfigured server-side).
  if (
    transportResult.outcome === "remote-success" &&
    payload &&
    isUsableProviderText(payload.text) &&
    payload.fallback
  ) {
    return {
      text: payload.text,
      mode: "local-engine",
      providerAvailable: false,
      status: "config-fallback",
      fallbackReason:
        "Backend reachable but provider is not configured server-side.",
      category: payload.category ?? "Helpful",
      mood: payload.mood,
      detectedIntent: payload.intent,
      emotion: payload.emotion,
      reactionClip: payload.reactionClip,
      suggestedActions: payload.suggestedActions,
      health: transportHealth,
    }
  }

  // Transport-level local fallback (BackendMode unavailable from inside transport)
  // or remote-error: the transport already executed runAssistantLocally and put the
  // result in transportResult.response. Reuse it instead of running the engine again.
  const reusable =
    payload && isUsableProviderText(payload.text) ? payload : undefined

  return localReply(safeInput, {
    providerAvailable: transportResult.outcome === "remote-error",
    status:
      transportResult.outcome === "remote-error"
        ? "provider-fallback"
        : "config-fallback",
    fallbackReason:
      transportResult.error ??
      (transportResult.outcome === "remote-error"
        ? "Provider request failed."
        : "Backend transport unavailable in this runtime."),
    error: transportResult.error,
    health: transportHealth,
    precomputed: reusable,
  })
}

/**
 * Typed transport client for NEO the N.E.R.D. server-backed features.
 *
 * Replaces direct `fetch("/api/...")` calls in UI/store code so the same code path
 * works in:
 *   - Next.js hosted (same-origin /api/*)
 *   - hosted with a remote backend URL override
 *   - Capacitor native + remote backend URL
 *   - Capacitor native / static export with no backend (local fallback returned)
 *   - any of the above when the backend is unreachable
 */

import type {
  AssistantChatApiRequest,
  AssistantChatApiResponse,
} from "@/lib/assistant/providerTypes";
import type { VoiceParams } from "@/lib/types";
import type { SpeechIntent } from "@/lib/voice/speechIntent";
import { runAssistantLocally } from "@/lib/assistant/assistantLocalRuntime";
import { getBackendConfig, resolveBackendUrl } from "./backend-config";
import {
  checkBackendAvailability,
  getCachedBackendHealth,
  type BackendHealthSnapshot,
} from "./backend-health";

const REQUEST_TIMEOUT_MS = 20_000;

export type BackendOutcome = "remote-success" | "local-fallback" | "remote-error";

export interface AssistantChatResult {
  outcome: BackendOutcome;
  response: AssistantChatApiResponse;
  /** Health snapshot at the time the call was attempted. */
  health: BackendHealthSnapshot;
  /** Set when outcome === "remote-error": the underlying error message. */
  error?: string;
}

export interface TtsPreviewRequest {
  voiceId: string;
  text: string;
  params: VoiceParams;
  personalityId?: string;
  intent?: SpeechIntent;
}

export interface TtsPreviewPayload {
  audioBase64: string;
  fileName: string;
  mimeType: string;
}

export interface TtsPreviewResult {
  outcome: BackendOutcome;
  payload: TtsPreviewPayload | null;
  health: BackendHealthSnapshot;
  error?: string;
}

async function fetchJson(url: string, init: RequestInit): Promise<Response> {
  if (typeof AbortController === "undefined") {
    return fetch(url, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function postAssistantChat(
  request: AssistantChatApiRequest,
): Promise<AssistantChatResult> {
  const config = await getBackendConfig();

  if (config.mode === "unavailable") {
    const health = getCachedBackendHealth();
    return {
      outcome: "local-fallback",
      response: runAssistantLocally(request),
      health,
    };
  }

  const url = resolveBackendUrl(config, "/api/assistant/chat");
  if (!url) {
    return {
      outcome: "local-fallback",
      response: runAssistantLocally(request),
      health: getCachedBackendHealth(),
    };
  }

  try {
    const response = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await safeReadError(response);
      const health = await checkBackendAvailability(true);
      return {
        outcome: "remote-error",
        response: {
          ...runAssistantLocally(request),
          error: errorText,
        },
        health,
        error: errorText,
      };
    }

    const payload = (await response.json()) as AssistantChatApiResponse;
    const health = getCachedBackendHealth();
    return { outcome: "remote-success", response: payload, health };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend unreachable.";
    const health = await checkBackendAvailability(true);
    return {
      outcome: "remote-error",
      response: {
        ...runAssistantLocally(request),
        error: message,
      },
      health,
      error: message,
    };
  }
}

export async function postTtsPreview(
  request: TtsPreviewRequest,
): Promise<TtsPreviewResult> {
  const config = await getBackendConfig();

  if (config.mode === "unavailable") {
    return {
      outcome: "local-fallback",
      payload: null,
      health: getCachedBackendHealth(),
      error:
        "Provider TTS is unavailable in this runtime. Use the browser preview path or configure NEXT_PUBLIC_NEO_BACKEND_BASE_URL.",
    };
  }

  const url = resolveBackendUrl(config, "/api/tts");
  if (!url) {
    return {
      outcome: "local-fallback",
      payload: null,
      health: getCachedBackendHealth(),
      error: "No URL resolved for /api/tts.",
    };
  }

  try {
    const response = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const payload = (await response.json()) as Partial<TtsPreviewPayload> & {
      error?: string;
    };

    if (!response.ok || !payload.audioBase64 || !payload.fileName) {
      const message = payload.error || `TTS provider request failed (HTTP ${response.status}).`;
      const health = await checkBackendAvailability(true);
      return {
        outcome: "remote-error",
        payload: null,
        health,
        error: message,
      };
    }

    const result: TtsPreviewPayload = {
      audioBase64: payload.audioBase64,
      fileName: payload.fileName,
      mimeType: payload.mimeType ?? "audio/mpeg",
    };
    return { outcome: "remote-success", payload: result, health: getCachedBackendHealth() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS backend unreachable.";
    const health = await checkBackendAvailability(true);
    return {
      outcome: "remote-error",
      payload: null,
      health,
      error: message,
    };
  }
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    // Fall through to status text.
  }
  return `Backend responded with HTTP ${response.status}.`;
}

export { checkBackendAvailability };

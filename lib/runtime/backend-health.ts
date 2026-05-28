/**
 * Backend health probe for NEO the N.E.R.D.
 *
 * Performs a lightweight GET against the assistant chat endpoint, which on the server
 * returns the provider status JSON: `{ provider, providerConfigured, model, ... }`.
 * Result is cached for HEALTH_TTL_MS so screens can ask freely.
 */

import { getBackendConfig, resolveBackendUrl, type BackendMode } from "./backend-config";

const HEALTH_TTL_MS = 30_000;
const HEALTH_TIMEOUT_MS = 4500;

export type BackendAvailabilityState =
  | "unknown"
  | "available"
  | "available-no-provider"
  | "unreachable"
  | "unavailable-by-config";

export interface ProviderStatusSnapshot {
  provider: string;
  providerConfigured: boolean;
  model: string;
  message: string;
}

export interface BackendHealthSnapshot {
  state: BackendAvailabilityState;
  mode: BackendMode;
  baseUrl: string | null;
  checkedAt: number;
  /** Provider status as reported by GET /api/assistant/chat, when reachable. */
  providerStatus: ProviderStatusSnapshot | null;
  /** TTS provider status as reported by GET /api/tts, when reachable. */
  ttsStatus: ProviderStatusSnapshot | null;
  /** Last error message, when state === "unreachable". */
  error: string | null;
}

const INITIAL_SNAPSHOT: BackendHealthSnapshot = {
  state: "unknown",
  mode: "same-origin",
  baseUrl: null,
  checkedAt: 0,
  providerStatus: null,
  ttsStatus: null,
  error: null,
};

let cached: BackendHealthSnapshot = INITIAL_SNAPSHOT;
let inflight: Promise<BackendHealthSnapshot> | null = null;

function isFresh(snapshot: BackendHealthSnapshot) {
  return snapshot.state !== "unknown" && Date.now() - snapshot.checkedAt < HEALTH_TTL_MS;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  if (typeof AbortController === "undefined") {
    return fetch(url);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method: "GET", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkBackendAvailability(force = false): Promise<BackendHealthSnapshot> {
  if (!force && isFresh(cached)) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const config = await getBackendConfig();
    const checkedAt = Date.now();

    if (config.mode === "unavailable") {
      cached = {
        state: "unavailable-by-config",
        mode: config.mode,
        baseUrl: config.baseUrl,
        checkedAt,
        providerStatus: null,
        ttsStatus: null,
        error: config.reason,
      };
      return cached;
    }

    const url = resolveBackendUrl(config, "/api/assistant/chat");
    if (!url) {
      cached = {
        state: "unavailable-by-config",
        mode: config.mode,
        baseUrl: config.baseUrl,
        checkedAt,
        providerStatus: null,
        ttsStatus: null,
        error: "No URL resolved for backend health probe.",
      };
      return cached;
    }

    try {
      const response = await fetchWithTimeout(url, HEALTH_TIMEOUT_MS);
      if (!response.ok) {
        cached = {
          state: "unreachable",
          mode: config.mode,
          baseUrl: config.baseUrl,
          checkedAt,
          providerStatus: null,
          ttsStatus: null,
          error: `Backend health probe returned HTTP ${response.status}.`,
        };
        return cached;
      }
      let providerStatus: ProviderStatusSnapshot | null = null;
      let ttsStatus: ProviderStatusSnapshot | null = null;
      try {
        const parsed = (await response.json()) as Partial<ProviderStatusSnapshot>;
        if (parsed && typeof parsed === "object" && typeof parsed.providerConfigured === "boolean") {
          providerStatus = {
            provider: String(parsed.provider ?? "unknown"),
            providerConfigured: parsed.providerConfigured,
            model: String(parsed.model ?? ""),
            message: String(parsed.message ?? ""),
          };
        }
      } catch {
        providerStatus = null;
      }

      const ttsUrl = resolveBackendUrl(config, "/api/tts");
      if (ttsUrl) {
        try {
          const ttsResponse = await fetchWithTimeout(ttsUrl, HEALTH_TIMEOUT_MS);
          const parsed = (await ttsResponse.json()) as Partial<ProviderStatusSnapshot>;
          if (
            ttsResponse.ok &&
            parsed &&
            typeof parsed === "object" &&
            typeof parsed.providerConfigured === "boolean"
          ) {
            ttsStatus = {
              provider: String(parsed.provider ?? "unknown"),
              providerConfigured: parsed.providerConfigured,
              model: String(parsed.model ?? ""),
              message: String(parsed.message ?? ""),
            };
          } else if (!ttsResponse.ok) {
            ttsStatus = {
              provider: "openai",
              providerConfigured: false,
              model: "",
              message: `TTS health probe returned HTTP ${ttsResponse.status}.`,
            };
          }
        } catch (error) {
          ttsStatus = {
            provider: "openai",
            providerConfigured: false,
            model: "",
            message: error instanceof Error ? error.message : "TTS health probe failed.",
          };
        }
      }

      cached = {
        state: ttsStatus?.providerConfigured || providerStatus?.providerConfigured
          ? "available"
          : providerStatus || ttsStatus
            ? "available-no-provider"
            : "available",
        mode: config.mode,
        baseUrl: config.baseUrl,
        checkedAt,
        providerStatus,
        ttsStatus,
        error: null,
      };
      return cached;
    } catch (error) {
      cached = {
        state: "unreachable",
        mode: config.mode,
        baseUrl: config.baseUrl,
        checkedAt,
        providerStatus: null,
        ttsStatus: null,
        error: error instanceof Error ? error.message : "Backend probe failed.",
      };
      return cached;
    }
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function getCachedBackendHealth(): BackendHealthSnapshot {
  return cached;
}

export function resetBackendHealth() {
  cached = INITIAL_SNAPSHOT;
  inflight = null;
}

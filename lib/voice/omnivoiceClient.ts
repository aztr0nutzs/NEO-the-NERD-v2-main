import type { VoiceParams } from "@/lib/types"
import type { VoiceProfile } from "./types"

const TRAILING_SLASH = /\/+$/
const HEALTH_CACHE_MS = 30_000
const HEALTH_TIMEOUT_MS = 3_000
const REQUEST_TIMEOUT_MS = 60_000

export interface OmniVoiceRequest {
  voiceId: string
  text: string
  mode: "clone" | "design"
  refAudioId?: string
  refText?: string
  instruct?: string
  languageId?: string
  speed?: number
  duration?: number
}

export interface OmniVoiceResult {
  audioBase64: string
  mimeType: string
  fileName: string
  provider: "omnivoice"
  providerVoiceId: string
}

export type OmniVoiceAudioPayload = OmniVoiceResult

export interface OmniVoiceHealthResult {
  configured: boolean
  reachable: boolean
  generationReady: boolean
  status: string
  error?: string
  baseUrl: string | null
  checkedAt: number
  /** Compatibility alias for older callers. */
  available: boolean
}

export type OmniVoiceHealth = OmniVoiceHealthResult

const INITIAL_HEALTH: OmniVoiceHealthResult = {
  configured: false,
  reachable: false,
  generationReady: false,
  status: "unconfigured",
  baseUrl: null,
  checkedAt: 0,
  available: false,
}

let healthCache: OmniVoiceHealthResult = INITIAL_HEALTH
let inflightHealth: Promise<OmniVoiceHealthResult> | null = null

export function getOmniVoiceBaseUrl(): string | null {
  const raw =
    typeof process !== "undefined"
      ? process.env?.NEXT_PUBLIC_OMNIVOICE_BASE_URL
      : undefined
  if (!raw || typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed ? trimmed.replace(TRAILING_SLASH, "") : null
}

function requireOmniVoiceBaseUrl() {
  const baseUrl = getOmniVoiceBaseUrl()
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_OMNIVOICE_BASE_URL is not configured.")
  }
  return baseUrl
}

export function isOmniVoiceConfigured() {
  return Boolean(getOmniVoiceBaseUrl())
}

export function getCachedOmniVoiceHealth(): OmniVoiceHealthResult {
  const baseUrl = getOmniVoiceBaseUrl()
  if (!baseUrl) return INITIAL_HEALTH
  if (healthCache.baseUrl !== baseUrl) {
    return {
      configured: true,
      reachable: false,
      generationReady: false,
      status: "unknown",
      baseUrl,
      checkedAt: 0,
      available: false,
    }
  }
  return healthCache
}

function isFresh(snapshot: OmniVoiceHealthResult) {
  return snapshot.checkedAt > 0 && Date.now() - snapshot.checkedAt < HEALTH_CACHE_MS
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  if (typeof AbortController === "undefined") return fetch(url, init)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function checkOmniVoiceHealth(force = false): Promise<OmniVoiceHealthResult> {
  const baseUrl = getOmniVoiceBaseUrl()
  if (!baseUrl) {
    healthCache = INITIAL_HEALTH
    return healthCache
  }

  if (!force && healthCache.baseUrl === baseUrl && isFresh(healthCache)) {
    return healthCache
  }
  if (inflightHealth) return inflightHealth

  inflightHealth = (async () => {
    try {
      const response = await fetchWithTimeout(
        `${baseUrl}/health`,
        { cache: "no-store", method: "GET" },
        HEALTH_TIMEOUT_MS,
      )
      const payload = await response.json().catch(() => null)
      const status = String(payload?.status ?? (response.ok ? "ok" : "http_error"))
      const generationReady = response.ok && (payload?.ok === undefined ? status === "ok" : Boolean(payload.ok))

      healthCache = {
        configured: true,
        reachable: response.ok,
        generationReady,
        status,
        error: response.ok
          ? typeof payload?.error === "string"
            ? payload.error
            : undefined
          : payload?.error ?? `HTTP ${response.status}`,
        baseUrl,
        checkedAt: Date.now(),
        available: generationReady,
      }
      return healthCache
    } catch (error) {
      healthCache = {
        configured: true,
        reachable: false,
        generationReady: false,
        status: "unreachable",
        error: error instanceof Error ? error.message : "OmniVoice health check failed.",
        baseUrl,
        checkedAt: Date.now(),
        available: false,
      }
      return healthCache
    }
  })()

  try {
    return await inflightHealth
  } finally {
    inflightHealth = null
  }
}

export function paramsToOmniVoiceSpeed(params: VoiceParams): number {
  return Math.min(2, Math.max(0.5, Number((0.5 + (params.speed / 100) * 1.5).toFixed(2))))
}

export function buildOmniVoiceRequest(
  profile: VoiceProfile,
  text: string,
  params: VoiceParams,
): OmniVoiceRequest {
  if (profile.provider !== "omnivoice" || !profile.providerVoiceId || !profile.omnivoiceMode) {
    throw new Error("Selected voice profile is not configured for OmniVoice.")
  }
  return {
    voiceId: profile.providerVoiceId,
    text: text.trim().slice(0, 4000),
    mode: profile.omnivoiceMode,
    refAudioId: profile.omnivoiceRefAudioId,
    refText: profile.omnivoiceRefText,
    instruct: profile.omnivoiceInstruct,
    languageId: profile.languageId,
    speed: paramsToOmniVoiceSpeed(params),
  }
}

export async function generateOmniVoiceTts(request: OmniVoiceRequest): Promise<OmniVoiceResult> {
  const response = await fetchWithTimeout(
    `${requireOmniVoiceBaseUrl()}/tts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        text: request.text.trim().slice(0, 4000),
      }),
      cache: "no-store",
    },
    REQUEST_TIMEOUT_MS,
  )
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? `OmniVoice request failed (${response.status}).`)
  }
  if (!payload?.audioBase64 || !payload?.fileName) {
    throw new Error("OmniVoice response missing required audio fields.")
  }
  return {
    audioBase64: payload.audioBase64,
    mimeType: payload.mimeType ?? "audio/wav",
    fileName: payload.fileName,
    provider: "omnivoice",
    providerVoiceId: payload.providerVoiceId ?? request.voiceId,
  }
}

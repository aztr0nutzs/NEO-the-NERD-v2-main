import type { VoiceParams } from "@/lib/types"
import type { VoiceProfile } from "./types"

const TRAILING_SLASH = /\/+$/
const HEALTH_TTL_MS = 30_000
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

export interface OmniVoiceAudioPayload {
  audioBase64: string
  mimeType: string
  fileName: string
  provider: "omnivoice"
  providerVoiceId: string
}

export interface OmniVoiceHealth {
  configured: boolean
  available: boolean
  baseUrl: string | null
  checkedAt: number
  status?: string
  error?: string
}

const INITIAL_HEALTH: OmniVoiceHealth = {
  configured: false,
  available: false,
  baseUrl: null,
  checkedAt: 0,
}

let cachedHealth: OmniVoiceHealth = INITIAL_HEALTH
let inflightHealth: Promise<OmniVoiceHealth> | null = null

export function getOmniVoiceBaseUrl(): string | null {
  const raw =
    typeof process !== "undefined"
      ? process.env?.NEXT_PUBLIC_OMNIVOICE_BASE_URL
      : undefined
  if (!raw || typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed ? trimmed.replace(TRAILING_SLASH, "") : null
}

export function isOmniVoiceConfigured() {
  return Boolean(getOmniVoiceBaseUrl())
}

export function getCachedOmniVoiceHealth(): OmniVoiceHealth {
  const baseUrl = getOmniVoiceBaseUrl()
  if (!baseUrl) return INITIAL_HEALTH
  if (cachedHealth.baseUrl !== baseUrl) {
    return {
      configured: true,
      available: false,
      baseUrl,
      checkedAt: 0,
      status: "unknown",
    }
  }
  return cachedHealth
}

function isFresh(snapshot: OmniVoiceHealth) {
  return snapshot.checkedAt > 0 && Date.now() - snapshot.checkedAt < HEALTH_TTL_MS
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  if (typeof AbortController === "undefined") return fetch(url, init)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function checkOmniVoiceHealth(force = false): Promise<OmniVoiceHealth> {
  const baseUrl = getOmniVoiceBaseUrl()
  if (!baseUrl) {
    cachedHealth = INITIAL_HEALTH
    return cachedHealth
  }

  if (!force && cachedHealth.baseUrl === baseUrl && isFresh(cachedHealth)) {
    return cachedHealth
  }
  if (inflightHealth) return inflightHealth

  inflightHealth = (async () => {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/health`, { method: "GET" })
      if (!response.ok) {
        cachedHealth = {
          configured: true,
          available: false,
          baseUrl,
          checkedAt: Date.now(),
          error: `OmniVoice health probe returned HTTP ${response.status}.`,
        }
        return cachedHealth
      }
      let status = "ok"
      try {
        const parsed = (await response.json()) as { status?: string }
        status = typeof parsed.status === "string" ? parsed.status : status
      } catch {
        status = "ok"
      }
      cachedHealth = {
        configured: true,
        available: true,
        baseUrl,
        checkedAt: Date.now(),
        status,
      }
      return cachedHealth
    } catch (error) {
      cachedHealth = {
        configured: true,
        available: false,
        baseUrl,
        checkedAt: Date.now(),
        error: error instanceof Error ? error.message : "OmniVoice backend unreachable.",
      }
      return cachedHealth
    }
  })()

  try {
    return await inflightHealth
  } finally {
    inflightHealth = null
  }
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
    text,
    mode: profile.omnivoiceMode,
    refAudioId: profile.omnivoiceRefAudioId,
    refText: profile.omnivoiceRefText,
    instruct: profile.omnivoiceInstruct,
    languageId: profile.languageId,
    speed: Number((0.5 + (params.speed / 100) * 1.5).toFixed(2)),
  }
}

export async function generateOmniVoiceTts(
  profile: VoiceProfile,
  text: string,
  params: VoiceParams,
): Promise<OmniVoiceAudioPayload> {
  const baseUrl = getOmniVoiceBaseUrl()
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_OMNIVOICE_BASE_URL is not configured.")
  }

  const request = buildOmniVoiceRequest(profile, text.trim().slice(0, 4000), params)
  const response = await fetchWithTimeout(`${baseUrl}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  const payload = (await response.json().catch(() => null)) as Partial<OmniVoiceAudioPayload> & {
    error?: string
  } | null

  if (
    !response.ok ||
    !payload?.audioBase64 ||
    !payload.fileName ||
    !payload.providerVoiceId
  ) {
    throw new Error(payload?.error ?? `OmniVoice TTS request failed (HTTP ${response.status}).`)
  }

  return {
    audioBase64: payload.audioBase64,
    mimeType: payload.mimeType ?? "audio/wav",
    fileName: payload.fileName,
    provider: "omnivoice",
    providerVoiceId: payload.providerVoiceId,
  }
}

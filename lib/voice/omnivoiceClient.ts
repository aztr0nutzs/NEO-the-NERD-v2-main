import type { VoiceParams } from "@/lib/types"

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

export interface OmniVoiceHealthResult {
  configured: boolean
  reachable: boolean
  generationReady: boolean
  status: string
  error?: string
}

let healthCache: { value: OmniVoiceHealthResult; at: number } | null = null
const HEALTH_CACHE_MS = 30_000

function getOmniVoiceBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_OMNIVOICE_BASE_URL?.trim()
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_OMNIVOICE_BASE_URL is not configured.")
  }
  return baseUrl.replace(/\/$/, "")
}

export async function checkOmniVoiceHealth(force = false): Promise<OmniVoiceHealthResult> {
  if (!force && healthCache && Date.now() - healthCache.at < HEALTH_CACHE_MS) {
    return healthCache.value
  }
  let result: OmniVoiceHealthResult
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const response = await fetch(`${getOmniVoiceBaseUrl()}/health`, {
      cache: "no-store",
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      result = {
        configured: true,
        reachable: false,
        generationReady: false,
        status: payload?.status ?? "http_error",
        error: payload?.error ?? `HTTP ${response.status}`,
      }
    } else {
      result = {
        configured: true,
        reachable: true,
        generationReady: Boolean(payload?.ok) && payload?.status === "ok",
        status: String(payload?.status ?? "unknown"),
        error: typeof payload?.error === "string" ? payload.error : undefined,
      }
    }
  } catch (error) {
    result = {
      configured: Boolean(process.env.NEXT_PUBLIC_OMNIVOICE_BASE_URL?.trim()),
      reachable: false,
      generationReady: false,
      status: "unreachable",
      error: error instanceof Error ? error.message : "OmniVoice health check failed.",
    }
  }
  healthCache = { value: result, at: Date.now() }
  return result
}

export async function generateOmniVoiceTts(request: OmniVoiceRequest): Promise<OmniVoiceResult> {
  const response = await fetch(`${getOmniVoiceBaseUrl()}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? `OmniVoice request failed (${response.status}).`)
  }
  if (!payload?.audioBase64 || !payload?.mimeType || !payload?.fileName) {
    throw new Error("OmniVoice response missing required audio fields.")
  }
  return {
    audioBase64: payload.audioBase64,
    mimeType: payload.mimeType,
    fileName: payload.fileName,
    provider: "omnivoice",
    providerVoiceId: payload.providerVoiceId ?? request.voiceId,
  }
}

export function paramsToOmniVoiceSpeed(params: VoiceParams): number {
  return Math.min(2, Math.max(0.5, Number((0.5 + (params.speed / 100) * 1.5).toFixed(2))))
}

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

function getOmniVoiceBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_OMNIVOICE_BASE_URL?.trim()
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_OMNIVOICE_BASE_URL is not configured.")
  }
  return baseUrl.replace(/\/$/, "")
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

import type { VoiceParams } from "@/lib/types"
import { VOICE_PROFILES, getVoiceProfile } from "./voiceProfiles"
import { buildProviderInstructions, buildStyledVoiceSpeech } from "./voiceStyle"

export interface VoiceProviderConfig {
  providerVoiceId: string
  available: boolean
  supports: {
    speed: boolean
    pitch: boolean
    volume: boolean
    emotion: boolean
  }
}

export interface TtsRequest {
  voiceId: string
  text: string
  params: VoiceParams
}

export interface TtsResult {
  audioBase64: string
  mimeType: "audio/mpeg"
  fileName: string
  provider: "openai"
  providerVoiceId: string
}

export const VOICE_PROVIDER_CONFIG: Record<string, VoiceProviderConfig> = Object.fromEntries(
  VOICE_PROFILES.filter(
    (profile) => profile.availability === "provider-ready" && profile.providerVoiceId,
  ).map((profile) => [profile.id, providerVoice(profile.providerVoiceId!)]),
)

function providerVoice(providerVoiceId: string): VoiceProviderConfig {
  return {
    providerVoiceId,
    available: true,
    supports: {
      speed: true,
      pitch: false,
      volume: true,
      emotion: true,
    },
  }
}

export function getVoiceProviderConfig(voiceId: string) {
  const profile = getVoiceProfile(voiceId)
  if (profile.availability !== "provider-ready" || !profile.providerVoiceId) return null
  return VOICE_PROVIDER_CONFIG[voiceId] ?? providerVoice(profile.providerVoiceId)
}

export function speedToProviderValue(speed: number) {
  return Math.min(4, Math.max(0.25, Number((0.5 + (speed / 100) * 1.5).toFixed(2))))
}

export function rateToProviderValue(rate: number) {
  return Math.min(4, Math.max(0.25, Number(rate.toFixed(2))))
}

export function volumeToPlaybackValue(volume: number) {
  return Math.min(1, Math.max(0, volume / 100))
}

export function emotionToInstructions(emotion: number) {
  if (emotion >= 80) return "Read with high energy, expressive timing, and playful cyberpunk confidence."
  if (emotion >= 55) return "Read with upbeat confidence and a friendly futuristic tone."
  if (emotion <= 25) return "Read calmly with low intensity and restrained expression."
  return "Read clearly with balanced emotion and a polished robot-companion tone."
}

function providerInstructions(voiceId: string, emotion: number) {
  const profile = getVoiceProfile(voiceId)
  return buildProviderInstructions(profile, emotionToInstructions(emotion))
}

export async function generateOpenAITts(request: TtsRequest): Promise<TtsResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.")

  const config = getVoiceProviderConfig(request.voiceId)
  if (!config?.available) throw new Error("Selected voice is not available for TTS.")
  const profile = getVoiceProfile(request.voiceId)
  const speech = buildStyledVoiceSpeech(profile, request.text, request.params)

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: config.providerVoiceId,
      input: speech.text.slice(0, 4000),
      response_format: "mp3",
      speed: rateToProviderValue(speech.rate),
      instructions: providerInstructions(request.voiceId, request.params.emotion),
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`TTS provider failed (${response.status}): ${details}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  return {
    audioBase64: buffer.toString("base64"),
    mimeType: "audio/mpeg",
    fileName: `neo-voice-${Date.now()}.mp3`,
    provider: "openai",
    providerVoiceId: config.providerVoiceId,
  }
}

export function audioBase64ToBlob(audioBase64: string, mimeType = "audio/mpeg") {
  const bytes = Uint8Array.from(atob(audioBase64), (char) => char.charCodeAt(0))
  return new Blob([bytes], { type: mimeType })
}

export function createAudioUrl(audioBase64: string, mimeType = "audio/mpeg") {
  return URL.createObjectURL(audioBase64ToBlob(audioBase64, mimeType))
}

export function downloadAudio(audioBase64: string, fileName: string, mimeType = "audio/mpeg") {
  const url = createAudioUrl(audioBase64, mimeType)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function shareOrSaveAudio(audioBase64: string, fileName: string, mimeType = "audio/mpeg") {
  try {
    const [{ Capacitor }, { Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ])

    if (Capacitor.isNativePlatform()) {
      const saved = await Filesystem.writeFile({
        path: fileName,
        data: audioBase64,
        directory: Directory.Documents,
      })
      await Share.share({
        title: "NEO voice preview",
        text: "Generated by NEO the Nerd.",
        url: saved.uri,
        dialogTitle: "Save or share voice audio",
      })
      return true
    }
  } catch {
    // Browser fallback below.
  }

  downloadAudio(audioBase64, fileName, mimeType)
  return false
}

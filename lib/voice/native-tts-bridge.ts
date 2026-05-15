"use client"

import { Capacitor, registerPlugin } from "@capacitor/core"
import type { VoiceParams } from "@/lib/types"
import type { VoiceProfile } from "./types"
import { buildStyledVoiceSpeech } from "./voiceStyle"

export interface NativeTtsAvailability {
  available: boolean
  ready: boolean
  platform: string
  message?: string
}

export interface NativeTtsSpeakResult {
  ok: boolean
  message?: string
  voiceName?: string | null
}

export interface AndroidNativeVoice {
  name: string
  locale: string
  quality?: number
  latency?: number
  networkConnectionRequired?: boolean
}

interface NativeTtsPlugin {
  isAvailable(): Promise<NativeTtsAvailability>
  speak(options: {
    text: string
    rate: number
    pitch: number
    volume: number
    voiceName?: string
  }): Promise<NativeTtsSpeakResult>
  getVoices(): Promise<{
    available: boolean
    voices: AndroidNativeVoice[]
    message?: string
  }>
  stop(): Promise<NativeTtsSpeakResult>
}

const neoTts = registerPlugin<NativeTtsPlugin>("NeoTts")

export function isAndroidNativeTtsRuntime(): boolean {
  return Capacitor.getPlatform() === "android"
}

export async function getAndroidNativeTtsAvailability(): Promise<NativeTtsAvailability> {
  if (!isAndroidNativeTtsRuntime()) {
    return { available: false, ready: false, platform: Capacitor.getPlatform(), message: "Not Android runtime." }
  }
  try {
    return await neoTts.isAvailable()
  } catch (error) {
    return {
      available: false,
      ready: false,
      platform: "android",
      message: error instanceof Error ? error.message : "Native Android TTS bridge unavailable.",
    }
  }
}

export async function speakWithAndroidNativeTts(options: {
  text: string
  profile: VoiceProfile
  params: VoiceParams
}): Promise<NativeTtsSpeakResult> {
  const availability = await waitForAndroidNativeTtsReady()
  if (!availability.available || !availability.ready) {
    return { ok: false, message: availability.message ?? "Android TTS engine not ready." }
  }
  const speech = buildStyledVoiceSpeech(options.profile, options.text, options.params)
  const voiceName = await selectAndroidNativeVoiceName(options.profile)
  return neoTts.speak({
    text: speech.text,
    rate: speech.rate,
    pitch: speech.pitch,
    volume: speech.volume,
    ...(voiceName ? { voiceName } : {}),
  })
}

let cachedAndroidVoices: AndroidNativeVoice[] | null = null

export async function getAndroidNativeVoices(): Promise<AndroidNativeVoice[]> {
  if (!isAndroidNativeTtsRuntime()) return []
  if (cachedAndroidVoices) return cachedAndroidVoices
  try {
    const result = await neoTts.getVoices()
    cachedAndroidVoices = Array.isArray(result.voices) ? result.voices : []
    return cachedAndroidVoices
  } catch {
    cachedAndroidVoices = []
    return cachedAndroidVoices
  }
}

export async function selectAndroidNativeVoiceName(profile: VoiceProfile): Promise<string | null> {
  const voices = await getAndroidNativeVoices()
  const localVoices = voices
    .filter((voice) => !voice.networkConnectionRequired)
    .filter((voice) => voice.locale?.toLowerCase().startsWith("en"))
    .sort((a, b) => {
      const quality = (b.quality ?? 0) - (a.quality ?? 0)
      if (quality !== 0) return quality
      return a.name.localeCompare(b.name)
    })

  if (!localVoices.length) return null
  const index = Math.abs(hashString(profile.id)) % localVoices.length
  return localVoices[index]?.name ?? null
}

function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return hash
}

async function waitForAndroidNativeTtsReady(
  attempts = 6,
  intervalMs = 250,
): Promise<NativeTtsAvailability> {
  let last: NativeTtsAvailability = await getAndroidNativeTtsAvailability()
  if (last.available && last.ready) return last
  for (let i = 1; i < attempts; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    last = await getAndroidNativeTtsAvailability()
    if (last.available && last.ready) return last
  }
  return last
}

export async function stopAndroidNativeTts(): Promise<boolean> {
  if (!isAndroidNativeTtsRuntime()) return false
  try {
    const result = await neoTts.stop()
    return Boolean(result.ok)
  } catch {
    return false
  }
}

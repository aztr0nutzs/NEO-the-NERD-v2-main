"use client"

import { Capacitor, registerPlugin } from "@capacitor/core"
import type { VoiceParams } from "@/lib/types"
import { voiceParamsToSpeechOptions } from "./voicePlayback"

export interface NativeTtsAvailability {
  available: boolean
  ready: boolean
  platform: string
  message?: string
}

export interface NativeTtsSpeakResult {
  ok: boolean
  message?: string
}

interface NativeTtsPlugin {
  isAvailable(): Promise<NativeTtsAvailability>
  speak(options: {
    text: string
    rate: number
    pitch: number
    volume: number
  }): Promise<NativeTtsSpeakResult>
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
  params: VoiceParams
}): Promise<NativeTtsSpeakResult> {
  const availability = await getAndroidNativeTtsAvailability()
  if (!availability.available || !availability.ready) {
    return { ok: false, message: availability.message ?? "Android TTS engine not ready." }
  }
  const speech = voiceParamsToSpeechOptions(options.params)
  return neoTts.speak({
    text: options.text,
    rate: speech.rate,
    pitch: speech.pitch,
    volume: speech.volume,
  })
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

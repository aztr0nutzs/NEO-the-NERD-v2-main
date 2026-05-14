import type { VoiceParams } from "@/lib/types"

export type VoicePlaybackState =
  | "idle"
  | "preparing"
  | "playing"
  | "paused"
  | "ended"
  | "error"

export type VoicePreviewSource =
  | "browser-speech"
  | "native-android"
  | "provider"
  | "unavailable"

export interface VoicePlaybackSnapshot {
  state: VoicePlaybackState
  source: VoicePreviewSource
  voiceId?: string
  message: string
}

export const IDLE_PLAYBACK_SNAPSHOT: VoicePlaybackSnapshot = {
  state: "idle",
  source: "unavailable",
  message: "VOICE PREVIEW READY",
}

export function speedToSpeechRate(speed: number) {
  return clamp(Number((0.55 + (speed / 100) * 1.45).toFixed(2)), 0.1, 2)
}

export function pitchToSpeechPitch(pitch: number) {
  return clamp(Number((0.55 + (pitch / 100) * 1.35).toFixed(2)), 0, 2)
}

export function volumeToSpeechVolume(volume: number) {
  return clamp(Number((volume / 100).toFixed(2)), 0, 1)
}

export function voiceParamsToSpeechOptions(params: VoiceParams) {
  return {
    rate: speedToSpeechRate(params.speed),
    pitch: pitchToSpeechPitch(params.pitch),
    volume: volumeToSpeechVolume(params.volume),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

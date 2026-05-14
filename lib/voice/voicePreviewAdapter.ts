"use client"

/**
 * Thin compatibility shim. The canonical surface is `lib/voice/voice-runtime.ts`.
 * Keep these re-exports so any legacy import compiles, but prefer voice-runtime
 * for new code.
 */

import type { VoiceParams } from "@/lib/types"
import type { VoiceProfile } from "./types"
import { isBrowserSpeechSupported } from "./browserSpeechAdapter"
import {
  getCachedVoiceRuntimeCapabilities,
  getVoiceRuntimeCapabilities,
  getProfileTruthLabel,
  pauseVoicePreview as runtimePause,
  previewVoice,
  resumeVoicePreview as runtimeResume,
  stopVoicePreview as runtimeStop,
} from "./voice-runtime"
import type { VoicePlaybackSnapshot } from "./voicePlayback"

interface VoicePreviewRequest {
  profile: VoiceProfile
  text: string
  params: VoiceParams
  onStateChange?: (snapshot: VoicePlaybackSnapshot) => void
}

export function canUseBrowserSpeechPreview() {
  return isBrowserSpeechSupported()
}

export async function playVoicePreview(request: VoicePreviewRequest) {
  const result = await previewVoice({ ...request, mode: "browser-speech" })
  return result.ok
}

export const pauseVoicePreview = runtimePause
export const resumeVoicePreview = runtimeResume
export const stopVoicePreview = runtimeStop

export function getPreviewTruthLabel(profile: VoiceProfile, browserSupported: boolean) {
  const caps = getCachedVoiceRuntimeCapabilities(profile)
  // Honor the legacy `browserSupported` arg so server-rendered first paint
  // continues to match what callers already pass in.
  const merged = { ...caps, browserSpeechSupported: browserSupported }
  return getProfileTruthLabel(profile, merged)
}

export { getVoiceRuntimeCapabilities }

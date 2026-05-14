/**
 * Thin compatibility shim. The canonical surface is `lib/voice/voice-runtime.ts`.
 * Keep these re-exports so any legacy import compiles, but prefer voice-runtime
 * for new code.
 */

import type { VoiceParams } from "@/lib/types"
import type { VoiceProfile } from "./types"
import { generateProviderAudio, getVoiceProfileCapabilities } from "./voice-runtime"
import { getVoiceProfile } from "./voiceProfiles"

export interface ProviderSpeechPreview {
  audioBase64: string
  fileName: string
  mimeType: string
}

export function getProviderVoiceCapabilities(voiceId: string) {
  return getVoiceProfileCapabilities(getVoiceProfile(voiceId))
}

export function isProviderConfigured(profile: VoiceProfile) {
  return getVoiceProfileCapabilities(profile).providerReady
}

export async function generateSpeechPreview({
  voiceId,
  text,
  params,
}: {
  voiceId: string
  text: string
  params: VoiceParams
}): Promise<ProviderSpeechPreview> {
  const result = await generateProviderAudio({ voiceId, text, params })
  if (result.payload) return result.payload
  throw new Error(result.error || "TTS provider unavailable in this runtime.")
}

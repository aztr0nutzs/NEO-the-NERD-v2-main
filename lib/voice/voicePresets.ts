import type { VoiceParams } from "@/lib/types"
import { getVoiceProfile } from "./voiceProfiles"

export function voiceProfileToParams(voiceId: string): VoiceParams {
  const profile = getVoiceProfile(voiceId)
  return {
    speed: Math.round(((profile.rate - 0.7) / 0.7) * 100),
    pitch: Math.round(((profile.pitch - 0.6) / 1.0) * 100),
    volume: profile.defaultVolume,
    emotion: profile.recommendedEmotion,
  }
}

/**
 * Static badge for a profile — safe to render without runtime data.
 *
 * "PROVIDER MAPPED" (instead of "PROVIDER READY") avoids implying the live
 * provider can serve this voice right now. Actual readiness depends on a
 * configured backend + API key and is composed dynamically by
 * `getProfileTruthLabel` in `voice-runtime.ts`, which upgrades the runtime
 * truth label to "Provider Distinct Voice" only when the provider path is active.
 */
export function availabilityLabel(availability: string) {
  switch (availability) {
    case "provider-ready":
      return "PROVIDER MAPPED"
    case "browser-preview":
      return "BROWSER PREVIEW"
    case "future-provider-target":
      return "FUTURE PROVIDER TARGET"
    case "profile-only":
      return "PROFILE-ONLY"
    default:
      return "UNAVAILABLE"
  }
}

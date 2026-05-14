import type { VoiceParams } from "@/lib/types"
import { getVoiceProfile } from "./voiceProfiles"

export function voiceProfileToParams(voiceId: string): VoiceParams {
  const profile = getVoiceProfile(voiceId)
  return {
    speed: profile.defaultSpeed,
    pitch: profile.defaultPitch,
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
 * `getProfileTruthLabel` in `voice-runtime.ts`, which upgrades the badge to
 * "PROVIDER ACTIVE" only when the runtime probe confirms it.
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
      return "PROFILE ONLY"
    default:
      return "UNAVAILABLE"
  }
}

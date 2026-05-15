import type { VoiceProfile } from "./types"
import type { VoiceRuntimeCapabilities } from "./voice-runtime"

export type RuntimeTimbreSource = "provider-distinct" | "native-distinct" | "styled-variant" | "profile-only" | "unavailable"

export interface UniquenessSummary {
  runtimeSource: RuntimeTimbreSource
  isDistinctTimbre: boolean
  isFullyRealized: boolean
  whatChanges: string
  resolvedEngine: "provider" | "native-android" | "browser-speech" | "none"
}

export function getRuntimeTimbreSource(profile: VoiceProfile, capabilities: VoiceRuntimeCapabilities): RuntimeTimbreSource {
  if (profile.availability === "unavailable") return "unavailable"
  if (profile.availability === "provider-ready" && capabilities.providerTtsAvailable) return "provider-distinct"
  if (capabilities.nativeAndroidTtsAvailable && capabilities.nativeAndroidVoiceCount > 1) return "native-distinct"
  if (capabilities.nativeAndroidTtsAvailable || capabilities.browserSpeechSupported) return "styled-variant"
  return "profile-only"
}

export function runtimeTimbreLabel(source: RuntimeTimbreSource) {
  switch (source) {
    case "provider-distinct": return "Provider distinct timbre"
    case "native-distinct": return "Android native distinct voice"
    case "styled-variant": return "Styled variant over shared runtime voice"
    case "profile-only": return "Profile-only voice behavior"
    default: return "Preview unavailable"
  }
}

export function getUniquenessSummary(profile: VoiceProfile, capabilities: VoiceRuntimeCapabilities): UniquenessSummary {
  const runtimeSource = getRuntimeTimbreSource(profile, capabilities)
  const resolvedEngine = profile.availability === "provider-ready" && capabilities.providerTtsAvailable
    ? "provider"
    : capabilities.nativeAndroidTtsAvailable
      ? "native-android"
      : capabilities.browserSpeechSupported
        ? "browser-speech"
        : "none"
  return {
    runtimeSource,
    isDistinctTimbre: runtimeSource === "provider-distinct" || runtimeSource === "native-distinct",
    isFullyRealized: runtimeSource !== "profile-only" && runtimeSource !== "unavailable",
    whatChanges: resolvedEngine === "provider"
      ? "Provider voice mapping + style instructions are applied"
      : resolvedEngine === "native-android"
        ? "Android engine voice with profile pitch/rate styling is applied"
        : resolvedEngine === "browser-speech"
          ? "Browser speech with profile pitch/rate styling is applied"
          : "No speech engine available",
    resolvedEngine,
  }
}

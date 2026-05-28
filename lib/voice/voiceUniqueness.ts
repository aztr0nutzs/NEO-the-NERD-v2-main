import type { VoiceProfile, VoiceTimbreSource } from "./types"
import type { VoiceRuntimeCapabilities } from "./voice-runtime"
import { getProviderReuseSummary, getCanonicalProviderDistinctProfiles } from "./voiceProfiles"

/**
 * Realized timbre category in the current runtime. Distinct from
 * `VoiceProfile.timbreSource` (which is the authored intent): this folds in
 * whether the runtime can actually deliver that intent right now.
 */
export type RuntimeTimbreSource =
  | "provider-distinct"
  | "native-distinct"
  | "styled-variant"
  | "profile-only"
  | "unavailable"

export type ResolvedEngine = "provider" | "native-android" | "browser-speech" | "none"

export interface UniquenessSummary {
  /** Authored intent. */
  authoredSource: VoiceTimbreSource
  /** What is actually delivered right now. */
  runtimeSource: RuntimeTimbreSource
  /** Authored 0..100 uniqueness score. */
  uniquenessScore: number
  /** Honest authored explanation of the profile's uniqueness story. */
  uniquenessExplanation: string
  /** Truthful fallback description. */
  fallbackBehavior: string
  /** True only when the runtime delivers a genuinely distinct underlying timbre. */
  isDistinctTimbre: boolean
  /** True when the runtime delivers the authored intent (not falling back). */
  isFullyRealized: boolean
  /** What changes audibly at runtime. */
  whatChanges: string
  /** Which engine actually plays. */
  resolvedEngine: ResolvedEngine
}

function resolveEngine(profile: VoiceProfile, capabilities: VoiceRuntimeCapabilities): ResolvedEngine {
  if (profile.availability === "unavailable") return "none"
  if (
    profile.availability === "provider-ready" &&
    ((profile.provider === "omnivoice" && capabilities.omnivoiceProviderAvailable) ||
      (profile.provider === "openai" && capabilities.openAiProviderAvailable))
  ) return "provider"
  if (capabilities.nativeAndroidTtsAvailable) return "native-android"
  if (capabilities.browserSpeechSupported) return "browser-speech"
  return "none"
}

export function getVoiceUniquenessCategory(
  profile: VoiceProfile,
  capabilities: VoiceRuntimeCapabilities,
): RuntimeTimbreSource {
  if (profile.availability === "unavailable") return "unavailable"
  const engine = resolveEngine(profile, capabilities)

  if (engine === "provider") {
    // Provider path is live. Only profiles that authored "provider-distinct"
    // genuinely own a unique timbre — others are styled variants of a shared
    // provider voice id.
    return profile.timbreSource === "provider-distinct" ? "provider-distinct" : "styled-variant"
  }

  if (engine === "native-android") {
    // Android is the engine. Only count as native-distinct when a real native
    // voice is selected AND the engine exposes more than one selectable voice.
    if (
      profile.timbreSource === "native-distinct" &&
      capabilities.selectedAndroidVoiceName &&
      capabilities.nativeAndroidVoiceCount > 1
    ) {
      return "native-distinct"
    }
    return "styled-variant"
  }

  if (engine === "browser-speech") return "styled-variant"
  return "profile-only"
}

export function isDistinctTimbre(profile: VoiceProfile, capabilities: VoiceRuntimeCapabilities) {
  const cat = getVoiceUniquenessCategory(profile, capabilities)
  return cat === "provider-distinct" || cat === "native-distinct"
}

export function isStyledVariant(profile: VoiceProfile, capabilities: VoiceRuntimeCapabilities) {
  return getVoiceUniquenessCategory(profile, capabilities) === "styled-variant"
}

export function getVoiceTruthLabel(
  profile: VoiceProfile,
  capabilities: VoiceRuntimeCapabilities,
): string {
  if (profile.availability === "unavailable") return "Preview unavailable"
  const cat = getVoiceUniquenessCategory(profile, capabilities)
  const engine = resolveEngine(profile, capabilities)
  switch (cat) {
    case "provider-distinct":
      return "Provider Distinct Timbre"
    case "native-distinct":
      return capabilities.selectedAndroidVoiceName
        ? `Android Device Voice (${capabilities.selectedAndroidVoiceName})`
        : "Android Device Voice"
    case "styled-variant":
      if (engine === "provider") return "Styled Provider Variant"
      if (engine === "native-android") {
        return capabilities.selectedAndroidVoiceName
          ? `Styled Android TTS (${capabilities.selectedAndroidVoiceName})`
          : "Styled Android TTS"
      }
      if (engine === "browser-speech") return "Browser Speech Variant"
      return "Profile Only"
    case "profile-only":
      return "Profile Only — no engine"
    default:
      return "Preview unavailable"
  }
}

export function getVoiceAvailabilityExplanation(
  profile: VoiceProfile,
  capabilities: VoiceRuntimeCapabilities,
): string {
  const engine = resolveEngine(profile, capabilities)
  if (engine === "provider") {
    return profile.timbreSource === "provider-distinct"
      ? "Provider TTS is live; this profile is the canonical owner of its provider voice and is delivered as a distinct provider timbre."
      : `Provider TTS is live; this profile shares its underlying provider voice with another canonical profile, so uniqueness comes from style and pacing instructions.`
  }
  if (engine === "native-android") {
    if (capabilities.selectedAndroidVoiceName && capabilities.nativeAndroidVoiceCount > 1) {
      return `Android TTS is active with a distinct native voice (${capabilities.selectedAndroidVoiceName}). Profile pitch, rate, and style instructions are applied on top.`
    }
    return "Android TTS is active but no distinct native voice could be selected on this device. Pitch, rate, and style instructions still apply."
  }
  if (engine === "browser-speech") {
    return "Browser SpeechSynthesis is the only available engine. Profile pitch, rate, and styling are applied, but the underlying voice is whatever the WebView exposes."
  }
  return "No speech engine is available in this runtime."
}

// Card-level short badge text.
export type CardBadge =
  | "UNIQUE TIMBRE"
  | "STYLED VARIANT"
  | "PROVIDER VOICE"
  | "DEVICE VOICE"
  | "PROFILE ONLY"
  | "FALLBACK"
  | "UNAVAILABLE"

export function getVoiceCardBadge(
  profile: VoiceProfile,
  capabilities: VoiceRuntimeCapabilities,
): CardBadge {
  if (profile.availability === "unavailable") return "UNAVAILABLE"
  const cat = getVoiceUniquenessCategory(profile, capabilities)
  const engine = resolveEngine(profile, capabilities)
  if (cat === "provider-distinct") return "UNIQUE TIMBRE"
  if (cat === "native-distinct") return "DEVICE VOICE"
  if (cat === "styled-variant") {
    if (engine === "provider") return "STYLED VARIANT"
    if (engine === "native-android") return "STYLED VARIANT"
    if (engine === "browser-speech") return "FALLBACK"
    return "STYLED VARIANT"
  }
  if (cat === "profile-only") return "PROFILE ONLY"
  return "UNAVAILABLE"
}

export function getUniquenessSummary(
  profile: VoiceProfile,
  capabilities: VoiceRuntimeCapabilities,
): UniquenessSummary {
  const runtimeSource = getVoiceUniquenessCategory(profile, capabilities)
  const resolvedEngine = resolveEngine(profile, capabilities)
  const distinct = runtimeSource === "provider-distinct" || runtimeSource === "native-distinct"
  const fullyRealized =
    (profile.timbreSource === "provider-distinct" && runtimeSource === "provider-distinct") ||
    (profile.timbreSource === "native-distinct" && runtimeSource === "native-distinct") ||
    (profile.timbreSource === "styled-variant" && runtimeSource === "styled-variant") ||
    (profile.timbreSource === "profile-only" && runtimeSource !== "unavailable")
  const whatChanges =
    resolvedEngine === "provider"
      ? "Provider voice + tone/style/emotional instructions are sent to the TTS provider."
      : resolvedEngine === "native-android"
        ? "Android engine voice with profile pitch/rate/cadence is applied."
        : resolvedEngine === "browser-speech"
          ? "Browser speech with profile pitch/rate/cadence is applied."
          : "No speech engine available."
  return {
    authoredSource: profile.timbreSource,
    runtimeSource,
    uniquenessScore: profile.uniquenessScore,
    uniquenessExplanation: profile.uniquenessExplanation,
    fallbackBehavior: profile.fallbackBehavior,
    isDistinctTimbre: distinct,
    isFullyRealized: fullyRealized,
    whatChanges,
    resolvedEngine,
  }
}

/** Stable label used by older callers — kept for compatibility. */
export function runtimeTimbreLabel(source: RuntimeTimbreSource) {
  switch (source) {
    case "provider-distinct":
      return "Provider distinct timbre"
    case "native-distinct":
      return "Android native distinct voice"
    case "styled-variant":
      return "Styled variant over shared runtime voice"
    case "profile-only":
      return "Profile-only voice behavior"
    default:
      return "Preview unavailable"
  }
}

export { getProviderReuseSummary, getCanonicalProviderDistinctProfiles }

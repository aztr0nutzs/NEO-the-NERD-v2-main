import type { VoiceRuntimeCapabilities } from "./voice-runtime"
import { VOICE_PROFILES } from "./voiceProfiles"

/**
 * Top-level runtime mode for the voice deck. This is the single source of
 * truth for the dominant banner shown on the Voices screen — it composes
 * provider availability, Android engine voice count, and browser support
 * into one classification so the UI cannot accidentally oversell a
 * fallback-only runtime as a "live library of distinct voices".
 *
 *  - "provider-active"   → provider TTS is reachable; provider-distinct
 *                          profiles deliver genuinely distinct timbre.
 *  - "android-multi"     → no provider; Android engine exposes >1 voice,
 *                          so a subset of profiles can be slotted to
 *                          different device voices (styled variants of
 *                          a small pool).
 *  - "android-collapsed" → no provider; Android engine exposes only one
 *                          practical voice, so every profile collapses
 *                          to the same underlying timbre.
 *  - "browser-only"      → no provider, no native Android engine; the
 *                          browser SpeechSynthesis voice is whatever the
 *                          WebView happens to expose.
 *  - "unavailable"       → no engine at all.
 */
export type VoiceRuntimeMode =
  | "provider-active"
  | "android-multi"
  | "android-collapsed"
  | "browser-only"
  | "unavailable"

export type VoiceRuntimeBannerTone = "ok" | "warn" | "critical"

export interface VoiceRuntimeBanner {
  mode: VoiceRuntimeMode
  tone: VoiceRuntimeBannerTone
  /** Short, dominant headline — exact phrasing per spec. */
  headline: string
  /** Honest one-line explanation under the headline. */
  detail: string
  /** Count of profiles in the deck that can deliver a distinct timbre in this runtime. */
  distinctRealizableCount: number
  /** Total profiles authored. */
  totalProfiles: number
  /** True when many profiles will collapse to the same underlying voice. */
  collapsed: boolean
  /** Friendly label for the engine actually playing audio. */
  engineLabel: string
}

const PROVIDER_DISTINCT_COUNT = VOICE_PROFILES.filter(
  (v) => v.timbreSource === "provider-distinct",
).length

const NATIVE_DISTINCT_COUNT = VOICE_PROFILES.filter(
  (v) => v.timbreSource === "native-distinct",
).length

export function getVoiceRuntimeMode(capabilities: VoiceRuntimeCapabilities): VoiceRuntimeBanner {
  const total = VOICE_PROFILES.length

  if (capabilities.providerTtsAvailable) {
    return {
      mode: "provider-active",
      tone: "ok",
      headline: "PROVIDER TTS ACTIVE · REAL DISTINCT VOICES",
      detail: `Neural backend reachable. ${PROVIDER_DISTINCT_COUNT} profiles deliver a distinct provider timbre; the rest are styled variants on top of those base voices.`,
      distinctRealizableCount: PROVIDER_DISTINCT_COUNT,
      totalProfiles: total,
      collapsed: false,
      engineLabel: "Neural provider TTS",
    }
  }

  if (capabilities.nativeAndroidTtsAvailable) {
    const voiceCount = capabilities.nativeAndroidVoiceCount
    if (voiceCount <= 1) {
      return {
        mode: "android-collapsed",
        tone: "critical",
      headline: "ANDROID DEVICE TTS FALLBACK · PROFILES MAY SOUND IDENTICAL",
        detail: capabilities.remoteBackendConfigured
          ? "Backend is configured but provider TTS is unreachable, and this device exposes only one usable Android engine voice. Every profile is routed through that single voice with pitch/rate/style adjustments on top."
          : "Provider TTS is not configured and this device exposes only one usable Android engine voice. Every profile is routed through that single voice with pitch/rate/style adjustments on top.",
        distinctRealizableCount: 0,
        totalProfiles: total,
        collapsed: true,
        engineLabel: capabilities.selectedAndroidVoiceName
          ? `Android TTS (${capabilities.selectedAndroidVoiceName})`
          : "Android TTS (single voice)",
      }
    }
    // Multi-voice native runtime: only profiles authored as "native-distinct"
    // can get a guaranteed-different device voice; everything else is a
    // styled variant of whatever pool the device exposes.
    const reachable = Math.min(NATIVE_DISTINCT_COUNT, voiceCount)
    return {
      mode: "android-multi",
      tone: "warn",
      headline: "ANDROID DEVICE TTS FALLBACK · PROFILES MAY SOUND IDENTICAL",
      detail: capabilities.remoteBackendConfigured
        ? `Backend is configured but provider TTS is unreachable. Android engine exposes ${voiceCount} voices — only ~${reachable} of ${total} profiles can be slotted to a distinct device voice; others are styled variants.`
        : `Provider backend is not configured. Android engine exposes ${voiceCount} voices — only ~${reachable} of ${total} profiles can be slotted to a distinct device voice; others are styled variants.`,
      distinctRealizableCount: reachable,
      totalProfiles: total,
      collapsed: false,
      engineLabel: capabilities.selectedAndroidVoiceName
        ? `Android TTS (${capabilities.selectedAndroidVoiceName})`
        : `Android TTS (${voiceCount} voices)`,
    }
  }

  if (capabilities.browserSpeechSupported) {
    return {
      mode: "browser-only",
      tone: capabilities.remoteBackendConfigured ? "warn" : "critical",
      headline: "BROWSER SPEECH FALLBACK · STYLED ONLY",
      detail:
        "Every profile plays through the browser's SpeechSynthesis voice. Profile pitch, rate, and styling are applied, but the underlying timbre is whatever the WebView ships with.",
      distinctRealizableCount: 0,
      totalProfiles: total,
      collapsed: true,
      engineLabel: "Browser SpeechSynthesis",
    }
  }

  return {
    mode: "unavailable",
    tone: "critical",
    headline: "VOICE PROVIDER UNAVAILABLE",
    detail: "No speech engine is available in this runtime. Configure a backend or install an Android TTS engine.",
    distinctRealizableCount: 0,
    totalProfiles: total,
    collapsed: true,
    engineLabel: "None",
  }
}

export function bannerToneColor(tone: VoiceRuntimeBannerTone): string {
  switch (tone) {
    case "ok":
      return "#39ff14"
    case "warn":
      return "#ff7a00"
    case "critical":
      return "#ff2d9c"
  }
}

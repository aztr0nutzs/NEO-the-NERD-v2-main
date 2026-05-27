import type { AccentColor } from "@/lib/types"

export type VoiceCategory =
  | "Core NEO voices"
  | "Warm assistants"
  | "Comic voices"
  | "Robotic / synthetic voices"
  | "Narrator / announcer voices"
  | "Retro / arcade voices"
  | "Dramatic / villainous voices"
  | "Energetic / hype voices"
  | "Calm / reflective voices"

export type VoiceAvailability =
  | "profile-only"
  | "browser-preview"
  | "provider-ready"
  | "future-provider-target"
  | "unavailable"

export type VoiceToneProfile =
  | "balanced"
  | "energetic"
  | "calm"
  | "robotic"
  | "aggressive"
  | "sarcastic"
  | "dramatic"
  | "retro"
  | "playful"

/**
 * Authored uniqueness classification for a voice profile.
 *
 * - "provider-distinct"  → profile owns a unique underlying provider timbre
 *                          (canonical for that providerVoiceId).
 * - "native-distinct"    → profile maps to a genuinely different native engine
 *                          voice on Android (device dependent).
 * - "styled-variant"     → profile shares an underlying engine voice with
 *                          another profile; uniqueness comes from styling.
 * - "profile-only"       → no realized engine timbre; profile metadata only.
 */
export type VoiceTimbreSource =
  | "provider-distinct"
  | "native-distinct"
  | "styled-variant"
  | "profile-only"

/**
 * Capability-driven hints for picking a real Android engine voice. Authored
 * per profile; the runtime scores actual device voices against these to pick
 * a deterministic-but-appropriate native voice. No field is required.
 */
export interface NativeVoicePreference {
  /** Ordered list of locale tags to prefer (e.g. ["en-US", "en-GB"]). */
  localePreference?: string[]
  /** True if the profile prefers an offline-capable engine voice. */
  preferOffline?: boolean
  /** True if the profile prefers a higher-quality engine voice. */
  preferHighQuality?: boolean
  /** True if the profile prefers a lower-latency engine voice. */
  preferLowLatency?: boolean
  /** Substrings to prefer in voice.name (e.g. ["x-iom"] for masc-sounding). */
  preferNameHints?: string[]
  /** Substrings to avoid in voice.name. */
  avoidNameHints?: string[]
  /**
   * Pool key for deterministic slotting. Profiles sharing the same pool key
   * spread across distinct device voices when more than one is acceptable.
   */
  distinctFromPoolKey?: string
}

export type NativeVoiceResolution = "explicit" | "heuristic" | "unavailable"

export type VoiceCadenceProfile =
  | "steady"
  | "brisk"
  | "snappy"
  | "measured"
  | "deliberate"
  | "lyrical"
  | "staccato"
  | "languid"

export interface VoiceProfile {
  id: string
  displayName: string
  name: string
  pitch: number
  rate: number
  toneProfile: VoiceToneProfile
  sampleText: string
  category: VoiceCategory
  shortDescription: string
  styleIdentity: string
  longDescription: string
  toneTags: string[]
  idealUseCases: string[]
  energyLevel: 1 | 2 | 3 | 4 | 5
  warmthLevel: 1 | 2 | 3 | 4 | 5
  humorLevel: 1 | 2 | 3 | 4 | 5
  roboticnessLevel: 1 | 2 | 3 | 4 | 5
  clarityLevel: 1 | 2 | 3 | 4 | 5
  defaultSpeed: number
  defaultPitch: number
  defaultVolume: number
  recommendedEmotion: number
  compatiblePersonalities: string[]
  sampleLine: string
  cadenceHint: string
  expressivenessLevel: 1 | 2 | 3 | 4 | 5
  featured: boolean
  providerVoiceId?: string
  availability: VoiceAvailability
  accent: AccentColor

  /** First-class uniqueness metadata (authored, not inferred at runtime). */
  timbreSource: VoiceTimbreSource
  /** 0..100 — how distinct the profile's realized output is expected to be. */
  uniquenessScore: number
  /** One-sentence honest explanation of the profile's uniqueness/fallback. */
  uniquenessExplanation: string
  /** Truthful description of what happens when the ideal engine isn't available. */
  fallbackBehavior: string

  /** Optional: provider-side natural-language style prompt (e.g. for gpt-4o-mini-tts). */
  stylePrompt?: string
  /** Optional: provider-side emotional/delivery instructions appended to the prompt. */
  emotionalInstructions?: string
  /**
   * Optional hard-pinned Android engine voice name (e.g. "en-us-x-sfg-local").
   *
   * Reserved for cases where a specific Android engine voice is known to be
   * installed across the deployment fleet. Not authored on any profile today
   * because Android engine voice inventory varies per device — see
   * `nativeVoicePreference` for the portable, capability-driven path.
   */
  nativeVoiceId?: string
  /**
   * Optional capability-driven hints for Android engine voice resolution.
   * Used by `resolveBestNativeVoiceForProfile()` when no `nativeVoiceId` is
   * pinned. Lets profiles ask for a quality/locale/offline shape without
   * pretending a specific engine voice always exists.
   */
  nativeVoicePreference?: NativeVoicePreference
  /**
   * Reported by the runtime after attempting to map this profile to a real
   * device voice. "explicit" = `nativeVoiceId` was found and selected;
   * "heuristic" = `nativeVoicePreference` led to a scored selection;
   * "unavailable" = no acceptable native voice exists on the device.
   *
   * This is NOT authored — it's runtime-resolved per call.
   */
  nativeVoiceResolution?: NativeVoiceResolution
  provider?: "openai" | "omnivoice" | "fallback"
  omnivoiceMode?: "clone" | "design"
  omnivoiceRefAudioId?: string
  omnivoiceRefText?: string
  omnivoiceInstruct?: string
  languageId?: string
  /** Optional: pacing/cadence shape applied on top of slider rate. */
  cadenceProfile?: VoiceCadenceProfile
  /** Optional: 1..5 commanding presence/authority intensity for delivery. */
  authorityLevel?: 1 | 2 | 3 | 4 | 5
}

export interface VoiceFilterState {
  search: string
  category: VoiceCategory | "All"
  toneTag: string | "All"
  favoritesOnly: boolean
}

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
  /** Optional: targeted Android native voice id (used when capable). */
  nativeVoiceId?: string
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

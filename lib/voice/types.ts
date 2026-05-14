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

export interface VoiceProfile {
  id: string
  name: string
  category: VoiceCategory
  shortDescription: string
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
  featured: boolean
  providerVoiceId?: string
  availability: VoiceAvailability
  accent: AccentColor
}

export interface VoiceFilterState {
  search: string
  category: VoiceCategory | "All"
  toneTag: string | "All"
  favoritesOnly: boolean
}

/**
 * Personality behavior profiles.
 *
 * This is the behavior layer consumed by the assistant runtime: it maps each
 * personality id to the tone / response-style / verbosity knobs that
 * `assistantResponseEngine.ts` switches on, plus the linked default voice.
 *
 * `lib/assistant/personalityProfiles.ts` merges this behavior onto the richer
 * `AssistantPersonalityProfile` descriptors via `withBehavior()`.
 */

// Tone affects sentence pacing in the response engine.
export type PersonalityTone =
  | "precise"
  | "chaotic"
  | "warm"
  | "sarcastic"
  | "competitive"
  | "technical"
  | "energetic"
  | "analytical"
  | "cinematic"
  | "calm"
  | "strategic"
  | "dramatic"

// Response style drives openings, vocabulary inserts and preview prompts.
// Every member must stay in sync with the `inserts` record in
// `assistantResponseEngine.ts` (it is keyed by this exact union).
export type PersonalityResponseStyle =
  | "diagnostic"
  | "mischief"
  | "supportive"
  | "deadpan"
  | "game-master"
  | "technical"
  | "coach"
  | "deductive"
  | "storytelling"
  | "grounded"
  | "hype"
  | "framework"

// Verbosity caps how many sentences a shaped response keeps.
export type PersonalityVerbosity = "short" | "medium" | "long"

export interface PersonalityProfile {
  id: string
  tone: PersonalityTone
  responseStyle: PersonalityResponseStyle
  verbosity: PersonalityVerbosity
  /** 0-1 normalized humor weight. */
  humor: number
  /** 0-1 normalized assertiveness weight. */
  aggressiveness: number
  /** Default linked voice profile id (must exist in VOICE_PROFILES). */
  voiceId: string
}

export const PERSONALITY_PROFILES: Record<string, PersonalityProfile> = {
  genius: {
    id: "genius",
    tone: "precise",
    responseStyle: "diagnostic",
    verbosity: "medium",
    humor: 0.25,
    aggressiveness: 0.35,
    voiceId: "neo",
  },
  chaos: {
    id: "chaos",
    tone: "chaotic",
    responseStyle: "mischief",
    verbosity: "short",
    humor: 0.95,
    aggressiveness: 0.55,
    voiceId: "prankster",
  },
  friendly: {
    id: "friendly",
    tone: "warm",
    responseStyle: "supportive",
    verbosity: "medium",
    humor: 0.45,
    aggressiveness: 0.15,
    voiceId: "nova",
  },
  snark: {
    id: "snark",
    tone: "sarcastic",
    responseStyle: "deadpan",
    verbosity: "short",
    humor: 0.86,
    aggressiveness: 0.6,
    voiceId: "snark",
  },
  gm: {
    id: "gm",
    tone: "competitive",
    responseStyle: "game-master",
    verbosity: "short",
    humor: 0.62,
    aggressiveness: 0.7,
    voiceId: "arcade-announcer",
  },
  wizard: {
    id: "wizard",
    tone: "technical",
    responseStyle: "technical",
    verbosity: "long",
    humor: 0.22,
    aggressiveness: 0.3,
    voiceId: "byte",
  },
  motivator: {
    id: "motivator",
    tone: "energetic",
    responseStyle: "coach",
    verbosity: "short",
    humor: 0.5,
    aggressiveness: 0.72,
    voiceId: "overclock-coach",
  },
  detective: {
    id: "detective",
    tone: "analytical",
    responseStyle: "deductive",
    verbosity: "medium",
    humor: 0.34,
    aggressiveness: 0.4,
    voiceId: "midnight-narrator",
  },
  story: {
    id: "story",
    tone: "cinematic",
    responseStyle: "storytelling",
    verbosity: "long",
    humor: 0.55,
    aggressiveness: 0.3,
    voiceId: "deepcore",
  },
  calm: {
    id: "calm",
    tone: "calm",
    responseStyle: "grounded",
    verbosity: "medium",
    humor: 0.15,
    aggressiveness: 0.1,
    voiceId: "velvet-circuit",
  },
  hype: {
    id: "hype",
    tone: "energetic",
    responseStyle: "hype",
    verbosity: "short",
    humor: 0.72,
    aggressiveness: 0.78,
    voiceId: "hyperdrive-host",
  },
  strat: {
    id: "strat",
    tone: "strategic",
    responseStyle: "framework",
    verbosity: "medium",
    humor: 0.18,
    aggressiveness: 0.6,
    voiceId: "commander",
  },
}

const DEFAULT_PERSONALITY_PROFILE = PERSONALITY_PROFILES.genius

/**
 * Resolve the behavior profile for a personality id. Unknown ids (e.g. custom
 * personalities) fall back to the `genius` behavior, mirroring
 * `getAssistantPersonalityProfile`.
 */
export function getPersonalityProfile(id: string): PersonalityProfile {
  return PERSONALITY_PROFILES[id] ?? DEFAULT_PERSONALITY_PROFILE
}

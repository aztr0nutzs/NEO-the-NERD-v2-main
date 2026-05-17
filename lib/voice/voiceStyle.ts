import type { VoiceParams } from "@/lib/types"
import type { VoiceProfile, VoiceToneProfile } from "./types"
import type { SpeechIntent } from "./speechIntent"
import { describePersonalityForProvider } from "./personalitySpeechShaping"

/**
 * Engine-ready speech payload derived from a voice profile + the user's live
 * VoiceParams sliders. The numeric fields are normalized to ranges that every
 * speech surface accepts directly:
 *   - browser SpeechSynthesisUtterance (rate 0.1-10, pitch 0-2, volume 0-1)
 *   - Android native TextToSpeech bridge (1.0 = normal rate/pitch, volume 0-1)
 *   - OpenAI TTS (rate is re-clamped to 0.25-4 by ttsClient)
 */
export interface StyledVoiceSpeech {
  text: string
  rate: number
  pitch: number
  volume: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// Inverse of voiceProfileToParams(): speed slider 0-100 -> engine rate 0.7-1.4
function speedSliderToRate(speed: number) {
  return 0.7 + (clamp(speed, 0, 100) / 100) * 0.7
}

// Inverse of voiceProfileToParams(): pitch slider 0-100 -> engine pitch 0.6-1.6
function pitchSliderToPitch(pitch: number) {
  return 0.6 + (clamp(pitch, 0, 100) / 100) * 1.0
}

// Subtle per-tone nudge so the same slider values still "read" as the profile
// they belong to. Kept small so user slider intent always dominates.
const TONE_RATE_NUDGE: Record<VoiceToneProfile, number> = {
  balanced: 0,
  energetic: 0.08,
  calm: -0.08,
  robotic: -0.02,
  aggressive: 0.05,
  sarcastic: -0.03,
  dramatic: -0.06,
  retro: 0.02,
  playful: 0.05,
}

const TONE_PITCH_NUDGE: Record<VoiceToneProfile, number> = {
  balanced: 0,
  energetic: 0.06,
  calm: -0.05,
  robotic: -0.08,
  aggressive: -0.04,
  sarcastic: 0.03,
  dramatic: -0.06,
  retro: 0.04,
  playful: 0.07,
}

/**
 * Build the styled speech payload for a voice profile. Combines the user's
 * VoiceParams sliders with a small, clamped tone-profile nudge.
 */
export function buildStyledVoiceSpeech(
  profile: VoiceProfile,
  text: string,
  params: VoiceParams,
): StyledVoiceSpeech {
  const baseSpoken =
    (text ?? "").trim() || profile.sampleLine || profile.sampleText || "NEO online."
  const spoken = shapeSpeechTextForProfile(profile, baseSpoken)

  const rate = clamp(
    speedSliderToRate(params.speed) + (TONE_RATE_NUDGE[profile.toneProfile] ?? 0),
    0.6,
    1.7,
  )
  const pitch = clamp(
    pitchSliderToPitch(params.pitch) + (TONE_PITCH_NUDGE[profile.toneProfile] ?? 0),
    0.5,
    1.8,
  )
  const volume = clamp((params.volume ?? 75) / 100, 0, 1)

  return { text: spoken, rate: Number(rate.toFixed(2)), pitch: Number(pitch.toFixed(2)), volume: Number(volume.toFixed(2)) }
}

/**
 * Re-shape spoken text per profile so that on the device fallback engine
 * (Android TextToSpeech or browser SpeechSynthesis) the personality is
 * still audibly distinct, even though the underlying timbre is shared.
 *
 * Strategy:
 *   - Per-id micro-flavor (taglines, signatures) for the high-character
 *     profiles where it makes the personality unmistakable.
 *   - Per-tone cadence shaping that inserts ellipses, dashes, and
 *     period density to force the engine to lengthen or shorten pauses.
 *   - Punctuation is the cheapest reliable way to change cadence on
 *     SpeechSynthesis / Android TTS; we exploit it deliberately.
 *
 * No new content is invented if the caller passes their own text — we
 * only top-and-tail with character-appropriate framing where it reads
 * naturally.
 */
function shapeSpeechTextForProfile(profile: VoiceProfile, text: string) {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (!normalized) return normalized

  // Per-id flavor first. These match the canonical provider-distinct
  // profiles and the most-played character voices; they always win
  // over generic tone shaping below.
  const id = profile.id
  if (id === "commander") {
    return normalized
      .replace(/\?$/g, ". Confirm.")
      .replace(/\. /g, ". ")
      .replace(/!+/g, ".")
  }
  if (id === "prankster" || id === "snark") {
    const punchline = id === "snark" ? "...obviously." : "...probably."
    return normalized.endsWith("!") || normalized.endsWith(".")
      ? `${normalized} ${punchline}`
      : `${normalized}, ${punchline}`
  }
  if (id === "droid") return `Unit ready. ${normalized}`
  if (id === "neon-mentor" || id === "mentor") {
    return normalized.replace(/, /g, ", ... ").replace(/\. /g, ". ... ")
  }
  if (id === "arcade-announcer" || id === "hyperdrive-host" || id === "sparky") {
    const trimmed = normalized.replace(/[.!]+$/, "")
    return `${trimmed}!`
  }
  if (id === "midnight-narrator" || id === "deepcore" || id === "villain") {
    return `${normalized} ...and the room went quiet.`
  }
  if (id === "glitch") {
    // Stutter a soft consonant on a single name — gentle so it does not
    // garble numbers or sentences. The replacement is intentionally
    // case-insensitive but keeps the canonical "Neo" spelling so the
    // engine reads it as one word.
    return normalized.replace(/\bneo\b/i, "N-N-Neo")
  }
  if (id === "nova") {
    if (normalized.endsWith("!") || normalized.endsWith("?")) return normalized
    const trimmed = normalized.replace(/[.]+$/, "")
    return `${trimmed}!`
  }
  if (id === "retro") {
    return normalized.replace(/\b(ready|go|start|level|score)\b/gi, "$1.").replace(/\.\./g, ".")
  }

  // Tone-driven cadence shaping for everything else. These rules only
  // adjust punctuation; the actual words stay intact.
  switch (profile.toneProfile) {
    case "calm":
      return normalized.replace(/!/g, ".").replace(/, /g, ", ... ").replace(/\? /g, "?... ")
    case "dramatic":
      return normalized.replace(/, /g, "... ").replace(/\. /g, ". ... ")
    case "sarcastic":
      return normalized.endsWith(".") || normalized.endsWith("!")
        ? normalized
        : `${normalized}.`
    case "aggressive":
      return normalized.replace(/\. /g, "! ").replace(/\?$/g, "?!")
    case "energetic":
    case "playful": {
      // Strip a trailing period/exclamation before appending a new bang
      // so we never produce `are.!` style awkward double punctuation.
      const trimmed = normalized.replace(/[.!]+$/, "")
      return `${trimmed}!`
    }
    case "robotic":
      // Hard stop after every clause to amplify the metered robotic feel.
      return normalized.replace(/, /g, ". ")
    case "retro":
      return normalized.replace(/\.\./g, ".")
    default:
      return normalized
  }
}

const TONE_INSTRUCTION: Record<VoiceToneProfile, string> = {
  balanced: "Speak with a clear, polished robot-companion tone.",
  energetic: "Speak with high energy, brisk pacing, and upbeat cyberpunk confidence.",
  calm: "Speak calmly and smoothly with relaxed, low-pressure pacing.",
  robotic: "Speak with a precise, lightly synthetic, evenly metered robotic tone.",
  aggressive: "Speak with sharp, forceful intensity while staying controlled.",
  sarcastic: "Speak with dry, deadpan wit and understated delivery.",
  dramatic: "Speak with cinematic gravity, deliberate pacing, and theatrical weight.",
  retro: "Speak with a nostalgic, arcade-flavored, slightly chiptune cadence.",
  playful: "Speak with a light, mischievous, playful bounce.",
}

/**
 * Natural-language tone instructions for provider TTS engines that accept an
 * `instructions` field (e.g. OpenAI gpt-4o-mini-tts).
 */
export function toneInstructions(profile: VoiceProfile): string {
  const base = TONE_INSTRUCTION[profile.toneProfile] ?? TONE_INSTRUCTION.balanced
  const tags = profile.toneTags?.length ? ` Tone cues: ${profile.toneTags.join(", ")}.` : ""
  return `${base}${tags}`
}

const CADENCE_INSTRUCTION: Record<string, string> = {
  steady: "Maintain an even, predictable cadence with clear phrase boundaries.",
  brisk: "Use a brisk, forward-leaning pace without rushing endings.",
  snappy: "Use short snappy phrases with crisp consonants.",
  measured: "Use measured, deliberate pacing with brief reflective pauses.",
  deliberate: "Use deliberate pacing with weighted pauses on key words.",
  lyrical: "Use a lyrical, sing-song lilt with playful rise and fall.",
  staccato: "Use clipped staccato phrasing with short percussive beats.",
  languid: "Use a slow, languid cadence with long pauses and trailing endings.",
}

export interface ProviderInstructionContext {
  /** Active personality at speech time — drives persona delivery hint. */
  personalityId?: string
  /** Spoken-delivery intent (greeting, alert, joke, etc.). */
  intent?: SpeechIntent
}

/**
 * Build the full provider instruction string for a profile, composing tone,
 * authored style prompt, emotional instructions, cadence, authority cues,
 * and (when provided) the active personality + spoken-delivery intent.
 *
 * Order: persona context → voice tone → voice style → voice emotion →
 * cadence → authority → user-level emotion slider instruction. The neural
 * provider weights earlier parts higher, so the personality + intent
 * framing lands first for chat / vault playback, while pure voice library
 * previews (no personality, no intent) fall through to the voice-only
 * instruction set unchanged.
 */
export function buildProviderInstructions(
  profile: VoiceProfile,
  emotionInstruction: string,
  context: ProviderInstructionContext = {},
): string {
  const parts: string[] = []
  const persona = describePersonalityForProvider(context.personalityId, context.intent ?? "default")
  if (persona) parts.push(persona)
  parts.push(toneInstructions(profile))
  if (profile.stylePrompt) parts.push(profile.stylePrompt)
  if (profile.emotionalInstructions) parts.push(profile.emotionalInstructions)
  if (profile.cadenceProfile && CADENCE_INSTRUCTION[profile.cadenceProfile]) {
    parts.push(CADENCE_INSTRUCTION[profile.cadenceProfile])
  }
  if (profile.authorityLevel != null) {
    if (profile.authorityLevel >= 5) parts.push("Project firm command presence; decisive and unwavering.")
    else if (profile.authorityLevel >= 4) parts.push("Project confident authority with controlled delivery.")
    else if (profile.authorityLevel <= 2) parts.push("Keep authority light and approachable, not commanding.")
  }
  parts.push(emotionInstruction)
  return parts.filter(Boolean).join(" ")
}

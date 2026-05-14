import type { VoiceParams } from "@/lib/types"
import type { VoiceProfile, VoiceToneProfile } from "./types"

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
  const spoken =
    (text ?? "").trim() || profile.sampleLine || profile.sampleText || "NEO online."

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

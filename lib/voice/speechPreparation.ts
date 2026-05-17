import type { VoiceParams } from "@/lib/types"
import type { VoiceProfile } from "./types"
import type { SpeechIntent } from "./speechIntent"
import { applyPersonalitySpeechShaping } from "./personalitySpeechShaping"
import { buildStyledVoiceSpeech, type StyledVoiceSpeech } from "./voiceStyle"

/**
 * Unified spoken-delivery preparation. This is the single function every
 * speech surface should call — Voice Library preview, Personality preview,
 * Chat reply playback, Response Vault playback, signature-phrase playback.
 *
 * Pipeline:
 *   1. Personality cadence shaping (`personalitySpeechShaping`) wraps the
 *      raw text in delivery cues that match the active persona (calm
 *      breath markers, sarcastic beat, arcade punch, etc.). Skipped when
 *      `personalityId` is unset.
 *   2. Voice profile cadence shaping (`buildStyledVoiceSpeech` →
 *      `shapeSpeechTextForProfile`) applies per-voice flavor on top
 *      (Commander baritone clipping, Glitch stutter, retro arcade beats).
 *   3. Slider-driven rate/pitch/volume normalization for the engine.
 *
 * The shape is intentionally additive: each layer only nudges punctuation
 * and whitespace so the resulting text is still readable, never gibberish.
 * Provider TTS receives the shaped text *plus* a personality-aware
 * instruction string (see `personalitySpeechShaping.describePersonalityForProvider`).
 */
export interface PreparedSpeech extends StyledVoiceSpeech {
  /** Tag describing which personality shaping family was applied. */
  personalityShaping: string
  /** Resolved spoken-delivery intent. */
  intent: SpeechIntent
}

export interface PrepareSpeechInput {
  voice: VoiceProfile
  text: string
  params: VoiceParams
  personalityId?: string
  intent?: SpeechIntent
}

export function prepareSpeechForDelivery(input: PrepareSpeechInput): PreparedSpeech {
  const intent: SpeechIntent = input.intent ?? "default"
  const personalityShaped = applyPersonalitySpeechShaping(
    input.text,
    input.personalityId,
    intent,
  )
  const styled = buildStyledVoiceSpeech(input.voice, personalityShaped.text, input.params)
  return {
    text: styled.text,
    rate: styled.rate,
    pitch: styled.pitch,
    volume: styled.volume,
    personalityShaping: personalityShaped.shaping,
    intent,
  }
}

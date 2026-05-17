import type { SpeechIntent } from "./speechIntent"

/**
 * Signature NEO phrase presets for high-value moments. These are short,
 * carefully authored lines that read well on every speech surface —
 * provider neural voice, Android TTS, and browser SpeechSynthesis —
 * because the phrasing is intentionally simple and the cadence cues are
 * built into the punctuation.
 *
 * No pre-rendered audio is bundled. The presets only standardize the
 * *text + intent* pair so the same wording is reused across the app
 * (greeting, scan finish, alert, etc.) and shaped consistently by the
 * personality + voice layers downstream.
 */

export type SignatureMoment =
  | "app-greeting"
  | "scan-complete"
  | "unknown-device-found"
  | "speed-test-complete"
  | "critical-alert"
  | "good-night"
  | "personality-switch"

export interface SignaturePreset {
  intent: SpeechIntent
  text: string
}

const PRESETS: Record<SignatureMoment, SignaturePreset> = {
  "app-greeting": {
    intent: "greeting",
    text: "NEO online. The channel is clean and I'm listening — tell me the mission.",
  },
  "scan-complete": {
    intent: "scan-summary",
    text: "Network scan complete. All devices accounted for, no active warnings.",
  },
  "unknown-device-found": {
    intent: "alert",
    text: "Heads up. A device I don't recognize just joined the network — want me to investigate?",
  },
  "speed-test-complete": {
    intent: "explanation",
    text: "Speed test complete. The numbers are in — your line is holding the steady mark you expected.",
  },
  "critical-alert": {
    intent: "alert",
    text: "Critical alert. Something on the network needs your attention right now.",
  },
  "good-night": {
    intent: "calm-reflection",
    text: "Standing down for the night. Channel is quiet, sensors are gentle — rest well.",
  },
  "personality-switch": {
    intent: "greeting",
    text: "Personality matrix locked. New tone is online and ready to use.",
  },
}

/**
 * Look up a signature preset. Returns null for unknown ids so callers
 * can fall back to a normal generated line instead of speaking silence.
 */
export function getSignaturePhrase(moment: SignatureMoment): SignaturePreset | null {
  return PRESETS[moment] ?? null
}

/** Enumerate all signature moments — useful for QA / preview UIs. */
export function listSignatureMoments(): SignatureMoment[] {
  return Object.keys(PRESETS) as SignatureMoment[]
}

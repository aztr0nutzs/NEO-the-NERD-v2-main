import type { SpeechIntent } from "./speechIntent"
import type { PersonalityProfile } from "@/lib/personality/personalityProfiles"
import { getPersonalityProfile } from "@/lib/personality/personalityProfiles"

/**
 * Personality-aware spoken-delivery shaping. Sits *above* the voice profile
 * cadence shaping in `voiceStyle.ts`: takes the already-personality-shaped
 * display text (the chat bubble's actual content) and adds the spoken
 * delivery cues that look noisy in writing but read correctly to a TTS
 * engine — breath markers, beat-pauses before punchlines, intentional
 * exclamation density, and so on.
 *
 * The shaping is intentionally minimal. We assume the response engine has
 * already applied personality vocabulary and pacing at generation time;
 * this layer only adjusts punctuation/whitespace cues so the native and
 * browser engines render the personality's cadence audibly.
 */

export interface ShapedSpokenText {
  text: string
  /** Tag describing which shaping family was applied (for QA + diagnostics). */
  shaping: string
}

const SAFE_TAIL_SET = /[.!?…]$/

function trimTrailingPunct(input: string): string {
  return input.replace(/[.!?]+$/, "")
}

function avoidDoublePunct(input: string): string {
  return input
    .replace(/\.{4,}/g, "...")
    .replace(/!+\?/g, "?!")
    .replace(/\?!+/g, "?!")
    .replace(/([.,!?])\s*\1+/g, "$1")
}

/**
 * Apply gentle personality framing without changing the meaning of the
 * text. Each rule is intentionally bounded:
 *
 *   - we never invent factual content,
 *   - we never delete user-authored sentences,
 *   - we never add more than one short prefix or one short tag,
 *   - we never repeat a marker if the text already contains it.
 */
export function applyPersonalitySpeechShaping(
  rawText: string,
  personalityId: string | undefined,
  intent: SpeechIntent,
): ShapedSpokenText {
  const normalized = (rawText ?? "").replace(/\s+/g, " ").trim()
  if (!normalized) return { text: "", shaping: "empty" }

  if (!personalityId) {
    return { text: normalized, shaping: "no-personality" }
  }

  const profile = getPersonalityProfile(personalityId)
  const base = avoidDoublePunct(normalized)

  switch (profile.tone) {
    case "calm":
      return { text: shapeCalmDelivery(base, profile, intent), shaping: `calm:${profile.id}` }
    case "sarcastic":
      return { text: shapeSarcasticDelivery(base, profile, intent), shaping: `sarcastic:${profile.id}` }
    case "energetic":
      return { text: shapeEnergeticDelivery(base, profile, intent), shaping: `energetic:${profile.id}` }
    case "competitive":
      return { text: shapeArcadeDelivery(base, profile, intent), shaping: `competitive:${profile.id}` }
    case "analytical":
      return { text: shapeAnalyticalDelivery(base, profile, intent), shaping: `analytical:${profile.id}` }
    case "cinematic":
    case "dramatic":
      return { text: shapeCinematicDelivery(base, profile, intent), shaping: `cinematic:${profile.id}` }
    case "strategic":
      return { text: shapeStrategicDelivery(base, profile, intent), shaping: `strategic:${profile.id}` }
    case "technical":
      return { text: shapeTechnicalDelivery(base, profile, intent), shaping: `technical:${profile.id}` }
    case "warm":
      return { text: shapeWarmDelivery(base, profile, intent), shaping: `warm:${profile.id}` }
    case "chaotic":
      return { text: shapeChaoticDelivery(base, profile, intent), shaping: `chaotic:${profile.id}` }
    case "precise":
    default:
      return { text: shapePreciseDelivery(base, profile, intent), shaping: `precise:${profile.id}` }
  }
}

// ---------------------------------------------------------------------------
// Per-tone shapers — each function only adds cadence cues, never new claims.
// ---------------------------------------------------------------------------

function shapeCalmDelivery(text: string, _profile: PersonalityProfile, intent: SpeechIntent): string {
  // Calm: smooth out exclamations, add gentle ellipses at clause breaks so
  // the engine takes a small breath. Used by Calm Companion and similar.
  let out = text.replace(/!+/g, ".")
  if (!out.includes("...")) {
    out = out.replace(/, /g, ", … ").replace(/\. (?=[A-Z])/g, ". … ")
  }
  if (intent === "calm-reflection" && !/^[A-Z][a-z]/.test(out)) {
    return out
  }
  return out
}

function shapeSarcasticDelivery(text: string, _profile: PersonalityProfile, intent: SpeechIntent): string {
  // Sarcastic: deliberate beat before the last sentence so the engine
  // pauses before the punchline. Convert exclamations to flat periods
  // so the delivery stays deadpan. If the response engine already added a
  // payoff tag ("…obviously"), insert the beat directly before it.
  const trimmed = text.replace(/!+/g, ".").trim()
  if (/(obviously|shockingly|somehow|sure thing)\s*\.?$/i.test(trimmed)) {
    // If the payoff word is already preceded by an ellipsis beat ("…" or
    // "..."), leave the line alone — re-shaping it would produce
    // "… … obviously." which reads as a stutter.
    if (/(?:…|\.\.\.)\s+(?:obviously|shockingly|somehow|sure thing)\s*\.?$/i.test(trimmed)) {
      return trimmed
    }
    return trimmed.replace(/\s*\.?\s*$/, "").replace(/\s+(\w+)\s*\.?$/, " … $1.")
  }
  // Find the final sentence and insert a small beat marker. Avoids
  // adding the beat when the text is a single short clause.
  const sentences = trimmed.split(/(?<=[.!?])\s+/)
  if (sentences.length >= 2) {
    const last = sentences[sentences.length - 1]
    sentences[sentences.length - 1] = `… ${last}`
    return sentences.join(" ")
  }
  // Single-sentence path: add a soft tail when the intent invites it.
  // Skip when the snark/prankster voice-profile shaper will append its
  // own "...obviously." / "...probably." tag downstream — we detect that
  // by inspecting an existing trailing payoff word so we never produce
  // "… obviously. ...obviously."
  if (intent === "joke" || intent === "humorous-aside") {
    if (/(obviously|probably|shockingly|somehow|sure thing)\b/i.test(trimmed)) {
      return SAFE_TAIL_SET.test(trimmed) ? trimmed : `${trimmed}.`
    }
    const stem = SAFE_TAIL_SET.test(trimmed) ? trimmed.replace(/[.!?]+$/, "") : trimmed
    return `${stem}, … obviously.`
  }
  return SAFE_TAIL_SET.test(trimmed) ? trimmed : `${trimmed}.`
}

function shapeEnergeticDelivery(text: string, _profile: PersonalityProfile, intent: SpeechIntent): string {
  // Energetic / hype: punchier endings on celebrations and greetings; for
  // longer explanations leave the body alone so it doesn't sound shouty.
  if (intent === "celebration" || intent === "greeting") {
    const stripped = trimTrailingPunct(text)
    return `${stripped}!`
  }
  return text.replace(/\. (?=[A-Z])/g, "! ")
}

function shapeArcadeDelivery(text: string, _profile: PersonalityProfile, _intent: SpeechIntent): string {
  // Arcade / game master: short punchy bursts. Strip a trailing period
  // and replace with an exclamation; convert mid-sentence periods (but
  // not ellipses) into exclamation+space so the engine reads each clause
  // as a burst. Avoids double-exclamation by collapsing afterwards.
  let out = text.replace(/(?<!\.)\.(?!\.)\s+(?=[A-Z])/g, "! ")
  out = out.replace(/!{2,}/g, "!")
  const stripped = trimTrailingPunct(out)
  return `${stripped}!`
}

function shapeAnalyticalDelivery(text: string, _profile: PersonalityProfile, intent: SpeechIntent): string {
  // Detective: deliberate, investigative cadence. Inserts a deduction
  // opener on most explanatory deliveries, and a soft "Hmm. " on scan
  // summaries / alerts so the line sounds noticed rather than recited.
  if (/^(Clue|Working theory|Interesting signal|Observation|Curious|Hmm)\b/i.test(text)) {
    return text
  }
  if (intent === "diagnostics" || intent === "explanation") {
    return `Curious — ${text}`
  }
  if (intent === "scan-summary" || intent === "alert") {
    return `Hmm. ${text}`
  }
  if (intent === "greeting") {
    return text.startsWith("Detective") ? text : `Curious. ${text}`
  }
  return text
}

function shapeCinematicDelivery(text: string, _profile: PersonalityProfile, _intent: SpeechIntent): string {
  // Storyteller / dramatic: lengthen pauses between clauses, but cap the
  // ellipsis density so it doesn't read like Morse code.
  let out = text
  if (!out.includes("...")) {
    out = out.replace(/, /g, "… ").replace(/\. (?=[A-Z])/g, ". … ")
  }
  return out
}

function shapeStrategicDelivery(text: string, _profile: PersonalityProfile, intent: SpeechIntent): string {
  // Strategy: enumerate clauses lightly when the text contains an "or"
  // disjunction or "options" — keeps the planner cadence intact.
  // We only insert the cadence comma when the next character is not
  // already a punctuation mark (so "Three options:" / "or," stay intact)
  // and when a comma is not already present in that position.
  if (intent === "explanation" || intent === "command") {
    return text
      .replace(/\b(option|options)\b(?!\s*[,:;.!?])/gi, "$1,")
      .replace(/\b(or)\b(?!\s*[,:;.!?])/gi, "$1,")
  }
  return text
}

function shapeTechnicalDelivery(text: string, _profile: PersonalityProfile, _intent: SpeechIntent): string {
  // Tech Wizard: insert short stops between procedural steps so the engine
  // doesn't run sentences together. Conservative — only the most common
  // joiners, and we only add the comma when the joiner is not already
  // followed by `,` `:` `;` etc., so "Next: open the trace" / "Then, ship"
  // stay intact instead of becoming "Next,:" / "Then,, ship".
  return text.replace(/\b(then|next|after that)\b(?!\s*[,:;.!?])/gi, "$1,")
}

function shapeWarmDelivery(text: string, _profile: PersonalityProfile, intent: SpeechIntent): string {
  // Friendly: soften exclamations to keep the warmth audible without
  // sounding manic. Adds a brief "Sure thing — " only on greetings if no
  // similar opener already exists.
  let out = text.replace(/!+/g, ".")
  if (intent === "greeting" && !/^(hi|hey|hello|welcome|sure|easy|i.?ve got you)\b/i.test(out)) {
    out = `Sure thing — ${out}`
  }
  return out
}

function shapeChaoticDelivery(text: string, _profile: PersonalityProfile, intent: SpeechIntent): string {
  // Chaotic Prankster: keep playful punch, but never gibberish. Replace
  // long sentence joins with short bursts.
  let out = text.replace(/\. (?=[A-Z])/g, "! ")
  if (intent === "humorous-aside" || intent === "joke") {
    const stripped = trimTrailingPunct(out)
    out = `${stripped}!`
  }
  return out
}

function shapePreciseDelivery(text: string, _profile: PersonalityProfile, intent: SpeechIntent): string {
  // Precise / default: keep the line crisp. Flatten exclamations to
  // periods (genius/wizard/strat do not shout) and ensure a final stop
  // exists. On scan summaries and alerts we strip mid-sentence ellipses
  // so the engine reads the line as factual, not hesitant.
  let out = text.replace(/!+/g, ".")
  if (intent === "scan-summary" || intent === "alert") {
    out = out.replace(/[……]/g, "").replace(/\s+/g, " ").trim()
  }
  if (!SAFE_TAIL_SET.test(out.trim())) return `${out.trim()}.`
  return out
}

// ---------------------------------------------------------------------------
// Provider-side instruction extension — personality summary for OpenAI TTS.
// ---------------------------------------------------------------------------

const TONE_DELIVERY_HINT: Record<string, string> = {
  precise: "Speak with crisp, structured precision and a calm helper tone.",
  chaotic: "Speak with playful, mischievous energy — fast, lightly chaotic, never mean.",
  warm: "Speak with audible warmth, soft consonants, and an unhurried reassuring lift.",
  sarcastic: "Speak with dry, deadpan delivery; small beat before punchlines, never raise pitch on jabs.",
  competitive: "Speak with announcer punch — short bursts, scoreboard energy, controlled excitement.",
  technical: "Speak with patient methodical phrasing, slight pause between procedural steps.",
  energetic: "Speak with bright, brisk momentum; emphasize verbs without shouting.",
  analytical: "Speak with thoughtful, investigative cadence; brief reflective pauses before conclusions.",
  cinematic: "Speak with theatrical gravity and weighted pauses on key images.",
  calm: "Speak slowly and quietly with long breaths between thoughts; no abrupt stops.",
  strategic: "Speak with composed authority; deliberate, decision-first phrasing.",
  dramatic: "Speak with theatrical menace or wonder; long vowels, generous pauses.",
}

const INTENT_DELIVERY_HINT: Record<SpeechIntent, string> = {
  greeting: "Frame this as a warm greeting; settle on the final word, do not rush.",
  alert: "Frame this as a serious alert; clipped, urgent, controlled — never panicked.",
  explanation: "Frame this as a clear explanation; even pacing, emphasis on the key noun.",
  joke: "Frame this as a joke; small beat before the payoff, dry tail.",
  "humorous-aside": "Frame this as a playful aside; light bounce, smile audible.",
  celebration: "Frame this as a celebration; brighter energy, lift on the final phrase.",
  "scan-summary": "Frame this as a network scan summary; precise, factual, slightly cool.",
  diagnostics: "Frame this as a diagnostic readout; careful, hypothesis-first delivery.",
  "calm-reflection": "Frame this as a calm reflection; whisper-soft, gentle, no urgency.",
  command: "Frame this as a command; decisive stops, firm baritone presence.",
  story: "Frame this as a story beat; cinematic, atmospheric, allow silence between ideas.",
  default: "",
}

/**
 * One-line personality + intent summary suitable for prepending to a
 * provider TTS `instructions` string. Returns "" if no personality is set
 * so the existing voice-only path stays unchanged.
 */
export function describePersonalityForProvider(
  personalityId: string | undefined,
  intent: SpeechIntent,
): string {
  if (!personalityId) {
    return INTENT_DELIVERY_HINT[intent] ?? ""
  }
  const profile = getPersonalityProfile(personalityId)
  const tonePart = TONE_DELIVERY_HINT[profile.tone] ?? ""
  const intentPart = INTENT_DELIVERY_HINT[intent] ?? ""
  const persona = `Persona: ${profile.displayName} — ${profile.coreIdentity}`
  return [persona, tonePart, intentPart].filter(Boolean).join(" ")
}

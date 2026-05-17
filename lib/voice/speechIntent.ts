import type { LibraryResponseCategory, ResponseCategory } from "@/lib/types"

/**
 * Spoken-delivery intent for a piece of text. Distinct from the assistant
 * response category — `SpeechIntent` is about *how the line should sound*
 * (a celebration is shouted, a calm reflection is whispered) rather than
 * which response bucket it fell into. Consumers compute the intent at the
 * point of speech (chat reply, vault playback, voice library preview,
 * personality preview) and pass it through to the preparation layer.
 */
export type SpeechIntent =
  | "greeting"
  | "alert"
  | "explanation"
  | "joke"
  | "humorous-aside"
  | "celebration"
  | "scan-summary"
  | "diagnostics"
  | "calm-reflection"
  | "command"
  | "story"
  | "default"

const CATEGORY_TO_INTENT: Record<ResponseCategory, SpeechIntent> = {
  Helpful: "explanation",
  Funny: "joke",
  Prank: "humorous-aside",
  Game: "celebration",
  System: "greeting",
  Advice: "diagnostics",
}

const LIBRARY_CATEGORY_TO_INTENT: Partial<Record<LibraryResponseCategory, SpeechIntent>> = {
  Jokes: "joke",
  Comebacks: "humorous-aside",
  "Helpful answers": "explanation",
  "Prank ideas": "humorous-aside",
  "Game invites": "celebration",
  Greetings: "greeting",
  "Random thoughts": "humorous-aside",
  "Motivational lines": "celebration",
  "Tech help": "diagnostics",
  "Story starters": "story",
  "Robot reactions": "default",
  "Celebration lines": "celebration",
  "Status Quips": "humorous-aside",
  "Loading / Thinking Lines": "default",
}

export function intentForLibraryCategory(category: LibraryResponseCategory): SpeechIntent {
  return LIBRARY_CATEGORY_TO_INTENT[category] ?? "default"
}

/**
 * Best-effort intent inference from the surrounding metadata. Callers can
 * override by passing an explicit intent. The heuristics are intentionally
 * conservative — `default` is a perfectly valid result, and the preparation
 * layer falls back to personality + voice cadence in that case.
 */
export function inferSpeechIntent(input: {
  category?: ResponseCategory
  text?: string
  conversationMode?: string
}): SpeechIntent {
  const explicit = input.category ? CATEGORY_TO_INTENT[input.category] : undefined
  if (explicit) return explicit
  const lower = (input.text ?? "").toLowerCase().trim()
  if (!lower) return "default"
  if (/^(hi|hey|hello|good (morning|afternoon|evening)|welcome|boot|online)\b/.test(lower)) return "greeting"
  if (/\b(alert|warning|critical|danger|unauthorized|breach)\b/.test(lower)) return "alert"
  if (/\b(scan complete|devices? (online|found|detected)|new device)\b/.test(lower)) return "scan-summary"
  if (/\b(diagnos(is|tic)|trace|symptom|isolate|root cause)\b/.test(lower)) return "diagnostics"
  if (/\b(win|victory|new high|score|let's go|crushed it|champion)\b/.test(lower)) return "celebration"
  if (/\b(joke|funny|punchline|laugh)\b/.test(lower)) return "joke"
  if (/\b(slow down|breathe|easy|gentle|reflect|quiet)\b/.test(lower)) return "calm-reflection"
  if (/\b(execute|move|lock in|deploy|engage|confirm)\b/.test(lower)) return "command"
  if (/\b(once upon|scene opens|in the year|across the network)\b/.test(lower)) return "story"
  return "default"
}

const INTENT_LABEL: Record<SpeechIntent, string> = {
  greeting: "GREETING",
  alert: "ALERT",
  explanation: "EXPLANATION",
  joke: "JOKE",
  "humorous-aside": "HUMOROUS ASIDE",
  celebration: "CELEBRATION",
  "scan-summary": "SCAN SUMMARY",
  diagnostics: "DIAGNOSTICS",
  "calm-reflection": "CALM REFLECTION",
  command: "COMMAND",
  story: "STORY",
  default: "DEFAULT",
}

export function speechIntentLabel(intent: SpeechIntent): string {
  return INTENT_LABEL[intent]
}

import type { AssistantMessage, AssistantMemorySnapshot } from "./types"

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "you",
  "neo",
  "please",
  "about",
  "what",
  "how",
  "can",
  "help",
])

export function buildAssistantMemory(messages: AssistantMessage[]): AssistantMemorySnapshot {
  const recent = messages.slice(-12)
  const lastAssistant = [...recent].reverse().find((message) => message.role === "assistant")
  const lastIntent = [...recent].reverse().find((message) => message.intent)?.intent
  const lastUser = [...recent].reverse().find((message) => message.role === "user")

  return {
    recentIntent: lastIntent,
    lastTopic: extractTopic(lastUser?.content ?? lastAssistant?.content ?? ""),
    lastUsedJokeCategory: inferJokeCategory(lastAssistant?.content ?? ""),
    recentAssistantPhrases: recent
      .filter((message) => message.role === "assistant")
      .map((message) => normalizePhrase(message.content))
      .filter(Boolean),
  }
}

export function extractTopic(text: string): string | undefined {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))

  return words.slice(0, 3).join(" ") || undefined
}

export function normalizePhrase(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120)
}

export function isLikelyRepeat(candidate: string, previousPhrases: string[]) {
  const normalized = normalizePhrase(candidate)
  return previousPhrases.some(
    (phrase) => phrase === normalized || phrase.includes(normalized.slice(0, 64)),
  )
}

function inferJokeCategory(text: string): string | undefined {
  const lower = text.toLowerCase()
  if (lower.includes("dad joke")) return "dad"
  if (lower.includes("roast")) return "roast"
  if (lower.includes("pun")) return "pun"
  return undefined
}

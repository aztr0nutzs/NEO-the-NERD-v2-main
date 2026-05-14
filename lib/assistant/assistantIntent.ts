import type { AssistantIntent } from "./types"

const INTENT_PATTERNS: Array<{
  intent: AssistantIntent
  patterns: RegExp[]
}> = [
  {
    intent: "greet",
    patterns: [/\b(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/i],
  },
  {
    intent: "gratitude",
    patterns: [/\b(thanks|thank you|appreciate it|good looking out)\b/i],
  },
  {
    intent: "frustration",
    patterns: [
      /\b(frustrated|annoyed|angry|mad|stuck|broken|hate this|this sucks)\b/i,
      /\b(damn|wtf|hell|shit)\b/i,
    ],
  },
  {
    intent: "joke-request",
    patterns: [/\b(joke|make me laugh|funny|roast me|comeback)\b/i],
  },
  {
    intent: "prank-request",
    patterns: [/\b(prank|mischief|mess with|prank idea|harmless prank)\b/i],
  },
  {
    intent: "play-game",
    patterns: [/\b(play|game|quiz|trivia|challenge|tic tac toe|rock paper scissors)\b/i],
  },
  {
    intent: "tech-question",
    patterns: [
      /\b(code|bug|error|stack trace|network|wifi|router|api|server|build|typescript|android|apk)\b/i,
      /\b(debug|fix|install|compile|deploy|crash)\b/i,
    ],
  },
  {
    intent: "ask-for-help",
    patterns: [/\b(help|can you|how do i|show me|explain|plan|what should|need to)\b/i],
  },
  {
    intent: "continue-conversation",
    patterns: [/\b(continue|go on|more|expand|next|what else|do it)\b/i],
  },
  {
    intent: "react-to-comment",
    patterns: [/\b(wow|lol|haha|that is wild|interesting|cool|nice|yikes)\b/i],
  },
]

export function detectAssistantIntent(prompt: string): AssistantIntent {
  const normalized = prompt.trim()
  if (!normalized) return "unknown"

  for (const entry of INTENT_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(normalized))) {
      return entry.intent
    }
  }

  if (normalized.endsWith("?")) return "ask-for-help"
  return "unknown"
}

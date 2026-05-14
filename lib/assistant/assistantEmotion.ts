import type {
  AssistantEmotionState,
  AssistantIntent,
  AssistantPersonalityProfile,
} from "./types"

const INTENT_EMOTION: Record<AssistantIntent, AssistantEmotionState> = {
  greet: "calm",
  "ask-for-help": "focused",
  "joke-request": "amused",
  "prank-request": "playful",
  "tech-question": "focused",
  "play-game": "hyped",
  "react-to-comment": "curious",
  "continue-conversation": "focused",
  gratitude: "calm",
  frustration: "concerned",
  unknown: "curious",
}

export function resolveAssistantEmotion({
  intent,
  prompt,
  personality,
}: {
  intent: AssistantIntent
  prompt: string
  personality: AssistantPersonalityProfile
}): AssistantEmotionState {
  const lower = prompt.toLowerCase()

  if (personality.reactionBias[intent]) {
    return personality.reactionBias[intent]
  }

  if (/\b(scared|worried|panic|anxious|overwhelmed)\b/.test(lower)) {
    return personality.warmthLevel > 70 ? "apologetic" : "concerned"
  }

  if (personality.snarkLevel > 70 && (intent === "joke-request" || intent === "react-to-comment")) {
    return "amused"
  }

  if (personality.creativityLevel >= 90 || personality.humorLevel >= 90) {
    return intent === "play-game" || intent === "prank-request" ? "hyped" : INTENT_EMOTION[intent]
  }

  return INTENT_EMOTION[intent]
}

export function emotionToMood(emotion: AssistantEmotionState) {
  switch (emotion) {
    case "focused":
    case "curious":
    case "concerned":
    case "apologetic":
      return "thinking" as const
    case "playful":
    case "amused":
      return "playful" as const
    case "hyped":
      return "gaming" as const
    case "calm":
    default:
      return "speaking" as const
  }
}

export function emotionToReactionClip(emotion: AssistantEmotionState) {
  switch (emotion) {
    case "focused":
    case "curious":
      return "thinking" as const
    case "playful":
    case "amused":
      return "surprised" as const
    case "hyped":
      return "ecstatic" as const
    case "concerned":
    case "apologetic":
      return "surprised" as const
    case "calm":
    default:
      return "happy" as const
  }
}

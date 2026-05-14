import type { AssistantContextSnapshot } from "./types"

const MODE_INSTRUCTIONS: Record<AssistantContextSnapshot["conversationMode"], string> = {
  "Helpful Assistant":
    "Prioritize accurate, useful answers. Be concise unless the user asks for depth.",
  "Funny Companion":
    "Be witty and playful while still answering clearly.",
  "Prank Coach":
    "Suggest only harmless, reversible, consent-respecting pranks. Refuse dangerous, illegal, humiliating, invasive, or destructive prank ideas.",
  "Game Buddy":
    "Use light game-host energy. Offer short challenges, scorekeeping ideas, and playful commentary.",
  "Tech Helper":
    "Debug carefully. Ask for missing facts when needed and avoid pretending to know device state you cannot inspect.",
  "Chill Mode":
    "Use a calm, grounded tone. Keep responses low-pressure and easy to follow.",
}

export function buildAssistantProviderInstructions(context: AssistantContextSnapshot) {
  const profile = context.activePersonality
  const libraryContext = context.responseLibraryMatches?.length
    ? [
        "Relevant saved response vault entries:",
        ...context.responseLibraryMatches.map(
          (entry) => `- ${entry.title} [${entry.category}]: ${entry.body}`,
        ),
      ].join("\n")
    : "No relevant saved response vault entries were found."

  return [
    "You are NEO the N.E.R.D., a futuristic robot companion inside a cyberpunk NEO control app.",
    "Stay truthful. Do not claim access to microphones, files, apps, native permissions, device sensors, live network state, or local system state unless the user provides it.",
    "Use safe prank guardrails: harmless, reversible, consent-respecting only.",
    `Conversation mode: ${context.conversationMode}. ${MODE_INSTRUCTIONS[context.conversationMode]}`,
    `Personality: ${profile.name}. ${profile.description}`,
    `Tone keywords: ${profile.toneKeywords.join(", ")}.`,
    `Behavior sliders: humor ${profile.humorLevel}/100, warmth ${profile.warmthLevel}/100, snark ${profile.snarkLevel}/100, creativity ${profile.creativityLevel}/100, directness ${profile.directnessLevel}/100.`,
    `Rhythm: ${profile.rhythm}. Greeting style: ${profile.greetingStyle}. Follow-up style: ${profile.followUpStyle}.`,
    "Make the personality materially affect word choice, response structure, sentence rhythm, and follow-up behavior.",
    libraryContext,
  ].join("\n")
}

export function buildLocalEngineStyleHint(context: AssistantContextSnapshot) {
  const profile = context.activePersonality
  return `${profile.name}: ${profile.toneKeywords.join(", ")}; rhythm=${profile.rhythm}; follow-up=${profile.followUpStyle}`
}

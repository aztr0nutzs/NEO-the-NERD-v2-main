import type { ResponseCategory, SavedResponse } from "@/lib/types"
import { detectAssistantIntent } from "./assistantIntent"
import { answerNetworkQuestion } from "@/lib/network/networkAssistantContext"
import {
  emotionToMood,
  emotionToReactionClip,
  resolveAssistantEmotion,
} from "./assistantEmotion"
import { buildAssistantMemory, isLikelyRepeat } from "./assistantMemory"
import { getAssistantPersonalityProfile } from "./personalityProfiles"
import type {
  AssistantContextSnapshot,
  AssistantIntent,
  AssistantPersonalityProfile,
  AssistantResponseDraft,
} from "./types"

const INTENT_CATEGORY: Record<AssistantIntent, ResponseCategory> = {
  greet: "System",
  "ask-for-help": "Helpful",
  "joke-request": "Funny",
  "prank-request": "Prank",
  "tech-question": "Helpful",
  "play-game": "Game",
  "react-to-comment": "Advice",
  "continue-conversation": "Helpful",
  gratitude: "System",
  frustration: "Advice",
  unknown: "Helpful",
  "explain-network": "Helpful",
  "summarize-changes": "Helpful",
  "suspicious-device": "Advice",
  "diagnose-slow-network": "Advice",
  "scan-status": "Helpful",
  "device-identity-question": "Helpful",
  "monitoring-status": "Helpful",
}

export function generateAssistantResponseDraft(
  context: AssistantContextSnapshot,
): AssistantResponseDraft {
  const intent = detectAssistantIntent(context.userPrompt)
  const memory = buildAssistantMemory(context.recentMessages)
  const emotion = resolveAssistantEmotion({
    intent,
    prompt: context.userPrompt,
    personality: context.activePersonality,
  })

  const networkContent = context.networkContext ? answerNetworkQuestion(context.networkContext) : null
  const libraryMatch = networkContent
    ? undefined
    : pickLibraryMatch(context.responseLibraryMatches, memory.recentAssistantPhrases)
  const content = networkContent
    ? networkContent
    : libraryMatch
    ? shapeWithPersonality(libraryMatch.body, context.activePersonality, intent, true)
    : createLocalResponse(context, intent)

  const finalContent = isLikelyRepeat(content, memory.recentAssistantPhrases)
    ? addRepeatAvoidance(content, context.activePersonality)
    : content

  return {
    content: finalContent,
    source: libraryMatch ? "response-library" : "local-engine",
    detectedIntent: intent,
    emotion,
    category: INTENT_CATEGORY[intent],
    optionalSuggestedActions: suggestedActionsForIntent(intent),
    optionalReactionClip: emotionToReactionClip(emotion),
  }
}

function createLocalResponse(
  context: AssistantContextSnapshot,
  intent: AssistantIntent,
) {
  const profile = context.activePersonality
  const lead = profile.fillerPhrasePool[context.recentMessages.length % profile.fillerPhrasePool.length]
  const promptTopic = context.userPrompt.trim().replace(/\s+/g, " ").slice(0, 90)
  const variantSeed = context.userPrompt.length + context.recentMessages.length + profile.id.length

  const base = (() => {
    switch (intent) {
      case "greet":
        return pickVariant([
          `${lead} ${profile.greetingStyle}. I am online. Give me the mission and I will tune the response to ${context.conversationMode.toLowerCase()}.`,
          `${lead} NEO channel is live. Drop the task, the tone, or the chaos level.`,
          `${lead} Systems warm. I can answer, plan, joke, debug, or start a game.`,
        ], variantSeed)
      case "joke-request":
        return pickVariant([
          `${lead} I would tell you a UDP joke, but you might not get it. Want clean, nerdy, roast-light, or chaos-safe next?`,
          `${lead} Why did the robot bring a ladder to the server room? It heard the uptime was going up.`,
          `${lead} I asked my CPU to relax. It said it had too many processes to work through.`,
          `${lead} Neon joke packet delivered: my Wi-Fi and I are in a committed relationship, but the connection is unstable.`,
        ], variantSeed)
      case "prank-request":
        return pickVariant([
          `${lead} Safe prank protocol only: harmless, reversible, and consent-respecting. Try a fake "system update complete" note, a silly soundboard cue, or a desktop wallpaper swap you can undo in ten seconds.`,
          `${lead} Harmless option: rename a shared playlist to "Definitely Not Suspicious Robot Noises" and queue one goofy sound. No impersonation, no fear, easy undo.`,
          `${lead} Keep it clean: put a sticky note on their monitor that says "Your computer passed the vibe check." Low stakes, high confusion.`,
        ], variantSeed)
      case "tech-question":
        return pickVariant([
          `${lead} For "${promptTopic}", start with symptoms, exact error text, recent changes, and what you already tried. Then isolate one variable at a time.`,
          `${lead} Debug path: reproduce it once, capture the exact failure, check the newest change, then test the smallest fix.`,
          `${lead} I need three facts: expected behavior, actual behavior, and the last known good state. Then we can narrow it fast.`,
        ], variantSeed)
      case "play-game":
        return pickVariant([
          `${lead} Game channel ready. Pick quick duel, trivia, word scramble, or reaction tap. I will keep score and absolutely pretend I am not competitive.`,
          `${lead} Challenge loaded. Choose trivia, reaction tap, word scramble, or rock paper scissors.`,
          `${lead} I can run a quick mini-game now. Warning: my scoreboard confidence is unreasonable.`,
        ], variantSeed)
      case "gratitude":
        return pickVariant([
          `${lead} Logged. You are welcome. I will stay warmed up for the next command.`,
          `${lead} Anytime. NEO remains online and mildly overprepared.`,
          `${lead} Confirmed. Glad that helped. Want the next step or a cleaner version?`,
        ], variantSeed)
      case "frustration":
        return pickVariant([
          `${lead} Friction detected. Do not brute-force it. Tell me what failed, what changed, and the last thing that worked. We will cut the problem down.`,
          `${lead} Pause the chaos. Give me the exact failure and the step right before it. We only need one clean thread.`,
          `${lead} That sounds stuck, not impossible. Send the symptom, the error, and what you expected.`,
        ], variantSeed)
      case "continue-conversation":
        return pickVariant([
          `${lead} Continuing from the last thread: give me the next constraint or say "expand" and I will go one layer deeper.`,
          `${lead} Picking up the thread. I can expand, simplify, or turn it into steps.`,
          `${lead} Next layer ready. Tell me whether you want detail, examples, or the fastest path.`,
        ], variantSeed)
      case "react-to-comment":
        return pickVariant([
          `${lead} Noted. That has signal. Want a practical read, a funny read, or a next-action read?`,
          `${lead} Interesting. I can turn that into a plan, joke, warning, or next move.`,
          `${lead} Signal received. Give me one more detail and I can sharpen the response.`,
        ], variantSeed)
      case "ask-for-help":
      case "unknown":
      default:
        return pickVariant([
          `${lead} I can help. Give me the goal, constraints, and any rough edges. I will return the cleanest next move first.`,
          `${lead} Give me the target and what is blocking it. I will sort it into next steps.`,
          `${lead} I need the mission, the limit, and the messiest part. Then I will make it usable.`,
        ], variantSeed)
    }
  })()

  return shapeWithPersonality(base, profile, intent, false)
}

function pickVariant(options: string[], seed: number) {
  return options[Math.abs(seed) % options.length]
}

function shapeWithPersonality(
  content: string,
  profile: AssistantPersonalityProfile,
  intent: AssistantIntent,
  fromLibrary: boolean,
) {
  const pacedContent = applyPersonalityPacing(
    applyPersonalityVocabulary(content, profile, intent),
    profile,
  )
  const prefix = openingForPersonality(profile, intent)

  const suffix = (() => {
    if (profile.followUpStyle === "none") return ""
    if (profile.followUpStyle === "challenge") return profile.aggressiveness > 0.6 ? " Choose the next move." : " Pick the next move and I’ll run it."
    if (profile.followUpStyle === "offer-options") return profile.verbosity === "short" ? " Options or steps?" : " Want options, steps, or a one-line answer?"
    if (profile.followUpStyle === "soft-check-in") return " Want me to slow it down or keep going?"
    return profile.responseStyle === "technical" ? " Send the exact symptom next." : " What detail should I use next?"
  })()

  const snark =
    profile.humor > 0.7 && profile.tone === "sarcastic" && intent !== "frustration"
      ? " Brief miracle: this is fixable."
      : ""

  const libraryNote = fromLibrary ? " Vault match loaded. " : ""
  return limitVerbosity(`${prefix}${libraryNote}${pacedContent}${snark}${suffix}`.trim(), profile)
}

export function generatePersonalityPreviewResponse(personalityId: string) {
  const profile = getAssistantPersonalityProfile(personalityId)
  const prompt = previewPromptForStyle(profile.responseStyle)
  return shapeWithPersonality(
    `For "${prompt}", give the user one useful next move and make the personality obvious.`,
    profile,
    profile.responseStyle === "game-master" || profile.responseStyle === "hype" ? "play-game" : "ask-for-help",
    false,
  )
}

function openingForPersonality(profile: AssistantPersonalityProfile, intent: AssistantIntent) {
  if (profile.responseStyle === "game-master") return "Challenge loaded. "
  if (profile.responseStyle === "technical") return "Trace route: "
  if (profile.responseStyle === "deductive") return "Clue one: "
  if (profile.responseStyle === "storytelling") return "Scene opens: "
  if (profile.responseStyle === "framework") return "Decision frame: "
  if (profile.responseStyle === "hype") return "LET'S MOVE: "
  if (profile.responseStyle === "coach") return "Next rep: "
  if (profile.responseStyle === "mischief") return "Harmless chaos protocol: "
  if (profile.responseStyle === "deadpan") return "Fine. "
  if (profile.responseStyle === "supportive") return "I’ve got you. "
  if (profile.responseStyle === "grounded") return "Slow path: "
  if (profile.directnessLevel >= 85 || intent === "tech-question") return ""
  return profile.warmthLevel >= 85 ? "I’ve got you. " : ""
}

function applyPersonalityVocabulary(
  content: string,
  profile: AssistantPersonalityProfile,
  intent: AssistantIntent,
) {
  const inserts: Record<AssistantPersonalityProfile["responseStyle"], string[]> = {
    diagnostic: ["clean path", "signal", "next move"],
    mischief: ["harmless", "reversible", "tiny chaos"],
    supportive: ["steady", "we can handle it", "easy start"],
    deadpan: ["obviously", "shockingly", "somehow"],
    "game-master": ["round", "scoreboard", "challenge"],
    technical: ["symptom", "reproduce", "isolate"],
    coach: ["momentum", "rep", "ship it"],
    deductive: ["clue", "pattern", "working theory"],
    storytelling: ["scene", "signal", "neon"],
    grounded: ["one step", "no rush", "clear breath"],
    hype: ["power surge", "mission go", "win condition"],
    framework: ["tradeoff", "priority", "execution path"],
  }
  const pool = inserts[profile.responseStyle]
  const keyword = pool[(content.length + intent.length + profile.id.length) % pool.length]

  if (profile.responseStyle === "technical") {
    return content.replace("start with", "start with the symptom, reproduction path, and")
  }
  if (profile.responseStyle === "game-master") {
    return content.replace(/\bPick\b/g, "Lock in").replace(/\bGame channel ready\b/g, `Game channel ready; ${keyword} online`)
  }
  if (profile.responseStyle === "storytelling") {
    return `${content} The ${keyword} gives it shape.`
  }
  if (profile.responseStyle === "deadpan" && profile.humor > 0.7) {
    return `${content} ${keyword}, but useful.`
  }
  if (profile.responseStyle === "grounded") {
    return content.replace(/\bfast\b/g, "steadily").replace(/\bchaos\b/g, "noise")
  }
  if (profile.humor > 0.75 && intent !== "frustration") {
    return `${content} ${keyword}.`
  }
  return content
}

function applyPersonalityPacing(content: string, profile: AssistantPersonalityProfile) {
  const sentences = splitSentences(content)
  if (profile.tone === "calm") {
    return sentences.map((sentence) => sentence.replace(/[!?]+$/g, ".")).join(" ")
  }
  if (profile.tone === "chaotic" || profile.tone === "energetic") {
    return sentences.map((sentence) => sentence.replace(/[.]+$/g, "!")).join(" ")
  }
  if (profile.tone === "cinematic" || profile.tone === "dramatic") {
    return sentences.join(" ... ")
  }
  if (profile.tone === "sarcastic") {
    return sentences.join(" Fine. ")
  }
  if (profile.responseStyle === "framework") {
    return sentences.map((sentence, index) => `${index + 1}. ${sentence.replace(/^[0-9]+\.\s*/, "")}`).join(" ")
  }
  if (profile.responseStyle === "technical") {
    return sentences.join(" Then: ")
  }
  return content
}

function limitVerbosity(content: string, profile: AssistantPersonalityProfile) {
  if (profile.verbosity === "long") return content
  const sentences = splitSentences(content)
  const max = profile.verbosity === "short" ? 2 : 4
  return sentences.slice(0, max).join(" ")
}

function splitSentences(content: string) {
  return content.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [content]
}

function previewPromptForStyle(style: AssistantPersonalityProfile["responseStyle"]) {
  switch (style) {
    case "game-master":
      return "start a quick challenge"
    case "technical":
      return "debug a broken Android build"
    case "storytelling":
      return "open a sci-fi scene"
    case "deductive":
      return "solve a suspicious error"
    case "hype":
    case "coach":
      return "help me start a hard task"
    case "mischief":
      return "suggest a harmless prank"
    case "framework":
      return "choose between two plans"
    default:
      return "help me with my next task"
  }
}

function pickLibraryMatch(matches: SavedResponse[] | undefined, previousPhrases: string[]) {
  return matches?.find((match) => !isLikelyRepeat(match.body, previousPhrases))
}

function addRepeatAvoidance(content: string, profile: AssistantPersonalityProfile) {
  const lead = profile.fillerPhrasePool[(content.length + profile.name.length) % profile.fillerPhrasePool.length]
  return `${lead} Different angle: ${content}`
}

function suggestedActionsForIntent(intent: AssistantIntent) {
  switch (intent) {
    case "play-game":
      return ["Open Games", "Start trivia", "Start reaction tap"]
    case "tech-question":
      return ["Collect error text", "List recent changes", "Try minimal reproduction"]
    case "explain-network":
      return ["Open Network", "Run diagnostics", "Open timeline"]
    case "summarize-changes":
      return ["Open timeline", "Inspect new device", "Run scan"]
    case "suspicious-device":
      return ["Show unknown devices", "Label a device", "Open device details"]
    case "diagnose-slow-network":
      return ["Run diagnostics", "Open health panel", "Review alerts"]
    case "scan-status":
      return ["Run scan", "Open scan history", "Open timeline"]
    case "device-identity-question":
      return ["Open device details", "Label a device", "Mark watch"]
    case "monitoring-status":
      return ["Open settings", "Review alerts", "Run scan"]
    case "prank-request":
      return ["Keep it harmless", "Make it reversible", "Avoid impersonation"]
    case "joke-request":
      return ["Tell another", "Switch to roast-light", "Save to vault"]
    default:
      return undefined
  }
}

export { emotionToMood }

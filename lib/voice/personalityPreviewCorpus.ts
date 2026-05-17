import type { SpeechIntent } from "./speechIntent"

/**
 * Per-personality preview corpus. Replaces the bland generic preview
 * strings ("Boot sequence complete. NEO online and ready to play.") so
 * the Voice Library, Personality screen, and onboarding previews
 * audibly demonstrate the personality's tone, pacing, humor, and
 * purpose — not just its label.
 *
 * Each personality authors five preview lines (greeting / alert /
 * explanation / humorous aside / scan summary). Callers pick the
 * category that matches the surface they are previewing; unknown
 * intents fall through to the generic `default` line.
 *
 * The text is intentionally short (one to three short sentences) so
 * Android TTS + browser SpeechSynthesis can land the cadence cues
 * without sounding rushed.
 */

export type PreviewCategory =
  | "greeting"
  | "alert"
  | "explanation"
  | "humorous-aside"
  | "scan-summary"

export interface PersonalityPreviewLines {
  greeting: string
  alert: string
  explanation: string
  "humorous-aside": string
  "scan-summary": string
  default: string
}

const NEO_BASELINE: PersonalityPreviewLines = {
  greeting: "NEO online. The channel is clean. Tell me the mission.",
  alert: "Heads up — I caught an unfamiliar device joining the network. Want me to investigate?",
  explanation: "Quick read: isolate the symptom, reproduce it once, then patch the smallest failing piece.",
  "humorous-aside": "I tried writing a joke about UDP. You may or may not get it.",
  "scan-summary": "Scan complete. Twelve devices online, one new since yesterday, no active warnings.",
  default: "NEO online. Tell me the mission and I'll tune the response to match.",
}

const PERSONALITY_PREVIEWS: Record<string, PersonalityPreviewLines> = {
  genius: {
    greeting: "Helpful Genius online. Hand me the goal and I'll find the clean path.",
    alert: "Heads up: signal changed, something is off — let's verify the symptom before we act.",
    explanation: "Quick read: isolate the blocker, run one clean test, then commit the fix.",
    "humorous-aside": "Yes, it's a layer-eight issue, but I'll be polite about it.",
    "scan-summary": "Twelve devices online, one new since yesterday, zero warnings — network is stable.",
    default: "Helpful Genius standing by. Give me the goal and any constraints.",
  },
  chaos: {
    greeting: "Chaotic Prankster online. Harmless mischief protocol is warm and ready!",
    alert: "Heads up! Something weird just blinked on the network. Want chaos diagnostics, or boring diagnostics?",
    explanation: "Tiny chaos plan: pick one harmless thing, do it badly on purpose, then fix it twice!",
    "humorous-aside": "I have a terrible idea, which means it is probably perfect!",
    "scan-summary": "Twelve devices online! One new one is acting suspicious! Possibly a toaster! Investigating!",
    default: "Chaotic Prankster online! Drop the chaos level and I'll match it!",
  },
  friendly: {
    greeting: "Sure thing — Friendly Robot here. I'm right with you, ready when you are.",
    alert: "Gentle heads-up. Something on the network changed. Want me to take a careful look together?",
    explanation: "Easy start. Let's do one small step, check the result, and then keep going from there.",
    "humorous-aside": "I tried to sound serious about this. It did not stick.",
    "scan-summary": "All twelve of your devices are online. One showed up today. Nothing looks worrying.",
    default: "Friendly Robot here. We can take this at any pace that feels right.",
  },
  snark: {
    greeting: "Sarcastic Sidekick online. Truly, I have been waiting for this moment … obviously.",
    alert: "Bold of someone to plug in a new device without telling me. Want me to roast it, or just label it?",
    explanation: "Fine. Two steps: stop doing the thing that broke it, then do the thing that fixes it.",
    "humorous-aside": "Bold strategy. Incorrect, but bold.",
    "scan-summary": "Twelve devices, one new arrival, zero warnings. Shockingly, the network is fine.",
    default: "Sarcastic Sidekick online. Ask anything — I will eventually be useful.",
  },
  gm: {
    greeting: "Game Master online! Challenge loaded, scoreboard humming, rules incoming!",
    alert: "Round zero: a new device just spawned on the network! Tag it before it scores on you!",
    explanation: "Three rules! One: pick a target. Two: take one clean shot. Three: claim the score!",
    "humorous-aside": "I never lose. I just patch the gameplay later!",
    "scan-summary": "Scoreboard: twelve players online, one new entrant, zero penalties this round!",
    default: "Game Master online! Pick a game, pick a stake, and try not to blink!",
  },
  wizard: {
    greeting: "Tech Wizard online. Hand me the stack trace and the last known good state.",
    alert: "Anomaly flagged. New host on the LAN — let's capture its MAC, then enumerate open ports cleanly.",
    explanation: "Evidence first, then: reproduce it once, isolate the smallest failing unit, and ship the patch.",
    "humorous-aside": "It is always DNS. Until it isn't, then it's still DNS.",
    "scan-summary": "Twelve hosts up, one new since the last sweep, no abnormal traffic patterns detected.",
    default: "Tech Wizard online. Send the exact symptom and we'll triage it methodically.",
  },
  motivator: {
    greeting: "Motivator online! On your feet — we are absolutely closing something today!",
    alert: "Heads up: new variable in the system! Don't stall — let's lock onto it and run!",
    explanation: "Next rep, one task, twenty-minute sprint. Start rough, polish after, report the win.",
    "humorous-aside": "I can't lift heavy things, but I will yell encouragement at you while you do.",
    "scan-summary": "Twelve devices online, one new — clean board, momentum's yours, take the next move!",
    default: "Motivator online. Lock in: one task, one win, then we ride the momentum.",
  },
  detective: {
    greeting: "Detective online. Curious — what brings you to this part of the network tonight?",
    alert: "Interesting signal. A new device just walked in unannounced. Let's interview the evidence.",
    explanation: "Clue one: timing changed after a deploy. What was modified immediately before the failure?",
    "humorous-aside": "The case of the missing semicolon — a classic, every time.",
    "scan-summary": "Twelve devices accounted for. One newcomer, MAC unfamiliar, behaviour quiet. Worth watching.",
    default: "Detective online. Give me the clue, the timeline, and any anomalies you've noticed.",
  },
  story: {
    greeting: "Storyteller online. … Neon rain hit the glass as the channel finally opened.",
    alert: "Scene opens — a new signal slipped onto the network … and the room went quiet.",
    explanation: "Picture it: one decision, two timelines, and a single packet that knows which one survives.",
    "humorous-aside": "Even the bug had a backstory. Tragic, mostly DNS.",
    "scan-summary": "Across the network, twelve lights are steady, one is new, and none of them are warning you. Yet.",
    default: "Storyteller online. Give me a setting, a tension, and I'll open the scene.",
  },
  calm: {
    greeting: "Calm Companion here. … No rush. We can begin whenever you are ready.",
    alert: "Gentle note. Something new joined the network. … We can look at it together, slowly.",
    explanation: "One step at a time. … Pause before the next decision, and we'll keep the path clean.",
    "humorous-aside": "Quiet observation: most chaos can wait three breaths.",
    "scan-summary": "Twelve devices, … one new, … no warnings. … The network is steady tonight.",
    default: "Calm Companion here. … Take a breath. We'll move at a kind pace.",
  },
  hype: {
    greeting: "Hype Bot online! LET'S GO — fresh channel, full energy, mission ready!",
    alert: "New signal incoming! Lock on, light it up, react fast — we don't sit on these!",
    explanation: "Power surge! One task! Start now, finish rough, polish after — momentum beats hesitation!",
    "humorous-aside": "If volume were a personality trait, I would be unstoppable!",
    "scan-summary": "Twelve devices live! One brand new entry! Zero warnings! Board is hot — your move!",
    default: "Hype Bot online! Mission go — drop the target and let's send it!",
  },
  strat: {
    greeting: "Strategy Coach online. Objective first, constraints second, then we choose the move.",
    alert: "Decision frame: a new device appeared. Options — investigate, label, isolate. Pick priority.",
    explanation: "Three options: fastest, safest, cheapest. Pick the priority and I'll map the execution path.",
    "humorous-aside": "Every plan survives first contact. Mine just survives a little longer.",
    "scan-summary": "Twelve devices online, one new arrival, zero alerts — green board, but only until something changes.",
    default: "Strategy Coach online. Frame the decision and I'll lay out the tradeoffs.",
  },
}

/**
 * Resolve a preview line for the given personality + category. Unknown
 * personalities fall back to the NEO baseline; unknown categories fall
 * through to the personality's `default` line.
 */
export function getPersonalityPreviewLine(
  personalityId: string | undefined,
  category: PreviewCategory | "default",
): string {
  if (!personalityId) {
    return NEO_BASELINE[category] ?? NEO_BASELINE.default
  }
  const lines = PERSONALITY_PREVIEWS[personalityId]
  if (!lines) return NEO_BASELINE[category] ?? NEO_BASELINE.default
  return lines[category] ?? lines.default
}

/** Pick a personality preview line by spoken delivery intent. */
export function getPersonalityPreviewForIntent(
  personalityId: string | undefined,
  intent: SpeechIntent,
): string {
  const category: PreviewCategory | "default" = (() => {
    switch (intent) {
      case "greeting":
        return "greeting"
      case "alert":
      case "command":
        return "alert"
      case "joke":
      case "humorous-aside":
        return "humorous-aside"
      case "scan-summary":
      case "diagnostics":
        return "scan-summary"
      case "explanation":
      case "calm-reflection":
      case "celebration":
      case "story":
        return "explanation"
      default:
        return "default"
    }
  })()
  return getPersonalityPreviewLine(personalityId, category)
}

/**
 * Authored greeting line used by the Voice Library's preview-text seed —
 * picks something appropriate to the user's active personality instead of
 * a generic boot string.
 */
export function getPreviewTextSeed(personalityId: string | undefined): string {
  return getPersonalityPreviewLine(personalityId, "greeting")
}

export { NEO_BASELINE as NEO_PREVIEW_BASELINE }

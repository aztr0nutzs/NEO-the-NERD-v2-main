import {
  applyPersonalitySpeechShaping,
  describePersonalityForProvider,
} from "@/lib/voice/personalitySpeechShaping"
import { getPersonalityPreviewLine, type PreviewCategory } from "@/lib/voice/personalityPreviewCorpus"
import type { SpeechIntent } from "@/lib/voice/speechIntent"

const PERSONS = ["genius", "snark", "calm", "gm", "detective"]
const INTENTS: SpeechIntent[] = [
  "greeting",
  "explanation",
  "joke",
  "alert",
  "scan-summary",
]
const CATS: PreviewCategory[] = [
  "greeting",
  "alert",
  "explanation",
  "humorous-aside",
  "scan-summary",
]

const SAMPLE = "Network scan complete. Twelve devices online, no warnings."

console.log("=== STRATEGIC + TECHNICAL SHAPING REGRESSIONS ===")
const stratSamples = [
  "Three options: fastest, safest, cheapest. Pick the priority.",
  "Pick fast, safe, or cheap.",
  "Choose options and constraints.",
]
for (const s of stratSamples) {
  const out = applyPersonalitySpeechShaping(s, "strat", "explanation")
  console.log(`  STRAT IN : ${s}\n  STRAT OUT: ${out.text}\n`)
}
const techSamples = [
  "Reproduce the failure. Next, isolate the smallest failing unit. Then, ship the patch.",
  "Trace the logs. Then dig into the symptom. After that test the fix.",
  "Capture the error. Next: open the stack trace.",
]
for (const s of techSamples) {
  const out = applyPersonalitySpeechShaping(s, "wizard", "explanation")
  console.log(`  TECH IN : ${s}\n  TECH OUT: ${out.text}\n`)
}

console.log("=== PERSONALITY SHAPING: SARCASTIC NUANCE ===")
const sarcasticSamples = [
  "Boot complete. Devices online. Try not to break anything important today.",
  "This is a great plan, obviously.",
  "Network is healthy.",
  // Doubles-up regression: if the snark personality has appended its tail,
  // the snark voice profile must NOT re-append "...obviously.".
  "Network is healthy, … obviously.",
]
for (const s of sarcasticSamples) {
  const out = applyPersonalitySpeechShaping(s, "snark", "joke")
  console.log(`  IN : ${s}\n  OUT: ${out.text}\n`)
}

console.log("=== AVOID-DOUBLE-PUNCT REGRESSION ===")
const dupSamples = [
  "Hello..  World.",
  "Wait,, what?",
  "Stop!! Now!!",
  "Fine. Then we go.",
]
for (const s of dupSamples) {
  const out = applyPersonalitySpeechShaping(s, "genius", "default")
  console.log(`  IN : ${s}\n  OUT: ${out.text}\n`)
}

console.log("=== PERSONALITY SHAPING (single input across personalities + intents) ===")
for (const id of PERSONS) {
  console.log(`[${id}]`)
  for (const intent of INTENTS) {
    const { text, shaping } = applyPersonalitySpeechShaping(SAMPLE, id, intent)
    console.log(`  ${intent.padEnd(13)} -> [${shaping}] ${text}`)
  }
}

console.log("\n=== PERSONALITY PREVIEW CORPUS ===")
for (const id of PERSONS) {
  console.log(`[${id}]`)
  for (const cat of CATS) {
    console.log(`  ${cat.padEnd(15)}: ${getPersonalityPreviewLine(id, cat)}`)
  }
}

console.log("\n=== PROVIDER INSTRUCTIONS ===")
for (const id of PERSONS) {
  for (const intent of INTENTS) {
    console.log(`[${id}/${intent}] -> ${describePersonalityForProvider(id, intent)}`)
  }
}

/**
 * NEO Mischief Messages — local template engine.
 *
 * Deterministic, offline-friendly generator that picks a phrasing template
 * for the requested category and tone, expands any `{slot}` placeholders
 * from category-specific word pools, and returns a ready-to-speak prank
 * message. No provider/AI dependency — keeps the feature working in airplane
 * mode and on the local fallback voice runtime.
 */

export type PrankMessageToneId =
  | "mild"
  | "goofy"
  | "chaotic"
  | "dramatic"
  | "savage_lite"

export interface PrankMessageTone {
  id: PrankMessageToneId
  label: string
  hint: string
  accent: string
  intensity: 1 | 2 | 3 | 4 | 5
}

export interface PrankMessageCategory {
  id: string
  label: string
  blurb: string
  accent: string
  emoji?: string
  recommendedVoiceTag?: string
  templates: Record<PrankMessageToneId, string[]>
}

export interface GeneratedPrankMessage {
  text: string
  categoryId: string
  toneId: PrankMessageToneId
  personalityId?: string
}

export interface PrankMessageRequest {
  categoryId: string
  toneId: PrankMessageToneId
  personalityId?: string
  // Optional list of recently generated texts (for the same category) so the
  // engine can avoid an immediate repeat when the user mashes "regenerate".
  recentTexts?: readonly string[]
}

export const PRANK_MESSAGE_TONES: readonly PrankMessageTone[] = [
  { id: "mild",        label: "Mild",        hint: "Lightly cheeky",     accent: "#00f0ff", intensity: 1 },
  { id: "goofy",       label: "Goofy",       hint: "Cartoon energy",     accent: "#39ff14", intensity: 2 },
  { id: "chaotic",     label: "Chaotic",     hint: "Unhinged but safe",  accent: "#b829ff", intensity: 3 },
  { id: "dramatic",    label: "Dramatic",    hint: "Movie-trailer mode", accent: "#ff7a00", intensity: 4 },
  { id: "savage_lite", label: "Savage Lite", hint: "Roast with love",    accent: "#ff2d9c", intensity: 5 },
]

// Reusable slot pools. Kept playful — no targeting real people or groups.
const SLOTS = {
  noun: [
    "the fridge", "your router", "this hallway", "the printer", "the toaster",
    "your group chat", "the WiFi", "the office plant", "your hoodie", "the couch",
    "the parking lot", "your keyboard", "every elevator", "the smart bulb",
  ],
  weirdNoun: [
    "a sentient stapler", "an off-brand AI", "three confused raccoons",
    "the ghost of an old Bluetooth speaker", "a haunted toaster",
    "the building's HVAC", "a rogue smart-fridge", "your charging cable",
  ],
  verb: [
    "rebooting", "calibrating", "rebranding", "negotiating with",
    "audibly judging", "rerouting", "encrypting", "speed-running",
  ],
  adj: [
    "mildly suspicious", "extremely passive-aggressive", "low-key feral",
    "absolutely unhinged", "weirdly polite", "industrial-strength",
    "competitively chaotic",
  ],
  number: ["3", "7", "42", "404", "1138", "12,000"],
  duration: ["six seconds", "the next 90 seconds", "an entire weekend", "until further notice"],
}

type Pool = keyof typeof SLOTS

function pickFrom<T>(arr: readonly T[], avoid?: ReadonlySet<T>): T {
  if (!arr.length) throw new Error("empty pool")
  if (!avoid || avoid.size === 0) return arr[Math.floor(Math.random() * arr.length)]
  const filtered = arr.filter((x) => !avoid.has(x))
  const pool = filtered.length ? filtered : arr
  return pool[Math.floor(Math.random() * pool.length)]
}

function expand(template: string): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const pool = SLOTS[key as Pool]
    if (!pool) return `{${key}}`
    return pickFrom(pool)
  })
}

/* -------------------- categories -------------------- */

export const PRANK_MESSAGE_CATEGORIES: readonly PrankMessageCategory[] = [
  {
    id: "system_alert",
    label: "Absurd System Alert",
    blurb: "Fake tech-y notifications that sound official until you read them twice.",
    accent: "#00f0ff",
    emoji: "⚠",
    recommendedVoiceTag: "robot",
    templates: {
      mild: [
        "Heads up: {noun} just requested a 30-second self-reflection break.",
        "Notice: {noun} is {verb} and will resume shortly.",
        "Reminder: {noun} would like to be acknowledged today.",
      ],
      goofy: [
        "Beep boop. {noun} has filed a formal complaint about {weirdNoun}.",
        "System advisory: {weirdNoun} is currently {verb} {noun}. Stand by.",
        "ALERT: {noun} has been replaced with {weirdNoun} for {duration}.",
      ],
      chaotic: [
        "CRITICAL: {weirdNoun} achieved sentience and is {verb} {noun}.",
        "{number} unauthorized vibes detected near {noun}. Containment failed.",
        "WARNING: {noun} is now {adj} and refuses to negotiate.",
      ],
      dramatic: [
        "This is not a drill. {noun} has gone offline. The ritual begins now.",
        "Final transmission from {noun}: 'tell my warranty I tried.'",
        "Brace yourselves. {weirdNoun} has assumed control of {noun}.",
      ],
      savage_lite: [
        "{noun} has reviewed your decisions today and would like a word.",
        "{noun} demands an apology. {noun} will not say for what.",
        "Performance review for {noun}: pending. Vibes: {adj}.",
      ],
    },
  },
  {
    id: "dramatic_announcement",
    label: "Dramatic Announcement",
    blurb: "Movie-trailer voice, kitchen-table stakes.",
    accent: "#ff7a00",
    emoji: "📣",
    recommendedVoiceTag: "narrator",
    templates: {
      mild: [
        "In a world… where {noun} runs out of battery at the worst moment…",
        "Tonight. {noun}. Strikes back.",
        "And then, against all odds, {noun} learned how to behave.",
      ],
      goofy: [
        "Coming this fall: one toaster. One dream. {weirdNoun}.",
        "They said it couldn't be done. {noun}, the musical.",
        "Based on a true story: the time {noun} tried to win an argument with {weirdNoun}.",
      ],
      chaotic: [
        "Tonight only: {weirdNoun} versus {noun}. Loser does the dishes.",
        "Breaking. {noun} has crossed the line. {weirdNoun} has receipts.",
        "There were rules. {noun} ignored them. Now there are {number} consequences.",
      ],
      dramatic: [
        "Long ago, before the {noun} betrayed us, the kingdom was at peace.",
        "Some legends are written. Others are {verb}. This one… is both.",
        "The prophecy was clear: when {noun} fails, only {weirdNoun} can answer.",
      ],
      savage_lite: [
        "In a world of average {noun}, one stands out. Sadly, not yours.",
        "Tonight, on a very special episode: {noun} learns boundaries. Maybe.",
        "From the producers of 'why is it doing that,' a new saga: {noun}.",
      ],
    },
  },
  {
    id: "sarcastic_comment",
    label: "Sarcastic Comeback",
    blurb: "Dry, mildly judgmental replies for any group chat.",
    accent: "#b829ff",
    emoji: "🙃",
    templates: {
      mild: [
        "Wow. That was a choice. Bold of you.",
        "Cool plan. Have you tried it on someone else first?",
        "I love how confidently incorrect that was.",
      ],
      goofy: [
        "And the award for 'most unprompted opinion of the week' goes to… you. Again.",
        "Imagine being that wrong on purpose. I'm so proud.",
        "Hold on, I'm taking notes. This will be a great cautionary tale.",
      ],
      chaotic: [
        "I'd argue but I'm trying to lower my heart rate this week.",
        "That's not a sentence, that's a cry for help with extra steps.",
        "I respect the chaos. I do not respect the spelling.",
      ],
      dramatic: [
        "Generations from now they will study what you just said. Not kindly.",
        "Even {noun} winced at that. Think about it.",
        "And on the {number}th day, you said that. The vibes have not recovered.",
      ],
      savage_lite: [
        "I gave that response {number}/10. The {number} is the typos.",
        "I'm sending this to {noun}. {noun} deserves to laugh today too.",
        "Genuinely impressed. Most people give up before reaching that take.",
      ],
    },
  },
  {
    id: "motivational_nonsense",
    label: "Motivational Nonsense",
    blurb: "Hype-poster energy that means absolutely nothing.",
    accent: "#39ff14",
    emoji: "💪",
    templates: {
      mild: [
        "You miss {number} percent of the snacks you don't eat. — {noun}.",
        "Believe in yourself. {noun} certainly doesn't, so someone has to.",
        "Today's mood: {adj}. Tomorrow's mood: probably the same, honestly.",
      ],
      goofy: [
        "Be the {weirdNoun} you wish to see in {noun}.",
        "If at first you don't succeed, blame {noun}, then blame {weirdNoun}.",
        "Wake up. Hydrate. Confuse {noun}. Repeat.",
      ],
      chaotic: [
        "Inhale courage. Exhale {weirdNoun}. Repeat for {duration}.",
        "Today, choose violence. Mild violence. Like cancelling a meeting.",
        "You are not behind. {noun} is just unusually fast and that's not your fault.",
      ],
      dramatic: [
        "Rise. The hour of {noun} demands a hero. Maybe even you.",
        "Every legend begins with a single, terrible idea. Yours is right on schedule.",
        "Step forward. {noun} is watching. {noun} has notes.",
      ],
      savage_lite: [
        "Live, laugh, leave {noun} on read.",
        "Manifesting your wins. Also manifesting that {noun} stops doing whatever that is.",
        "If you can dream it, you can probably also blame {noun} for it.",
      ],
    },
  },
  {
    id: "fake_warning",
    label: "Fake Warning",
    blurb: "Faux-official cautions to leave on someone's desk or screen.",
    accent: "#ff2d9c",
    emoji: "🚧",
    templates: {
      mild: [
        "Caution: {noun} is {adj}. Approach with snacks.",
        "Notice: {noun} requires {number} additional compliments before continuing.",
        "Please do not feed {noun}. {noun} is already full of opinions.",
      ],
      goofy: [
        "Warning: {weirdNoun} detected in {noun}. Slowly back away while humming.",
        "Hazard: {noun} is {verb}. Side effects include mild confusion and snack cravings.",
        "Do not stare directly at {noun}. {noun} will take it personally.",
      ],
      chaotic: [
        "DANGER: {noun} has formed an alliance with {weirdNoun}. Trust no plug.",
        "BIOHAZARD: {noun} is now {adj}. Quarantine has been suggested by {weirdNoun}.",
        "EVACUATE: {noun} just opened a group chat. Survival rate: {number}%.",
      ],
      dramatic: [
        "Final warning. {noun} will not ask twice. {noun} has already started timing you.",
        "By order of {weirdNoun}, {noun} is sealed for {duration}. Do not test fate.",
        "The {number} signs have appeared. {noun} is preparing.",
      ],
      savage_lite: [
        "Achievement unlocked: {noun} is judging you. Again.",
        "Notice: {noun} would like to remind you that you owe {noun} an apology.",
        "Disclaimer: opinions of {noun} do not reflect those of {weirdNoun}, but probably should.",
      ],
    },
  },
  {
    id: "playful_roast",
    label: "Playful Roast",
    blurb: "Friend-tier ribbing — keeps it warm.",
    accent: "#ffd84d",
    emoji: "🔥",
    templates: {
      mild: [
        "I would describe your last move as {adj}. With love.",
        "Genuinely curious what your decision-making process looked like there.",
        "Not your worst idea. Definitely top {number}, though.",
      ],
      goofy: [
        "If chaos had a mascot, you'd be in the running. Behind {weirdNoun}.",
        "You and {noun} have the same energy today, and {noun} is unplugged.",
        "I'm not saying you peaked, but {noun} has more recent achievements.",
      ],
      chaotic: [
        "You bring big 'I read the manual after assembly' energy.",
        "Watching you make that decision was like watching {noun} try to high-five {weirdNoun}.",
        "You make {adj} look like a personality trait. It's working, I guess.",
      ],
      dramatic: [
        "In the gallery of your life, that moment will hang next to 'kid loses balloon.'",
        "Bards will sing of this. Quietly. To themselves. In another room.",
        "When the credits roll on today, your line will be: 'wait, what?'",
      ],
      savage_lite: [
        "You're doing great. {noun} is doing better, but you're doing great.",
        "Confidence-to-correctness ratio today: {number} to one. Inspiring stuff.",
        "Honestly? Iconic. Wrong. But iconic.",
      ],
    },
  },
]

export function getPrankMessageCategory(id: string): PrankMessageCategory | undefined {
  return PRANK_MESSAGE_CATEGORIES.find((c) => c.id === id)
}

export function getPrankMessageTone(id: PrankMessageToneId): PrankMessageTone | undefined {
  return PRANK_MESSAGE_TONES.find((t) => t.id === id)
}

/* -------------------- personality flavor -------------------- */

/**
 * Light personality-aware seasoning. We avoid pretending the local engine
 * deeply understands NEO's personality system — instead, we apply a short
 * prefix or suffix that nods to the active personality without distorting
 * the generated message itself.
 */
const PERSONALITY_FLAVOR: Record<string, { prefix?: string; suffix?: string }> = {
  snark: { suffix: " …obviously." },
  chaos: { prefix: "CHAOS LOG: " },
  hype: { prefix: "LET'S GO — " },
  calm: { prefix: "Gentle note: " },
  detective: { prefix: "Case file note: " },
  gm: { prefix: "★ PLAYER 1 SAYS: " },
  friendly: { prefix: "Friendly reminder: " },
  motivator: { prefix: "PEP TALK — " },
  story: { prefix: "Once upon a glitch, " },
  genius: { prefix: "FYI: " },
  wizard: { prefix: "Diagnostic: " },
  strat: { prefix: "Strategic memo: " },
}

function seasonForPersonality(text: string, personalityId?: string): string {
  if (!personalityId) return text
  const flavor = PERSONALITY_FLAVOR[personalityId]
  if (!flavor) return text
  const prefix = flavor.prefix ?? ""
  const suffix = flavor.suffix ?? ""
  return `${prefix}${text}${suffix}`
}

/* -------------------- generation -------------------- */

export function generatePrankMessage(req: PrankMessageRequest): GeneratedPrankMessage {
  const category = getPrankMessageCategory(req.categoryId) ?? PRANK_MESSAGE_CATEGORIES[0]
  const templates = category.templates[req.toneId] ?? category.templates.goofy
  const recent = new Set(req.recentTexts ?? [])

  // Pick a template that has not been the source of a recently shown message.
  // We compare templates by their raw form (pre-slot expansion) so the dedupe
  // is structural rather than depending on slot randomness.
  const recentTemplates = new Set<string>()
  for (const t of recent) {
    for (const tmpl of templates) {
      const head = tmpl.split("{")[0].slice(0, 12)
      if (head && t.includes(head)) recentTemplates.add(tmpl)
    }
  }
  const template = pickFrom(templates, recentTemplates)
  const expanded = expand(template)
  const text = seasonForPersonality(expanded, req.personalityId)

  return {
    text,
    categoryId: category.id,
    toneId: req.toneId,
    personalityId: req.personalityId,
  }
}

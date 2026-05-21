export type WyrTag = "chaos" | "games" | "weird" | "future" | "prank" | "lifestyle" | "cyber" | "social"

export interface WyrPair {
  a: string
  b: string
  tag: WyrTag
  reactA?: string
  reactB?: string
}

export const WYR_BANK: WyrPair[] = [
  { a: "Have neon footprints that fade after 10s", b: "Leave glowing digital confetti when you laugh", tag: "chaos", reactA: "Stealth profile.", reactB: "Party profile." },
  { a: "Win every trivia round for a year", b: "Never lose Rock-Paper-Scissors", tag: "games", reactA: "Encyclopedic confidence.", reactB: "Tactical intuition." },
  { a: "Talk in modem sounds for a day", b: "Glow softly whenever you lie", tag: "weird", reactA: "Retro chaos.", reactB: "Honesty enforced by physics." },
  { a: "Own a robot backpack that follows you", b: "Own hover sneakers with a 10cm lift", tag: "future", reactA: "Cargo gremlin.", reactB: "Style gremlin." },
  { a: "Launch harmless prank drones at parties", b: "Deploy hologram stickers that disappear in 60s", tag: "prank", reactA: "Aerial menace.", reactB: "Ephemeral artist." },
  { a: "Sleep 2 hours and feel perfect", b: "Need 12 hours nightly but dream in 4K", tag: "lifestyle", reactA: "Productivity demon.", reactB: "Cinematic dreamer." },
  { a: "Always know one extra fact than the smartest person in the room", b: "Always have one perfect joke for the moment", tag: "social", reactA: "Quiet flex.", reactB: "Crowd worker." },
  { a: "Type at 200 wpm but only on a phone", b: "Speak 4 languages but forget words randomly", tag: "weird", reactA: "Mobile menace.", reactB: "Polyglot glitch." },
  { a: "Have a chrome arm with a built-in flashlight", b: "Have eyes that subtly change color with mood", tag: "cyber", reactA: "Utility cyborg.", reactB: "Mood-ring upgrade." },
  { a: "Replace your alarm with NEO's trash talk", b: "Replace your phone ringtone with arcade victory jingles", tag: "lifestyle", reactA: "Adrenaline mornings.", reactB: "Constant celebration." },
  { a: "Have a personal hologram tutor", b: "Have a personal hologram DJ", tag: "future", reactA: "Knowledge mode.", reactB: "Vibe mode." },
  { a: "Always pick the same option twice in a row when offered", b: "Always switch on the second offer", tag: "social", reactA: "Loyalist.", reactB: "Restless type." },
  { a: "Be invisible for 10 minutes once a day", b: "Be teleportable 1 meter every minute", tag: "future", reactA: "Sneak ops.", reactB: "Micro-warp specialist." },
  { a: "Speak fluent emoji", b: "Write only in haiku", tag: "weird", reactA: "Symbol native.", reactB: "Five-seven-five enforcer." },
  { a: "Make every notification sound a tiny applause clap", b: "Make every notification sound a vinyl scratch", tag: "lifestyle", reactA: "Self-celebrating.", reactB: "DJ life." },
  { a: "Have a fridge that judges your snacks audibly", b: "Have a mirror that compliments your outfit on a delay", tag: "future", reactA: "Accountability.", reactB: "Vanity boost." },
  { a: "Pull harmless prank phone calls on robots", b: "Pull harmless pranks on smart fridges only", tag: "prank", reactA: "AI heckler.", reactB: "Appliance trickster." },
  { a: "Have an arcade cabinet in your bedroom", b: "Have a karaoke booth in your hallway", tag: "games", reactA: "Solo grinder.", reactB: "Party host." },
  { a: "Your handwriting glows under blacklight", b: "Your shadow lags behind you by half a second", tag: "weird", reactA: "Subtle flex.", reactB: "Reality drift." },
  { a: "Trade speed for accuracy", b: "Trade accuracy for speed", tag: "chaos", reactA: "Sniper.", reactB: "Brawler." },
  { a: "Have NEO read your texts in voice", b: "Have NEO summarize them in three words", tag: "cyber", reactA: "Performance reader.", reactB: "Headline mode." },
  { a: "Win small things often", b: "Win big things rarely", tag: "social", reactA: "Steady stack.", reactB: "Boom or bust." },
  { a: "Be excellent at one thing", b: "Be good at twenty things", tag: "lifestyle", reactA: "Specialist.", reactB: "Generalist." },
  { a: "Wake up in a cyberpunk megacity", b: "Wake up in a quiet solarpunk village", tag: "future", reactA: "Skyline person.", reactB: "Greenline person." },
]

export type WyrProfile = {
  name: string
  description: string
}

export function profileFor(history: string[], tagCounts: Record<string, number>): WyrProfile {
  const top = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  switch (top) {
    case "prank": return { name: "Mischief Architect", description: "You optimize for harmless chaos." }
    case "chaos": return { name: "Volatile Signal", description: "You enjoy entropy with style." }
    case "games": return { name: "Competitive Oracle", description: "You play to win, quietly." }
    case "cyber": return { name: "Chrome Romantic", description: "You'd take the upgrade." }
    case "future": return { name: "Forecast Hunter", description: "You bet on tomorrow." }
    case "lifestyle": return { name: "System Tuner", description: "You optimize the dailies." }
    case "weird": return { name: "Glitch Curator", description: "You collect strange." }
    case "social": return { name: "Crowd Cartographer", description: "You read the room first." }
    default: return { name: "Neon Wildcard", description: "Pattern undefined." }
  }
}

export interface HeistChoice {
  label: string
  stealth?: number
  trace?: number
  loot?: number
  hint?: string
}

export interface HeistScenario {
  id: string
  title: string
  prompt: string
  choices: HeistChoice[]
}

export const HEIST_SCENARIOS: HeistScenario[] = [
  {
    id: "lobby",
    title: "ENTRY · LOBBY",
    prompt: "Reception scans your credentials. The badge is half-forged.",
    choices: [
      { label: "Slip past the turnstile", stealth: -10, trace: +5, hint: "Light footprint" },
      { label: "Spoof a valid badge", stealth: 0, trace: +15, loot: +5, hint: "Loud on the network" },
      { label: "Bribe the guard", stealth: +5, trace: +5, loot: -10, hint: "Costs liquidity" },
    ],
  },
  {
    id: "elevator",
    title: "VERTICAL · ELEVATOR",
    prompt: "Service lift is keyed to floor 14. Cameras sweep on a 6-second loop.",
    choices: [
      { label: "Time the camera loop", stealth: +5, trace: 0 },
      { label: "Cut the camera feed", stealth: +10, trace: +20, hint: "Aggressive but quiet for now" },
      { label: "Take the stairs", stealth: -5, trace: -5, hint: "Slow and tiring" },
    ],
  },
  {
    id: "honeypot",
    title: "NETWORK · HONEYPOT",
    prompt: "An open share screams 'PAYROLL_FINAL_FINAL'. Suspicious.",
    choices: [
      { label: "Take the bait", trace: +30, loot: +30, hint: "Big prize, big alarm" },
      { label: "Ignore and pivot", stealth: +5, trace: -5 },
      { label: "Fingerprint the trap", stealth: +10, trace: +5, loot: +5 },
    ],
  },
  {
    id: "vault",
    title: "STORAGE · VAULT_A",
    prompt: "Encrypted cold storage. Brute force is loud, social is slow.",
    choices: [
      { label: "Brute force the lock", trace: +25, loot: +30 },
      { label: "Pull keys from RAM", stealth: -5, trace: +10, loot: +20, hint: "Skill move" },
      { label: "Tail an admin session", stealth: +10, trace: 0, loot: +10, hint: "Patient" },
    ],
  },
  {
    id: "ids",
    title: "SECURITY · IDS",
    prompt: "Intrusion detection is asking questions you can't answer twice.",
    choices: [
      { label: "Throttle traffic", stealth: +5, trace: -10, loot: -5 },
      { label: "Inject noise on another segment", stealth: 0, trace: -15, hint: "Buys cover" },
      { label: "Hold and wait", stealth: -5, trace: -20, hint: "Loses tempo" },
    ],
  },
  {
    id: "social",
    title: "HUMAN · CALL",
    prompt: "Help desk picks up. They sound suspicious.",
    choices: [
      { label: "Drop the call", stealth: 0, trace: +5 },
      { label: "Pretend to be the CTO", stealth: -5, trace: +10, loot: +15 },
      { label: "Apologize and reroute", stealth: +5, trace: -5 },
    ],
  },
  {
    id: "exfil",
    title: "EXFIL · TUNNEL",
    prompt: "Data is staged. Outbound tunnel can run fast or quiet.",
    choices: [
      { label: "Burst exfil", trace: +30, loot: +25 },
      { label: "Slow drip", stealth: +5, trace: +5, loot: +10 },
      { label: "Use a relay", stealth: +10, trace: +0, loot: +15, hint: "Costs setup time" },
    ],
  },
  {
    id: "tail",
    title: "TAIL · CLEANUP",
    prompt: "Logs are screaming. Audit will know in minutes.",
    choices: [
      { label: "Scrub logs", stealth: +5, trace: -25 },
      { label: "Plant a decoy actor", stealth: +15, trace: -15, hint: "Frame nobody — paper trail only" },
      { label: "Leave and hope", trace: +5 },
    ],
  },
  {
    id: "patrol",
    title: "FLOOR · PATROL",
    prompt: "A roving security drone passes a corner. Its scanner is cold but blinks.",
    choices: [
      { label: "Crouch behind racks", stealth: +5, trace: 0 },
      { label: "Drop a noisemaker", stealth: +10, trace: +5 },
      { label: "Risk the open lane", stealth: -10, trace: +10, loot: +5 },
    ],
  },
  {
    id: "router",
    title: "INFRA · CORE ROUTER",
    prompt: "Core router exposes a debug port no one closed.",
    choices: [
      { label: "Mirror traffic quietly", stealth: +5, trace: 0, loot: +5 },
      { label: "Reflash firmware", stealth: -10, trace: +25, loot: +20, hint: "Powerful, ugly" },
      { label: "Walk away", trace: -5 },
    ],
  },
  {
    id: "badge",
    title: "PHYSICAL · BADGE",
    prompt: "An exec dropped their badge by the coffee bar.",
    choices: [
      { label: "Pocket and clone it", stealth: 0, trace: +10, loot: +15 },
      { label: "Photo and replace it", stealth: +10, trace: +5, loot: +5 },
      { label: "Ignore it", stealth: 0, trace: 0 },
    ],
  },
  {
    id: "alarm",
    title: "ALARM · FALSE FLAG",
    prompt: "You can trip an alarm in the lobby to pull security off your floor.",
    choices: [
      { label: "Trip the alarm", stealth: +20, trace: +15, hint: "Buys cover, costs cleanup" },
      { label: "Hold position", stealth: 0, trace: +5 },
    ],
  },
  {
    id: "wallet",
    title: "DATA · WALLET",
    prompt: "A misconfigured wallet service is sitting in a stale subnet.",
    choices: [
      { label: "Drain quickly", trace: +25, loot: +35 },
      { label: "Skim a small slice", stealth: 0, trace: +5, loot: +10, hint: "Hard to notice" },
      { label: "Mark for later", trace: 0, loot: 0 },
    ],
  },
  {
    id: "audit",
    title: "AUDIT · SCAN",
    prompt: "Compliance scan starts. You either look clean or look gone.",
    choices: [
      { label: "Mimic a janitor profile", stealth: +10, trace: -10 },
      { label: "Crash the scan", stealth: -10, trace: -25, hint: "Loud reset" },
      { label: "Stand still", stealth: 0, trace: +10 },
    ],
  },
  {
    id: "extract",
    title: "EXTRACT · ROOFTOP",
    prompt: "Rooftop pickup window is short. Sirens are still distant.",
    choices: [
      { label: "Move now", trace: +5, loot: 0 },
      { label: "Hold for full silence", stealth: +5, trace: +15 },
    ],
  },
]

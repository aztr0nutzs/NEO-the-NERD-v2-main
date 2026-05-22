export type Outcome = "win" | "lose" | "draw" | "neutral"

type Bank = Record<Outcome, string[]>

const TTT: Bank = {
  win: [
    "Round logged. NEO updates your threat tier.",
    "Crisp finish. NEO files it under 'lucky'.",
    "You took the round. NEO recalibrates.",
  ],
  lose: [
    "NEO takes the round. Standard procedure.",
    "Predicted. Logged. Catalogued.",
    "NEO closes the line. Try a fresh angle.",
  ],
  draw: [
    "Stalemate. Your logic core is suspiciously competent.",
    "Grid lock. NEO requests overtime.",
    "Tie game. Neither side blinked.",
  ],
  neutral: ["NEO is waiting. Begin the round."],
}

const RPS: Bank = {
  win: [
    "Clean read. NEO updates pattern weights.",
    "Counter landed. NEO is mildly impressed.",
    "Round to you. NEO is recalculating.",
  ],
  lose: [
    "Predicted. NEO reads your tells.",
    "Pattern locked. NEO punishes the habit.",
    "Cycle exploited. Diversify next throw.",
  ],
  draw: [
    "Mirror match. Reset and rethink.",
    "Mutual stall. NEO restarts the prediction matrix.",
    "Draw round. No data gained.",
  ],
  neutral: ["NEO prediction matrix idle."],
}

const MEMORY: Bank = {
  win: [
    "Grid cleared. NEO files your recall index.",
    "Pattern locked end to end. Clean run.",
    "Memory grid down. NEO marks a benchmark.",
  ],
  lose: [
    "Pattern drift detected.",
    "Misalignment. NEO logs the slip.",
    "Glitched recall. Recompose and retry.",
  ],
  draw: [],
  neutral: ["Match the symbols. NEO is timing you."],
}

const REACTION: Bank = {
  win: [
    "Reflex arc inside threshold. NEO is impressed.",
    "Neural lane is clean. Logged as benchmark.",
    "Reaction pass. NEO updates your reflex tier.",
  ],
  lose: [
    "Reflex outside threshold. NEO files a slow tag.",
    "Late on the trigger. NEO archives the lag.",
    "Off the mark. Recalibrate the trigger arm.",
  ],
  draw: [],
  neutral: ["Hold the tap. Trigger on the green pulse."],
}

const GUESS: Bank = {
  win: [
    "Target locked. NEO ends the scan.",
    "Range collapsed cleanly. NEO logs the solve.",
    "Found it. NEO recompiles the heat map.",
  ],
  lose: [
    "Scan failed. NEO reveals the target.",
    "Out of attempts. NEO retains the secret next round.",
    "Range never collapsed. NEO drops the channel.",
  ],
  draw: [],
  neutral: ["Pick a number. NEO will heat-map your guess."],
}

const BANKS: Record<string, Bank> = {
  tictactoe: TTT,
  rps: RPS,
  memory: MEMORY,
  reaction: REACTION,
  guess: GUESS,
}

export function quip(game: string, outcome: Outcome): string {
  const bank = BANKS[game]?.[outcome] ?? []
  if (bank.length === 0) return ""
  return bank[Math.floor(Math.random() * bank.length)]
}

export const REACTION_RATINGS = (avgMs: number): string =>
  avgMs === 0 ? "UNRATED" : avgMs < 240 ? "NEURAL" : avgMs < 340 ? "SHARP" : avgMs < 460 ? "SOLID" : avgMs < 600 ? "STEADY" : "SLUGGISH"

export const GUESS_RATING = (used: number, max: number): string =>
  used <= 2 ? "PRECISION" : used <= Math.ceil(max * 0.45) ? "TIGHT" : used <= Math.ceil(max * 0.75) ? "STEADY" : "VOLATILE"

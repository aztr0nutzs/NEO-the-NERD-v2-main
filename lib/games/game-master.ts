// Game Master commentary. Pure local string assembly; no backend, no API.
// Personality and trash-talk lightly bias which line gets picked.

export type GMEvent =
  | "first_win"
  | "new_record"
  | "streak_hot"
  | "streak_broken"
  | "daily_complete"
  | "achievement"
  | "loss_close"
  | "loss_blowout"
  | "level_up"

interface GMContext {
  personalityId: string
  trashTalk: boolean
}

const POOLS: Record<GMEvent, string[]> = {
  first_win: [
    "First win logged. NEO bumps your threat tier.",
    "Calibration successful. NEO files a new baseline.",
    "Win one of many — or so the prediction matrix hopes.",
  ],
  new_record: [
    "New personal best. NEO recalibrates the leaderboard.",
    "Benchmark updated. Old best filed under 'previously impressive'.",
    "Record set. NEO logs the timestamp with reluctant respect.",
  ],
  streak_hot: [
    "Streak intact. NEO is tracking the momentum.",
    "Pattern locked. Riding the spike.",
    "Three+ in a row — NEO is officially watching.",
  ],
  streak_broken: [
    "Streak snapped. NEO marks it on the timeline.",
    "Run ended. Resume training.",
  ],
  daily_complete: [
    "Daily cleared. NEO updates the day log.",
    "Daily challenge logged. Tomorrow brings new noise.",
    "Today's objective met. NEO is mildly satisfied.",
  ],
  achievement: [
    "Achievement unlocked. NEO files it in your dossier.",
    "Badge earned. NEO updates the prestige column.",
    "Milestone reached. Logged with quiet approval.",
  ],
  loss_close: [
    "Close one. NEO recommends one more attempt.",
    "Margin was thin. NEO flags this as a near-hit.",
  ],
  loss_blowout: [
    "Run scrubbed. NEO archives this attempt.",
    "Hard reset recommended. Coffee, then revenge.",
  ],
  level_up: [
    "Arcade level up. NEO promotes you in the cabinet.",
    "Level cleared. NEO updates your rank.",
    "Tier advanced. The cabinet glows brighter for you.",
  ],
}

// Trash-talk variants slot in instead of the base line ~30% of the time when the
// player has trashTalk enabled and the event has a punchier alt.
const TRASH_POOLS: Partial<Record<GMEvent, string[]>> = {
  first_win: ["Took you long enough. Don't let it be the last.", "NEO logs win #1. Tier-2 awaits."],
  new_record: ["New best. NEO is filing this in 'fluke or skill — TBD'.", "Record broken. Don't get smug."],
  streak_hot: ["Streak running. Do NOT touch anything weird.", "NEO is suspicious of your hot hand."],
  streak_broken: ["There it goes. Predictable.", "Run ended. NEO smirks in 4K."],
  loss_close: ["So close. NEO almost felt bad. Almost.", "Tight loss. NEO files it under 'cope'."],
  loss_blowout: ["Brutal. NEO archives this for training.", "Logged for the highlight reel — yours, not NEO's."],
}

// Personality bias: certain personas favor certain framings. We just tweak the
// selection probability by personality id. No NLP, no inference — explicit map.
const PERSONALITY_BIAS: Record<string, Partial<Record<GMEvent, string[]>>> = {
  hype: {
    new_record: ["LET'S GO. New record. NEO is hyped.", "RECORD! Did the cabinet just shake?", "BENCHMARK SHATTERED."],
    streak_hot: ["STREAK ON FIRE. Keep going.", "RIDE IT. Don't slow down."],
    level_up: ["LEVEL UP. The cabinet roars.", "TIER UP. Volume should be higher."],
    first_win: ["FIRST WIN. The arcade gods are listening.", "WIN. LET IT BE THE FIRST OF MANY."],
  },
  snark: {
    first_win: ["Won one. Adorable.", "Mark the calendar. It happened."],
    new_record: ["Record. Briefly impressive.", "New best, by the way."],
    loss_close: ["Almost. Try harder.", "So close, yet so cope."],
  },
  calm: {
    streak_hot: ["You're in flow. Breathe.", "Quiet streak. Don't overthink it."],
    loss_blowout: ["Reset. The next run is new.", "Let it pass. Try again."],
  },
  motivator: {
    loss_close: ["Almost had it. One more run.", "That was close — go again."],
    streak_broken: ["Streak ends. You're still good.", "Reset and rebuild."],
    level_up: ["Level up. You earned it.", "Higher tier. Keep climbing."],
  },
  chaos: {
    first_win: ["First win. NEO confetti.gif.", "Logged. Now do something weird."],
    streak_broken: ["Chaos restored.", "Pattern broken. NEO approves."],
  },
}

export function gmLine(event: GMEvent, ctx: GMContext): string {
  const personalityPool = PERSONALITY_BIAS[ctx.personalityId]?.[event]
  if (personalityPool && Math.random() < 0.55) {
    return personalityPool[Math.floor(Math.random() * personalityPool.length)]
  }
  const trashPool = TRASH_POOLS[event]
  if (ctx.trashTalk && trashPool && Math.random() < 0.3) {
    return trashPool[Math.floor(Math.random() * trashPool.length)]
  }
  const base = POOLS[event]
  return base[Math.floor(Math.random() * base.length)]
}

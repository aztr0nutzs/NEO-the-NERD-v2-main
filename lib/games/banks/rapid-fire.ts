export type RapidFireDifficulty = "EASY" | "ADAPTIVE" | "HARD"
export type RapidFireKind = "math" | "word" | "logic" | "neo"

export interface RapidFireItem {
  q: string
  a: string
  kind: RapidFireKind
  difficulty: RapidFireDifficulty
}

export const RAPID_FIRE_BANK: RapidFireItem[] = [
  // EASY · math
  { q: "5 + 4", a: "9", kind: "math", difficulty: "EASY" },
  { q: "7 + 6", a: "13", kind: "math", difficulty: "EASY" },
  { q: "12 - 5", a: "7", kind: "math", difficulty: "EASY" },
  { q: "3 * 4", a: "12", kind: "math", difficulty: "EASY" },
  { q: "20 / 4", a: "5", kind: "math", difficulty: "EASY" },
  { q: "15 - 9", a: "6", kind: "math", difficulty: "EASY" },
  // EASY · word
  { q: "Opposite of WIN", a: "LOSE", kind: "word", difficulty: "EASY" },
  { q: "Opposite of HOT", a: "COLD", kind: "word", difficulty: "EASY" },
  { q: "Opposite of FAST", a: "SLOW", kind: "word", difficulty: "EASY" },
  { q: "Plural of MOUSE (animal)", a: "MICE", kind: "word", difficulty: "EASY" },
  // EASY · logic
  { q: "True or false: 10 > 7", a: "TRUE", kind: "logic", difficulty: "EASY" },
  { q: "True or false: 0 is even", a: "TRUE", kind: "logic", difficulty: "EASY" },
  // EASY · neo
  { q: "NEO primary glow color", a: "CYAN", kind: "neo", difficulty: "EASY" },
  { q: "Yes or no: is NEO an assistant?", a: "YES", kind: "neo", difficulty: "EASY" },

  // ADAPTIVE · math
  { q: "12 - 7", a: "5", kind: "math", difficulty: "ADAPTIVE" },
  { q: "8 * 6", a: "48", kind: "math", difficulty: "ADAPTIVE" },
  { q: "15 + 27", a: "42", kind: "math", difficulty: "ADAPTIVE" },
  { q: "Binary of 3", a: "11", kind: "math", difficulty: "ADAPTIVE" },
  { q: "Binary of 5", a: "101", kind: "math", difficulty: "ADAPTIVE" },
  { q: "Half of 84", a: "42", kind: "math", difficulty: "ADAPTIVE" },
  { q: "Square root of 81", a: "9", kind: "math", difficulty: "ADAPTIVE" },
  // ADAPTIVE · word
  { q: "Plural of LEAF", a: "LEAVES", kind: "word", difficulty: "ADAPTIVE" },
  { q: "Five-letter word for a small bug", a: "ANT", kind: "word", difficulty: "ADAPTIVE" },
  // ADAPTIVE · logic
  { q: "Is 17 prime?", a: "YES", kind: "logic", difficulty: "ADAPTIVE" },
  { q: "Is 21 prime?", a: "NO", kind: "logic", difficulty: "ADAPTIVE" },
  // ADAPTIVE · neo
  { q: "React UI is built from", a: "COMPONENTS", kind: "neo", difficulty: "ADAPTIVE" },
  { q: "Dark side hex starts with which character?", a: "#", kind: "neo", difficulty: "ADAPTIVE" },

  // HARD · math
  { q: "9 * 7", a: "63", kind: "math", difficulty: "HARD" },
  { q: "13 * 11", a: "143", kind: "math", difficulty: "HARD" },
  { q: "Binary of 10", a: "1010", kind: "math", difficulty: "HARD" },
  { q: "Binary of 15", a: "1111", kind: "math", difficulty: "HARD" },
  { q: "256 / 4", a: "64", kind: "math", difficulty: "HARD" },
  { q: "Square root of 196", a: "14", kind: "math", difficulty: "HARD" },
  // HARD · logic
  { q: "Is 91 prime?", a: "NO", kind: "logic", difficulty: "HARD" },
  { q: "Is 83 prime?", a: "YES", kind: "logic", difficulty: "HARD" },
  { q: "Days in a leap February", a: "29", kind: "logic", difficulty: "HARD" },
  // HARD · neo
  { q: "Big-O of binary search", a: "O(LOG N)", kind: "neo", difficulty: "HARD" },
  { q: "HTTP secure variant", a: "HTTPS", kind: "neo", difficulty: "HARD" },
  { q: "Default Postgres port", a: "5432", kind: "neo", difficulty: "HARD" },
  { q: "Hex for full red", a: "FF0000", kind: "neo", difficulty: "HARD" },
]

const ACCEPT_ALIASES: Record<string, string[]> = {
  "TRUE": ["T", "Y", "YES"],
  "FALSE": ["F", "N", "NO"],
  "YES": ["Y", "TRUE", "T"],
  "NO": ["N", "FALSE", "F"],
  "O(LOG N)": ["LOG N", "OLOGN"],
  "FF0000": ["#FF0000"],
}

export function matchRapidAnswer(expected: string, actual: string): boolean {
  const a = actual.trim().toUpperCase().replace(/\s+/g, " ")
  const e = expected.toUpperCase()
  if (a === e) return true
  const aliases = ACCEPT_ALIASES[e]
  return aliases ? aliases.includes(a.replace(/\s+/g, "")) || aliases.includes(a) : false
}

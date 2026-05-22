export type WordCategory = "tech" | "neo" | "games" | "science" | "fun" | "general"
export type WordDifficulty = "EASY" | "ADAPTIVE" | "HARD"

export interface WordItem {
  word: string
  category: WordCategory
  difficulty: WordDifficulty
}

export const WORD_BANK: WordItem[] = [
  // EASY (4-5 letters)
  { word: "ROBOT", category: "tech", difficulty: "EASY" },
  { word: "NEON", category: "neo", difficulty: "EASY" },
  { word: "PIXEL", category: "games", difficulty: "EASY" },
  { word: "LASER", category: "science", difficulty: "EASY" },
  { word: "CABLE", category: "tech", difficulty: "EASY" },
  { word: "ALPHA", category: "general", difficulty: "EASY" },
  { word: "MOUSE", category: "tech", difficulty: "EASY" },
  { word: "VIRUS", category: "tech", difficulty: "EASY" },
  { word: "TOWER", category: "general", difficulty: "EASY" },
  { word: "CHIP", category: "tech", difficulty: "EASY" },
  { word: "GLOW", category: "neo", difficulty: "EASY" },
  { word: "ARCADE", category: "games", difficulty: "EASY" },

  // ADAPTIVE (6-8 letters)
  { word: "CYBER", category: "neo", difficulty: "ADAPTIVE" },
  { word: "KERNEL", category: "tech", difficulty: "ADAPTIVE" },
  { word: "MATRIX", category: "neo", difficulty: "ADAPTIVE" },
  { word: "PLASMA", category: "science", difficulty: "ADAPTIVE" },
  { word: "PYTHON", category: "tech", difficulty: "ADAPTIVE" },
  { word: "PACKET", category: "tech", difficulty: "ADAPTIVE" },
  { word: "QUANTUM", category: "science", difficulty: "ADAPTIVE" },
  { word: "DISPLAY", category: "tech", difficulty: "ADAPTIVE" },
  { word: "PROFILE", category: "general", difficulty: "ADAPTIVE" },
  { word: "CONSOLE", category: "games", difficulty: "ADAPTIVE" },
  { word: "FIREWALL", category: "tech", difficulty: "ADAPTIVE" },
  { word: "PRANK", category: "fun", difficulty: "ADAPTIVE" },
  { word: "HOLOGRAM", category: "neo", difficulty: "ADAPTIVE" },
  { word: "JOYSTICK", category: "games", difficulty: "ADAPTIVE" },

  // HARD (9+ letters)
  { word: "ALGORITHM", category: "tech", difficulty: "HARD" },
  { word: "HOLOGRAPHIC", category: "neo", difficulty: "HARD" },
  { word: "TELEMETRY", category: "science", difficulty: "HARD" },
  { word: "SYNTHESIS", category: "science", difficulty: "HARD" },
  { word: "CRYPTOGRAPHY", category: "tech", difficulty: "HARD" },
  { word: "BANDWIDTH", category: "tech", difficulty: "HARD" },
  { word: "MULTIPLAYER", category: "games", difficulty: "HARD" },
  { word: "INTERFACE", category: "tech", difficulty: "HARD" },
  { word: "SIMULATION", category: "science", difficulty: "HARD" },
  { word: "ARCHITECT", category: "general", difficulty: "HARD" },
  { word: "VAPORWAVE", category: "neo", difficulty: "HARD" },
  { word: "OBFUSCATE", category: "tech", difficulty: "HARD" },
]

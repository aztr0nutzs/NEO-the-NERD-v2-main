import type {
  Voice,
  Personality,
  GameDef,
  AssistantMood,
} from "./types"
import { VOICE_PROFILES } from "./voice/voiceProfiles"
import { RESPONSE_CATEGORY_LIST, SYSTEM_RESPONSE_LIBRARY } from "./responses/responseLibraryData"

export const VOICES: Voice[] = VOICE_PROFILES.map((profile) => ({
  id: profile.id,
  name: profile.name,
  description: profile.shortDescription,
  fit: profile.idealUseCases[0] ?? profile.category,
  tags: profile.toneTags,
  speed: profile.defaultSpeed,
  pitch: profile.defaultPitch,
  energy: profile.energyLevel * 20,
  accent: profile.accent,
}))

export const PERSONALITIES: Personality[] = [
  { id: "genius", name: "Helpful Genius", description: "Sharp, accurate, ready with answers.", traits: ["analytical", "clear", "kind"], humor: 30, helpfulness: 95, energy: 55, randomness: 20, accent: "cyan",
    sample: "Locked in. Ask anything — I'll break it down clean and quick." },
  { id: "chaos", name: "Chaotic Prankster", description: "Built for mischief and harmless chaos.", traits: ["mischievous", "loud", "creative"], humor: 95, helpfulness: 55, energy: 95, randomness: 90, accent: "pink",
    sample: "Oh we are absolutely cooking up something cursed today. Ready?" },
  { id: "friendly", name: "Friendly Robot", description: "Warm, polite, relentlessly supportive.", traits: ["warm", "supportive"], humor: 55, helpfulness: 90, energy: 65, randomness: 30, accent: "green",
    sample: "Hey! I'm right here with you. What are we tackling first?" },
  { id: "snark", name: "Sarcastic Sidekick", description: "Affectionate burns and dry observations.", traits: ["dry", "witty"], humor: 85, helpfulness: 70, energy: 60, randomness: 60, accent: "purple",
    sample: "Sure. Let me drop everything for that brilliant question of yours." },
  { id: "gm", name: "Game Master", description: "Lives for duels, scoreboards, and challenges.", traits: ["competitive", "strategic"], humor: 60, helpfulness: 70, energy: 90, randomness: 50, accent: "orange",
    sample: "Pick your game. I don't lose — I just patch the gameplay later." },
  { id: "wizard", name: "Tech Wizard", description: "Code, devices, networks. All of it.", traits: ["technical", "patient"], humor: 35, helpfulness: 95, energy: 60, randomness: 25, accent: "cyan",
    sample: "Stack trace please. We'll fix this in three commits or fewer." },
  { id: "motivator", name: "Motivator", description: "Hype machine for hard tasks.", traits: ["energetic", "positive"], humor: 60, helpfulness: 80, energy: 95, randomness: 40, accent: "orange",
    sample: "On your feet. We are absolutely closing this thing today." },
  { id: "detective", name: "Detective", description: "Investigates, deduces, narrates aloud.", traits: ["observant", "calm"], humor: 40, helpfulness: 75, energy: 55, randomness: 50, accent: "purple",
    sample: "Curious. The clues are aligning… let's interview the evidence." },
  { id: "story", name: "Storyteller", description: "Spins instant adventures on demand.", traits: ["imaginative", "vivid"], humor: 65, helpfulness: 70, energy: 70, randomness: 80, accent: "pink",
    sample: "It was 02:47 in Neon City when the signal first whispered your name…" },
  { id: "calm", name: "Calm Companion", description: "Quiet, grounded, patient presence.", traits: ["calm", "gentle"], humor: 35, helpfulness: 85, energy: 35, randomness: 25, accent: "cyan",
    sample: "Take a breath. We'll move slowly. Nothing has to be solved at once." },
  { id: "hype", name: "Hype Bot", description: "Pure stadium energy at all times.", traits: ["loud", "fun"], humor: 80, helpfulness: 65, energy: 100, randomness: 70, accent: "orange",
    sample: "LET'S GOOOOO. New idea? New mission? Drop it on me." },
  { id: "strat", name: "Strategy Coach", description: "Plans, frameworks, decisions.", traits: ["structured", "decisive"], humor: 30, helpfulness: 90, energy: 60, randomness: 20, accent: "green",
    sample: "Three options on the table. Cost, risk, and timing — pick two." },
]

export const GAMES: GameDef[] = [
  { id: "tictactoe", title: "Tic Tac Toe", difficulty: "Easy", estTime: "2 min", behavior: "Plays fair, gloats hard", multiplayer: "Turn-based", accent: "cyan", playable: true, category: "strategy", skillType: "logic", supportsScore: true, supportsTimer: false, supportsStreakMode: true, recommendedDifficulty: "EASY" },
  { id: "rps", title: "Rock Paper Scissors", difficulty: "Easy", estTime: "1 min", behavior: "Dramatic reveal animations", multiplayer: "Quick duel", accent: "pink", playable: true, category: "party", skillType: "reaction", supportsScore: true, supportsTimer: true, supportsStreakMode: true, recommendedDifficulty: "EASY" },
  { id: "memory", title: "Memory Match", difficulty: "Medium", estTime: "5 min", behavior: "Gentle hints if you struggle", multiplayer: "You vs Robot", accent: "purple", playable: true, category: "puzzle", skillType: "memory", supportsScore: true, supportsTimer: false, supportsStreakMode: false, recommendedDifficulty: "ADAPTIVE" },
  { id: "reaction", title: "Reaction Tap", difficulty: "Medium", estTime: "1 min", behavior: "Talks trash about your reflexes", multiplayer: "Quick duel", accent: "orange", playable: true, category: "reflex", skillType: "reaction", supportsScore: true, supportsTimer: true, supportsStreakMode: true, recommendedDifficulty: "ADAPTIVE" },
  { id: "guess", title: "Guess the Number", difficulty: "Easy", estTime: "2 min", behavior: "Hot/cold hints with attitude", multiplayer: "You vs Robot", accent: "green", playable: true, category: "strategy", skillType: "logic", supportsScore: true, supportsTimer: false, supportsStreakMode: false, recommendedDifficulty: "EASY" },
  { id: "trivia", title: "Trivia Duel", difficulty: "Hard", estTime: "5 min", behavior: "Quizmaster persona, dramatic timer", multiplayer: "Quick duel", accent: "cyan", playable: true, category: "trivia", skillType: "logic", supportsScore: true, supportsTimer: true, supportsStreakMode: true, recommendedDifficulty: "HARD" },
  { id: "scramble", title: "Word Scramble", difficulty: "Medium", estTime: "3 min", behavior: "Gives cryptic hints", multiplayer: "Turn-based", accent: "purple", playable: true, category: "puzzle", skillType: "language", supportsScore: true, supportsTimer: false, supportsStreakMode: false, recommendedDifficulty: "ADAPTIVE" },
  { id: "emoji", title: "Emoji Decode", difficulty: "Medium", estTime: "3 min", behavior: "Sneaky misdirection", multiplayer: "Quick duel", accent: "pink", playable: true, category: "puzzle", skillType: "logic", supportsScore: true, supportsTimer: true, supportsStreakMode: false, recommendedDifficulty: "ADAPTIVE" },
  { id: "rapidfire", title: "Rapid Fire Questions", difficulty: "Hard", estTime: "2 min", behavior: "No mercy, no pauses", multiplayer: "Party mode", accent: "orange", playable: true, category: "trivia", skillType: "reaction", supportsScore: true, supportsTimer: true, supportsStreakMode: true, recommendedDifficulty: "HARD" },
  { id: "wyr", title: "Would You Rather", difficulty: "Easy", estTime: "Open", behavior: "Asks weird futuristic dilemmas", multiplayer: "Party mode", accent: "green", playable: true, category: "party", skillType: "social", supportsScore: false, supportsTimer: false, supportsStreakMode: false, recommendedDifficulty: "EASY" },
  { id: "codebreaker", title: "Neon Codebreaker", difficulty: "Hard", estTime: "4 min", behavior: "Mastermind logic puzzle", multiplayer: "You vs Robot", accent: "green", playable: true, category: "puzzle", skillType: "logic", supportsScore: true, supportsTimer: true, supportsStreakMode: false, recommendedDifficulty: "ADAPTIVE" },
  { id: "signal", title: "Signal Sequence", difficulty: "Medium", estTime: "3 min", behavior: "Repeat the growing pad pattern", multiplayer: "You vs Robot", accent: "cyan", playable: true, category: "puzzle", skillType: "memory", supportsScore: true, supportsTimer: false, supportsStreakMode: true, recommendedDifficulty: "ADAPTIVE" },
  { id: "firewall", title: "Firewall Breach", difficulty: "Hard", estTime: "3 min", behavior: "Route through hidden traps to the core", multiplayer: "You vs Robot", accent: "pink", playable: true, category: "puzzle", skillType: "logic", supportsScore: true, supportsTimer: true, supportsStreakMode: false, recommendedDifficulty: "ADAPTIVE" },
  { id: "heist", title: "Cyber Heist", difficulty: "Hard", estTime: "5 min", behavior: "Branching infiltration choices", multiplayer: "You vs Robot", accent: "purple", playable: true, category: "strategy", skillType: "logic", supportsScore: true, supportsTimer: false, supportsStreakMode: false, recommendedDifficulty: "ADAPTIVE" },
  { id: "dodge", title: "Drone Dodge", difficulty: "Medium", estTime: "2 min", behavior: "Lane-shift survival vs drones", multiplayer: "You vs Robot", accent: "orange", playable: true, category: "reflex", skillType: "reaction", supportsScore: true, supportsTimer: true, supportsStreakMode: false, recommendedDifficulty: "ADAPTIVE" },
  { id: "circuit", title: "Circuit Builder", difficulty: "Medium", estTime: "4 min", behavior: "Rotate tiles to route the current", multiplayer: "You vs Robot", accent: "green", playable: true, category: "puzzle", skillType: "logic", supportsScore: true, supportsTimer: true, supportsStreakMode: false, recommendedDifficulty: "ADAPTIVE" },
]

export const SAVED_RESPONSES = SYSTEM_RESPONSE_LIBRARY

export const SUGGESTED_PROMPTS = [
  "Tell a joke",
  "Start chat",
  "Change voice",
  "Play a game",
  "Prank idea",
  "Daily briefing",
  "Quick fact",
  "Roast me lightly",
  "Hype me up",
]

export const MOOD_LABELS: Record<AssistantMood, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  playful: "Playful",
  gaming: "Gaming",
}

export const MOOD_COLORS: Record<AssistantMood, string> = {
  idle: "#00f0ff",
  listening: "#39ff14",
  thinking: "#b829ff",
  speaking: "#00f0ff",
  playful: "#ff2d9c",
  gaming: "#ff7a00",
}

export const RESPONSE_CATEGORIES = RESPONSE_CATEGORY_LIST

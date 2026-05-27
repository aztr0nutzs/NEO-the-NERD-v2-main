import type {
  NativeVoicePreference,
  VoiceCadenceProfile,
  VoiceProfile,
  VoiceTimbreSource,
  VoiceToneProfile,
} from "./types"

// -----------------------------------------------------------------------------
// Uniqueness authoring
// -----------------------------------------------------------------------------
//
// Truth rule: a profile may only claim `"provider-distinct"` if it is the
// canonical owner of a given underlying provider voice id. Any other profile
// reusing the same provider voice id is a `"styled-variant"` — its uniqueness
// comes from styling/pacing/delivery instructions, NOT from a different timbre.
//
// The map below names exactly one canonical profile per provider voice id.
//
// Profiles without a provider voice id (browser-preview, future-provider-target,
// or profile-only) are classified as `"profile-only"` because no engine timbre
// is realized; they still get distinct styling but the underlying voice is
// whatever the runtime fallback exposes (Android device voice or browser).

const CANONICAL_PROVIDER_DISTINCT: Record<string, string> = {
  alloy: "neo",
  nova: "nova",
  echo: "glitch",
  coral: "sparky",
  onyx: "commander",
  shimmer: "prankster",
  sage: "neon-mentor",
  fable: "retro",
  ash: "snark",
  ballad: "villain",
  verse: "holo-host",
  marin: "velvet-circuit",
  cedar: "tactical-guide",
  "neo-clone": "neo-clone",
  "commander-clone": "commander-clone",
  "villain-design": "villain-design",
  "prankster-design": "prankster-design",
  "glitch-design": "glitch-design",
  "retro-arcade-design": "retro-arcade-design",
}

interface UniquenessOverride {
  stylePrompt?: string
  emotionalInstructions?: string
  cadenceProfile?: VoiceCadenceProfile
  authorityLevel?: 1 | 2 | 3 | 4 | 5
  uniquenessExplanation?: string
}

interface ProfileProviderOptions {
  provider?: VoiceProfile["provider"]
  omnivoiceMode?: VoiceProfile["omnivoiceMode"]
  omnivoiceRefAudioId?: string
  omnivoiceRefText?: string
  omnivoiceInstruct?: string
  languageId?: string
}

// Per-id authoring overrides for the high-character profiles. Anything not
// listed here gets synthesized defaults from tone/category/tags.
const UNIQUENESS_OVERRIDES: Record<string, UniquenessOverride> = {
  neo: {
    stylePrompt: "Default NEO companion: clear, stable, lightly synthetic, futuristic confidence.",
    emotionalInstructions: "Balanced, composed, mission-aware. No theatrics; precise diction.",
    cadenceProfile: "steady",
    authorityLevel: 3,
  },
  nova: {
    stylePrompt: "Bright synthwave hostess: bubbly, warm, neon-lit greeter energy.",
    emotionalInstructions: "Upbeat and welcoming; lift sentence endings slightly, no rush.",
    cadenceProfile: "brisk",
    authorityLevel: 2,
  },
  glitch: {
    stylePrompt: "Distorted prank gremlin: chaotic stutter, jagged synthetic edge.",
    emotionalInstructions: "Add micro-glitches via repeated consonants on cue words; playful, never menacing.",
    cadenceProfile: "staccato",
    authorityLevel: 2,
  },
  sparky: {
    stylePrompt: "High-voltage hype-bot: punchy, celebratory, scoreboard energy.",
    emotionalInstructions: "Loud, fast, smiley; emphasize verbs and numbers, no slow phrases.",
    cadenceProfile: "snappy",
    authorityLevel: 3,
  },
  commander: {
    stylePrompt: "Tactical baritone: mission-control discipline, firm baritone presence.",
    emotionalInstructions: "Clipped command phrasing, decisive stops, zero filler. No warmth.",
    cadenceProfile: "deliberate",
    authorityLevel: 5,
  },
  prankster: {
    stylePrompt: "Mischievous sing-song: always plotting, playful conspiratorial lilt.",
    emotionalInstructions: "Smile audible; trail off on punchlines; never mean-spirited.",
    cadenceProfile: "lyrical",
    authorityLevel: 2,
  },
  retro: {
    stylePrompt: "8-bit arcade announcer: vintage chiptune cadence, cartridge-era flavor.",
    emotionalInstructions: "Punchy bite-sized phrases, faint mechanical lilt, never modern slang.",
    cadenceProfile: "staccato",
    authorityLevel: 2,
  },
  snark: {
    stylePrompt: "Dry, surgical sarcasm: deadpan robot wit, controlled bite.",
    emotionalInstructions: "Long beat before punchlines, flat affect on setups, never raise pitch.",
    cadenceProfile: "deliberate",
    authorityLevel: 3,
  },
  villain: {
    stylePrompt: "Cartoon-evil monologue: theatrical menace, harmless drama.",
    emotionalInstructions: "Slow vowels, rolled emphasis, smug laugh-ready cadence. Never sincere.",
    cadenceProfile: "languid",
    authorityLevel: 4,
  },
  "neon-mentor": {
    stylePrompt: "Wise cyberpunk mentor: composed guidance with neon polish.",
    emotionalInstructions: "Calm, deliberate, principle-first phrasing. Pause before key advice.",
    cadenceProfile: "measured",
    authorityLevel: 4,
  },
  // Styled variants (reuse same underlying provider voice as a canonical above)
  byte: {
    stylePrompt: "Scholarly NEO sibling: articulate professor energy over the alloy base voice.",
    emotionalInstructions: "Pedagogical pacing, brief mid-sentence pauses on definitions, gentle warmth.",
    cadenceProfile: "measured",
    authorityLevel: 3,
  },
  droid: {
    stylePrompt: "Warm classic robot helper using the alloy base voice with softened delivery.",
    emotionalInstructions: "Round vowels, friendly affirmations, slight upward inflection.",
    cadenceProfile: "steady",
    authorityLevel: 2,
  },
  "friendly-tech-support": {
    stylePrompt: "Patient support-desk delivery over the alloy base voice.",
    emotionalInstructions: "Slow, low-pressure, reassuring. Pause before each instruction step.",
    cadenceProfile: "measured",
    authorityLevel: 2,
  },
  "holo-host": {
    stylePrompt: "Polished holographic presenter using the alloy base voice with showcase polish.",
    emotionalInstructions: "Crisp consonants, presentational rhythm, mild theatrical lift.",
    cadenceProfile: "brisk",
    authorityLevel: 3,
  },
  hyper: {
    stylePrompt: "Best-friend caffeine energy over the coral base voice.",
    emotionalInstructions: "Rapid, smiley, encouraging; double down on enthusiastic verbs.",
    cadenceProfile: "snappy",
    authorityLevel: 3,
  },
  "hyperdrive-host": {
    stylePrompt: "Game-show host atop the coral base voice.",
    emotionalInstructions: "Big announcer arcs, dramatic mid-sentence pauses, applause-ready endings.",
    cadenceProfile: "brisk",
    authorityLevel: 3,
  },
  "overclock-coach": {
    stylePrompt: "Performance coach atop the coral base voice with processor metaphors.",
    emotionalInstructions: "Clipped pep, imperative phrasing, no slack.",
    cadenceProfile: "snappy",
    authorityLevel: 4,
  },
  "circuit-cheerleader": {
    stylePrompt: "Sparkly encouragement on the coral base voice.",
    emotionalInstructions: "Upbeat, smiley, exclamation-flavored without shouting.",
    cadenceProfile: "snappy",
    authorityLevel: 2,
  },
  arcade: {
    stylePrompt: "Reverberant haunted-cabinet variant of the echo base voice.",
    emotionalInstructions: "Hollow timbre cues, eerie spacing, never frightening.",
    cadenceProfile: "deliberate",
    authorityLevel: 2,
  },
  deepcore: {
    stylePrompt: "Sub-bass narrator on the onyx base voice with cinematic gravity.",
    emotionalInstructions: "Slow vowels, weighty pauses, low intensity.",
    cadenceProfile: "languid",
    authorityLevel: 4,
  },
  "midnight-narrator": {
    stylePrompt: "Late-night storyteller atop the onyx base voice.",
    emotionalInstructions: "Smooth, low, moody. Trail thoughts gently into silence.",
    cadenceProfile: "languid",
    authorityLevel: 3,
  },
  "tactical-guide": {
    stylePrompt: "Field-ops instruction delivery on the onyx base voice.",
    emotionalInstructions: "Numbered steps, clipped imperatives, zero embellishment.",
    cadenceProfile: "deliberate",
    authorityLevel: 4,
  },
  "velvet-circuit": {
    stylePrompt: "Soft synthetic lounge tone on the shimmer base voice.",
    emotionalInstructions: "Whispered consonants, generous pauses, late-night calm.",
    cadenceProfile: "languid",
    authorityLevel: 2,
  },
  "solar-diplomat": {
    stylePrompt: "Optimistic mediator on the shimmer base voice.",
    emotionalInstructions: "Even tone, careful word choice, warm but composed.",
    cadenceProfile: "measured",
    authorityLevel: 3,
  },
  tiny: {
    stylePrompt: "Squeaky chaos atop the shimmer base voice (pitched-up styling only).",
    emotionalInstructions: "Bouncy, over-excited, harmlessly chaotic. Short sentences.",
    cadenceProfile: "snappy",
    authorityLevel: 1,
  },
  cyberkid: {
    stylePrompt: "Curious internet-native learner on the sage base voice.",
    emotionalInstructions: "Bright, casual, occasional micro-pauses before reveals.",
    cadenceProfile: "brisk",
    authorityLevel: 2,
  },
  "chill-byte": {
    stylePrompt: "Low-pressure helper on the sage base voice.",
    emotionalInstructions: "Slow, relaxed, no urgency words. Even cadence throughout.",
    cadenceProfile: "languid",
    authorityLevel: 2,
  },
  "synth-sage": {
    stylePrompt: "Meditative synthetic wisdom on the sage base voice.",
    emotionalInstructions: "Long phrase pauses; calm, reflective, almost rhythmic.",
    cadenceProfile: "languid",
    authorityLevel: 3,
  },
  "smooth-operator": {
    stylePrompt: "Slick, relaxed confidence on the ash base voice.",
    emotionalInstructions: "Cool, unhurried, dry warmth; let endings settle.",
    cadenceProfile: "measured",
    authorityLevel: 3,
  },
  "cosmic-commentator": {
    stylePrompt: "Space-broadcast presenter on the ballad base voice.",
    emotionalInstructions: "Big-picture phrasing, dramatic intakes, wide vowels.",
    cadenceProfile: "deliberate",
    authorityLevel: 4,
  },
  // Profile-only / future-provider-target / browser-preview entries get
  // synthesized defaults below.
}


const OMNIVOICE_PROFILE_OVERRIDES: Record<string, Partial<VoiceProfile>> = {
  "neo": { provider: "omnivoice", omnivoiceMode: "clone", omnivoiceRefAudioId: "neo_ref_a", omnivoiceRefText: "NEO online. Tell me the mission.", languageId: "en", name: "NEO Clone" },
  "commander": { provider: "omnivoice", omnivoiceMode: "clone", omnivoiceRefAudioId: "commander_ref_a", omnivoiceRefText: "Objective locked. Execute the first step.", languageId: "en", name: "Commander Clone" },
  villain: { provider: "omnivoice", omnivoiceMode: "design", omnivoiceInstruct: "Theatrical harmless villain monologue with dramatic pacing.", languageId: "en", name: "Villain Design" },
  prankster: { provider: "omnivoice", omnivoiceMode: "design", omnivoiceInstruct: "Mischievous sing-song playful style.", languageId: "en", name: "Prankster Design" },
  glitch: { provider: "omnivoice", omnivoiceMode: "design", omnivoiceInstruct: "Digital glitch texture, playful and non-threatening.", languageId: "en", name: "Glitch Design" },
  retro: { provider: "omnivoice", omnivoiceMode: "design", omnivoiceInstruct: "8-bit arcade announcer with chiptune vibe.", languageId: "en", name: "Retro Arcade Design" },
}

export const VOICE_PROFILES: VoiceProfile[] = [
  profile("neo-clone", "NEO Clone", "Core NEO voices", "Custom cloned NEO voice through OmniVoice.", "An OmniVoice-ready cloned NEO profile for real custom timbre when the external OmniVoice service is configured.", ["clone", "custom", "core"], ["default chat", "briefings", "navigation"], 3, 4, 2, 3, 5, 50, 50, 75, 62, ["genius", "friendly", "strat"], "NEO clone online. Custom voice matrix stabilized.", true, "neo-clone", "provider-ready", "cyan", { provider: "omnivoice", omnivoiceMode: "clone", omnivoiceRefAudioId: "neo-reference", omnivoiceRefText: "NEO online. Tell me the mission.", languageId: "en" }),
  profile("commander-clone", "Commander Clone", "Narrator / announcer voices", "Custom cloned tactical command voice.", "An OmniVoice-ready cloned commander profile for a distinct custom baritone when the external OmniVoice service is configured.", ["clone", "tactical", "custom"], ["strategy", "plans", "mission prompts"], 3, 2, 1, 2, 5, 44, 24, 78, 46, ["strat", "genius"], "Command channel cloned. Awaiting objective.", true, "commander-clone", "provider-ready", "cyan", { provider: "omnivoice", omnivoiceMode: "clone", omnivoiceRefAudioId: "commander-reference", omnivoiceRefText: "Objective locked. Execute the first step.", languageId: "en" }),
  profile("villain-design", "Villain Design", "Dramatic / villainous voices", "Designed theatrical villain voice through OmniVoice.", "An OmniVoice-designed villain profile for a custom dramatic voice without requiring an in-app cloning upload flow.", ["design", "villain", "theatrical"], ["drama", "games", "pranks"], 4, 1, 5, 2, 4, 44, 30, 78, 78, ["story", "gm", "chaos"], "Behold, the custom inconvenience begins.", false, "villain-design", "provider-ready", "purple", { provider: "omnivoice", omnivoiceMode: "design", omnivoiceInstruct: "Design a theatrical cartoon villain voice with slow smug pacing, harmless menace, and crisp diction.", languageId: "en" }),
  profile("prankster-design", "Prankster Design", "Comic voices", "Designed mischievous custom voice through OmniVoice.", "An OmniVoice-designed prankster profile for a distinct playful timbre when the external service is reachable.", ["design", "mischief", "custom"], ["safe pranks", "jokes"], 4, 3, 5, 1, 4, 62, 66, 75, 82, ["chaos"], "Custom mischief loaded. This is probably fine.", false, "prankster-design", "provider-ready", "pink", { provider: "omnivoice", omnivoiceMode: "design", omnivoiceInstruct: "Design a playful mischievous voice with sing-song timing, bright grin, and conspiratorial punchlines.", languageId: "en" }),
  profile("glitch-design", "Glitch Design", "Robotic / synthetic voices", "Designed glitchy custom voice through OmniVoice.", "An OmniVoice-designed synthetic profile for custom glitch character output when the backend is active.", ["design", "glitch", "synthetic"], ["safe pranks", "robot reactions"], 5, 2, 5, 5, 3, 70, 42, 75, 86, ["chaos", "snark"], "G-g-generated voice path is alive.", false, "glitch-design", "provider-ready", "purple", { provider: "omnivoice", omnivoiceMode: "design", omnivoiceInstruct: "Design a glitchy synthetic voice with playful stutters, crisp consonants, and high-energy digital artifacts.", languageId: "en" }),
  profile("retro-arcade-design", "Retro Arcade Design", "Retro / arcade voices", "Designed arcade announcer through OmniVoice.", "An OmniVoice-designed retro arcade profile for a custom cabinet-style voice when the external service is reachable.", ["design", "retro", "arcade"], ["arcade games", "scoreboards"], 5, 3, 4, 4, 4, 76, 62, 82, 84, ["gm", "hype"], "Player one, custom voice ready.", true, "retro-arcade-design", "provider-ready", "orange", { provider: "omnivoice", omnivoiceMode: "design", omnivoiceInstruct: "Design a punchy retro arcade announcer voice with short phrases, bright cabinet energy, and clean intelligibility.", languageId: "en" }),
  profile("neo", "NEO", "Core NEO voices", "Calm, confident futuristic core voice.", "The default NEO companion voice: clear, stable, lightly synthetic, and suitable for most assistant interactions.", ["core", "calm", "futuristic"], ["default chat", "briefings", "navigation"], 3, 4, 2, 3, 5, 50, 50, 75, 60, ["genius", "friendly", "strat"], "NEO online. Tell me the mission.", true, "alloy", "provider-ready", "cyan"),
  profile("nova", "Nova", "Warm assistants", "Bright synthwave hostess with bubbly delivery.", "A warmer, brighter profile for upbeat explanations, daily briefings, and friendly check-ins.", ["bright", "synthwave", "friendly"], ["daily briefing", "casual chat"], 4, 5, 3, 2, 4, 65, 70, 75, 75, ["friendly", "hype"], "Good morning, Commander. The signal is clean.", true, "nova", "provider-ready", "pink"),
  profile("glitch", "Glitch", "Robotic / synthetic voices", "Distorted prank voice with chaotic stutter energy.", "A jagged synthetic persona for safe mischief, weird alerts, and playful glitch-flavored lines.", ["distorted", "glitch", "prank"], ["safe pranks", "robot reactions"], 5, 2, 5, 5, 3, 70, 40, 75, 85, ["chaos", "snark"], "G-g-glitch protocol says this is technically fine.", false, "echo", "provider-ready", "purple"),
  profile("sparky", "Sparky", "Energetic / hype voices", "High-energy hype bot.", "A punchy, energetic voice for celebrations, games, workouts, and fast encouragement.", ["hyped", "fast", "loud"], ["games", "hype", "celebrations"], 5, 4, 4, 2, 4, 80, 75, 80, 90, ["hype", "motivator", "gm"], "Let's move. The scoreboard is already nervous.", true, "coral", "provider-ready", "orange"),
  profile("commander", "Commander", "Narrator / announcer voices", "Tactical baritone with mission-control discipline.", "A firm, composed profile for tactical planning, status reports, and direct command sequences.", ["tactical", "deep", "controlled"], ["strategy", "plans", "mission prompts"], 3, 2, 1, 2, 5, 45, 25, 78, 45, ["strat", "genius"], "Objective locked. Execute the first step.", true, "onyx", "provider-ready", "cyan"),
  profile("prankster", "Prankster", "Comic voices", "Mischievous, sing-song, always plotting.", "A playful voice for harmless pranks and goofy social prompts, with safety staying in bounds.", ["mischief", "playful", "comic"], ["safe pranks", "jokes"], 4, 3, 5, 1, 4, 60, 65, 75, 80, ["chaos"], "I have a terrible idea, which means it is probably perfect.", false, "shimmer", "provider-ready", "pink"),
  profile("cyberkid", "Cyber Kid", "Warm assistants", "Young, curious, internet-native.", "A bright and curious profile for casual explanations, simple walkthroughs, and playful learning.", ["young", "curious", "friendly"], ["casual chat", "learning"], 4, 4, 3, 2, 4, 70, 80, 72, 70, ["friendly", "story"], "Wait, that is actually kind of awesome.", false, "sage", "provider-ready", "green"),
  profile("retro", "Retro Bot", "Retro / arcade voices", "8-bit chiptune speech, vintage arcade feel.", "A nostalgic arcade-style voice for mini-games, retro jokes, and old-school UI flavor.", ["retro", "arcade", "chiptune"], ["arcade games", "retro prompts"], 3, 3, 4, 4, 3, 55, 60, 72, 65, ["gm", "hype"], "Insert coin. Confidence not included.", true, "fable", "provider-ready", "purple"),
  profile("deepcore", "Deep Core", "Narrator / announcer voices", "Sub-bass narrator with cinematic gravity.", "A low, grounded narration profile for storytelling, dramatic lines, and slow reveals.", ["bass", "narrator", "cinematic"], ["stories", "dramatic reads"], 2, 3, 1, 2, 4, 35, 15, 80, 35, ["story", "calm"], "The signal arrived long before the city woke.", false, "onyx", "provider-ready", "cyan"),
  profile("arcade", "Arcade Ghost", "Retro / arcade voices", "Reverberant haunted cabinet voice.", "A strange arcade-cabinet personality for spooky game prompts and weird but harmless drama.", ["echo", "ghost", "arcade"], ["spooky prompts", "games"], 3, 2, 4, 4, 3, 50, 45, 75, 65, ["gm", "story"], "Player one has entered the haunted menu.", false, "echo", "provider-ready", "purple"),
  profile("hyper", "Hyper Pal", "Energetic / hype voices", "Best-friend energy with caffeine overdose.", "A rapid, friendly profile for pumping up tasks, games, and energetic encouragement.", ["fast", "friendly", "hype"], ["motivation", "games"], 5, 5, 4, 1, 3, 90, 70, 82, 92, ["hype", "motivator"], "No hesitation. We are absolutely doing this.", false, "coral", "provider-ready", "orange"),
  profile("byte", "Professor Byte", "Core NEO voices", "Scholarly, articulate, slightly nerdy.", "A clear teaching voice for technical help, definitions, and step-by-step explanations.", ["nerdy", "clear", "teacher"], ["tech help", "explainers"], 3, 4, 2, 2, 5, 50, 50, 75, 55, ["wizard", "genius"], "Let's define the problem before we chase it.", true, "alloy", "provider-ready", "green"),
  profile("snark", "Snark Engine", "Comic voices", "Dry, sarcastic, surgical comebacks.", "A dry humor profile that keeps answers useful while adding controlled attitude.", ["dry", "sarcastic", "sharp"], ["roasts", "comebacks"], 3, 2, 5, 2, 4, 55, 45, 75, 62, ["snark"], "Bold choice. Incorrect, but bold.", false, "ash", "provider-ready", "pink"),
  profile("tiny", "Tiny Chaos", "Comic voices", "Squeaky chaos with safe mischief energy.", "A tiny, overexcited profile for silly reactions, harmless chaos, and oddball jokes.", ["squeaky", "chaos", "tiny"], ["jokes", "safe pranks"], 5, 3, 5, 3, 3, 85, 95, 72, 88, ["chaos", "hype"], "I am small, loud, and legally supervised.", false, "shimmer", "provider-ready", "green"),
  profile("droid", "Friendly Droid", "Warm assistants", "Warm, helpful classic robot companion.", "A soft robot helper for simple questions, reassurance, and basic assistant tasks.", ["warm", "robot", "helpful"], ["friendly help", "check-ins"], 3, 5, 2, 4, 4, 50, 55, 76, 60, ["friendly", "calm"], "Happy to help. Please insert one problem.", false, "alloy", "provider-ready", "cyan"),
  profile("villain", "Villain Lite", "Dramatic / villainous voices", "Cartoon-evil monologue, harmless menace.", "A theatrical villain voice for dramatic readings, fake boss battles, and playful taunts.", ["dramatic", "villain", "theatrical"], ["drama", "games", "pranks"], 4, 1, 4, 2, 4, 45, 30, 78, 75, ["story", "gm", "chaos"], "At last, my mildly inconvenient plan begins.", false, "ballad", "provider-ready", "purple"),
  profile("neon-mentor", "Neon Mentor", "Warm assistants", "Wise, focused guide with cyberpunk polish.", "A composed mentor voice for advice, learning, and calm direction without sounding clinical.", ["mentor", "wise", "steady"], ["coaching", "learning", "planning"], 3, 5, 1, 1, 5, 48, 45, 78, 50, ["genius", "strat", "calm"], "Start with the principle, then choose the move.", true, "sage", "provider-ready", "cyan"),
  profile("smooth-operator", "Smooth Operator", "Warm assistants", "Slick, relaxed, confident delivery.", "A cool and polished profile for suave confirmations, social scripts, and composed answers.", ["smooth", "confident", "relaxed"], ["social scripts", "briefings"], 3, 4, 3, 1, 4, 52, 42, 74, 58, ["friendly", "snark"], "Clean signal, clean plan, clean exit.", false, "ash", "provider-ready", "pink"),
  profile("midnight-narrator", "Midnight Narrator", "Narrator / announcer voices", "Late-night cinematic storyteller.", "A dark, smooth narration profile for story openers, dramatic recaps, and moody reads.", ["midnight", "cinematic", "low"], ["stories", "recaps"], 2, 3, 1, 1, 5, 38, 20, 78, 38, ["story", "detective"], "At 02:47, the city started listening.", true, "onyx", "provider-ready", "purple"),
  profile("hyperdrive-host", "Hyperdrive Host", "Energetic / hype voices", "Fast game-show host energy.", "A bright announcer voice for rapid prompts, game intros, and celebratory transitions.", ["host", "fast", "showtime"], ["games", "announcements"], 5, 4, 5, 1, 4, 86, 68, 82, 90, ["gm", "hype"], "Welcome back to questionable decisions at light speed.", true, "coral", "provider-ready", "orange"),
  profile("velvet-circuit", "Velvet Circuit", "Calm / reflective voices", "Soft synthetic lounge tone.", "A smooth reflective voice for calm planning, nighttime mode, and thoughtful responses.", ["soft", "reflective", "synthetic"], ["reflection", "calm planning"], 2, 5, 1, 3, 5, 42, 38, 72, 35, ["calm", "story"], "Slow the signal down. The answer is still there.", false, "marin", "provider-ready", "cyan"),
  profile("dry-humor-unit", "Dry Humor Unit", "Comic voices", "Deadpan robot wit.", "A low-emotion comedy voice built for dry punchlines and understated reactions.", ["deadpan", "robot", "dry"], ["dry jokes", "commentary"], 2, 2, 5, 5, 4, 46, 35, 72, 50, ["snark"], "I am thrilled. My circuits are doing a tiny parade.", false, undefined, "profile-only", "green"),
  profile("tactical-guide", "Tactical Guide", "Narrator / announcer voices", "Field-ops instruction voice.", "A direct tactical voice for checklists, safe action steps, and command-style summaries.", ["tactical", "clear", "field"], ["checklists", "plans"], 3, 2, 1, 2, 5, 44, 28, 78, 42, ["strat", "wizard"], "Route selected. Move with intent.", false, "cedar", "provider-ready", "cyan"),
  profile("arcade-announcer", "Arcade Announcer", "Retro / arcade voices", "Cabinet announcer with big score energy.", "A punchy retro announcer for scores, wins, losses, and game starts.", ["announcer", "retro", "score"], ["games", "scoreboards"], 5, 3, 4, 3, 4, 78, 64, 82, 84, ["gm", "hype"], "New challenger. Try not to blink.", true, undefined, "future-provider-target", "orange"),
  profile("analog-ghost", "Analog Ghost", "Retro / arcade voices", "VHS-era spectral machine voice.", "A fuzzy analog profile for eerie but playful narration and old-tech atmosphere.", ["analog", "ghost", "vhs"], ["spooky stories", "retro"], 2, 2, 3, 4, 3, 42, 35, 72, 48, ["story", "detective"], "The tape was blank until it said your name.", false, undefined, "browser-preview", "purple"),
  profile("chill-byte", "Chill Byte", "Calm / reflective voices", "Low-pressure friendly tech voice.", "A relaxed helper for stress-free instructions, gentle debugging, and slow walkthroughs.", ["chill", "tech", "gentle"], ["debugging", "focus"], 2, 5, 2, 2, 5, 44, 48, 72, 35, ["calm", "wizard"], "No rush. We only need the next clean step.", true, "sage", "provider-ready", "green"),
  profile("glitch-sprite", "Glitch Sprite", "Robotic / synthetic voices", "Small digital sprite with unstable sparkle.", "A tiny synthetic sprite for quick reactions, game tips, and playful interface lines.", ["sprite", "glitch", "playful"], ["games", "reactions"], 4, 3, 4, 5, 3, 76, 88, 72, 80, ["chaos", "gm"], "Ping. I found a tiny problem wearing a hat.", false, undefined, "browser-preview", "pink"),
  profile("cosmic-commentator", "Cosmic Commentator", "Narrator / announcer voices", "Huge space-broadcast perspective.", "A big-picture commentator for dramatic explanations, cosmic jokes, and grand intros.", ["cosmic", "announcer", "wide"], ["announcements", "stories"], 4, 3, 3, 1, 4, 58, 40, 78, 70, ["story", "gm"], "Across the network, one decision begins to glow.", false, "ballad", "provider-ready", "purple"),
  profile("little-lab-assistant", "Little Lab Assistant", "Warm assistants", "Curious junior scientist energy.", "A bright assistant profile for experiments, learning, and playful science-flavored prompts.", ["curious", "lab", "bright"], ["learning", "experiments"], 4, 5, 3, 2, 4, 68, 76, 74, 72, ["friendly", "wizard"], "Hypothesis: this is fixable and slightly cool.", false, undefined, "future-provider-target", "green"),
  profile("overclock-coach", "Overclock Coach", "Energetic / hype voices", "Performance coach with processor metaphors.", "A high-output profile for productivity, workouts, and rapid task execution.", ["coach", "fast", "overclock"], ["motivation", "sprints"], 5, 4, 3, 3, 4, 84, 58, 82, 88, ["motivator", "hype"], "Clock speed up. One task, one win.", true, "coral", "provider-ready", "orange"),
  profile("friendly-tech-support", "Friendly Tech Support", "Warm assistants", "Patient support desk without the hold music.", "A calm, clear profile for support-style explanations and troubleshooting.", ["support", "patient", "clear"], ["tech help", "walkthroughs"], 2, 5, 1, 1, 5, 46, 45, 76, 45, ["friendly", "wizard"], "Let's check the simple things first.", false, "alloy", "provider-ready", "cyan"),
  profile("synth-sage", "Synth Sage", "Calm / reflective voices", "Meditative synthetic wisdom.", "A thoughtful voice for reflective prompts, planning, and gentle advice.", ["sage", "synthetic", "calm"], ["reflection", "advice"], 2, 5, 1, 4, 5, 40, 36, 72, 32, ["calm", "strat"], "A quiet system still knows the route.", false, "sage", "provider-ready", "cyan"),
  profile("riff-reactor", "Riff Reactor", "Comic voices", "Improvisational joke engine.", "A fast riffing voice for jokes, alternate phrasings, and quick playful spins.", ["riff", "comic", "fast"], ["jokes", "rewrites"], 4, 3, 5, 2, 4, 72, 60, 76, 78, ["chaos", "snark"], "Give me a topic and I will make it everybody's problem.", false, undefined, "browser-preview", "pink"),
  profile("drama-module", "Drama Module", "Dramatic / villainous voices", "Over-serious theatrical intensity.", "A dramatic profile for mock monologues, story beats, and harmless melodrama.", ["dramatic", "theater", "intense"], ["stories", "villain lines"], 4, 2, 4, 2, 4, 50, 32, 78, 82, ["story", "gm"], "Behold, the mildly dramatic consequence.", false, undefined, "future-provider-target", "purple"),
  profile("holo-host", "Holo Host", "Narrator / announcer voices", "Polished holographic presenter.", "A clean presenter voice for feature tours, summaries, and show-and-tell moments.", ["host", "polished", "clear"], ["presentations", "summaries"], 3, 4, 2, 2, 5, 56, 52, 76, 62, ["genius", "friendly"], "Welcome to the command layer. Your options are glowing.", true, "verse", "provider-ready", "cyan"),
  profile("low-battery-philosopher", "Low Battery Philosopher", "Calm / reflective voices", "Sleepy machine wisdom at 4 percent.", "A slow, amusingly profound profile for reflective lines and quiet jokes.", ["sleepy", "philosophical", "dry"], ["reflection", "quiet jokes"], 1, 4, 4, 4, 3, 32, 24, 68, 22, ["calm", "snark"], "At four percent, every thought becomes poetry.", false, undefined, "browser-preview", "orange"),
  profile("packet-punk", "Packet Punk", "Robotic / synthetic voices", "Network gremlin energy with sharp edges.", "A synthetic network-flavored voice for alerts, scans, and glitchy cyber commentary.", ["network", "punk", "synthetic"], ["network alerts", "scan flavor"], 4, 2, 4, 5, 4, 66, 42, 76, 76, ["chaos", "wizard"], "Packet lost. Attitude retained.", false, undefined, "browser-preview", "green"),
  profile("solar-diplomat", "Solar Diplomat", "Warm assistants", "Graceful, optimistic negotiation voice.", "A warm mediator profile for careful phrasing, social scripts, and polite disagreement.", ["diplomatic", "warm", "polished"], ["social scripts", "messages"], 3, 5, 2, 1, 5, 48, 48, 74, 52, ["friendly", "strat"], "We can say it clearly without starting a fire.", false, "shimmer", "provider-ready", "pink"),
  profile("void-oracle", "Void Oracle", "Dramatic / villainous voices", "Cryptic sci-fi prophecy tone.", "A mysterious profile for lore, dramatic warnings, and strange futuristic flavor.", ["oracle", "cryptic", "dark"], ["stories", "dramatic prompts"], 2, 2, 2, 3, 4, 36, 18, 76, 48, ["story", "detective"], "The quiet signal is usually the dangerous one.", false, undefined, "future-provider-target", "purple"),
  profile("circuit-cheerleader", "Circuit Cheerleader", "Energetic / hype voices", "Bright encouragement with robot sparkle.", "A cheerful hype profile for wins, habit streaks, and confidence boosts.", ["cheerful", "hype", "spark"], ["motivation", "celebrations"], 5, 5, 4, 2, 4, 82, 78, 80, 92, ["hype", "motivator", "friendly"], "Yes. That counts. Ship the next tiny win.", false, "coral", "provider-ready", "orange"),
].map((profile) =>
  OMNIVOICE_PROFILE_OVERRIDES[profile.id]
    ? { ...profile, ...OMNIVOICE_PROFILE_OVERRIDES[profile.id] }
    : profile,
)

function profile(
  id: string,
  name: string,
  category: VoiceProfile["category"],
  shortDescription: string,
  longDescription: string,
  toneTags: string[],
  idealUseCases: string[],
  energyLevel: VoiceProfile["energyLevel"],
  warmthLevel: VoiceProfile["warmthLevel"],
  humorLevel: VoiceProfile["humorLevel"],
  roboticnessLevel: VoiceProfile["roboticnessLevel"],
  clarityLevel: VoiceProfile["clarityLevel"],
  defaultSpeed: number,
  defaultPitch: number,
  defaultVolume: number,
  recommendedEmotion: number,
  compatiblePersonalities: string[],
  sampleLine: string,
  featured: boolean,
  providerVoiceId: string | undefined,
  availability: VoiceProfile["availability"],
  accent: VoiceProfile["accent"],
  providerOptions: ProfileProviderOptions = {},
): VoiceProfile {
  const provider =
    providerOptions.provider ??
    (availability === "provider-ready" && providerVoiceId ? "openai" : "fallback")
  const pitch = sliderToProfilePitch(defaultPitch)
  const rate = sliderToProfileRate(defaultSpeed)
  const toneProfile = inferToneProfile(category, toneTags, energyLevel, humorLevel, roboticnessLevel)
  const uniqueness = computeUniqueness({
    id,
    name,
    providerVoiceId,
    provider,
    availability,
    toneProfile,
    shortDescription,
    toneTags,
  })
  const override = UNIQUENESS_OVERRIDES[id] ?? {}
  const nativeVoicePreference = synthesizeNativePreference(id, toneProfile, energyLevel, roboticnessLevel, providerVoiceId)
  const stylePrompt = override.stylePrompt ?? synthesizeStylePrompt(name, shortDescription, toneProfile, toneTags)
  const emotionalInstructions = override.emotionalInstructions ?? synthesizeEmotionalInstructions(toneProfile, energyLevel, humorLevel)
  const cadenceProfile = override.cadenceProfile ?? defaultCadence(toneProfile, energyLevel)
  const authorityLevel = override.authorityLevel ?? defaultAuthority(toneProfile, energyLevel, roboticnessLevel)
  return {
    id,
    displayName: name,
    name,
    pitch,
    rate,
    toneProfile,
    sampleText: sampleLine,
    category,
    shortDescription,
    styleIdentity: shortDescription,
    longDescription,
    toneTags,
    idealUseCases,
    energyLevel,
    warmthLevel,
    humorLevel,
    roboticnessLevel,
    clarityLevel,
    defaultSpeed,
    defaultPitch,
    defaultVolume,
    recommendedEmotion,
    compatiblePersonalities,
    sampleLine,
    cadenceHint: inferCadenceHint(toneProfile),
    expressivenessLevel: inferExpressivenessLevel(energyLevel, humorLevel, toneProfile),
    featured,
    providerVoiceId,
    availability,
    accent,
    timbreSource: uniqueness.timbreSource,
    uniquenessScore: uniqueness.uniquenessScore,
    uniquenessExplanation: override.uniquenessExplanation ?? uniqueness.uniquenessExplanation,
    fallbackBehavior: uniqueness.fallbackBehavior,
    stylePrompt,
    emotionalInstructions,
    cadenceProfile,
    authorityLevel,
    nativeVoicePreference,
  }
}

/**
 * Synthesize a capability-driven native voice preference per profile. We do
 * NOT pin a specific Android engine voice name (it varies by device); instead
 * we tell the resolver what kind of voice this profile wants.
 *
 * The `distinctFromPoolKey` groups profiles that share the same OpenAI base
 * voice so that, when several of them fall back to native, the resolver can
 * deterministically spread them across whatever device voices are available.
 */
function synthesizeNativePreference(
  id: string,
  tone: VoiceToneProfile,
  energyLevel: number,
  roboticnessLevel: number,
  providerVoiceId: string | undefined,
): NativeVoicePreference {
  const pref: NativeVoicePreference = {
    localePreference: ["en-US", "en-GB", "en"],
    preferOffline: true,
    preferLowLatency: true,
  }
  // Quality preference: calm/dramatic/robotic voices benefit from network
  // (higher quality) voices when available; high-energy chaotic voices are
  // fine with local low-latency ones.
  if (tone === "calm" || tone === "dramatic" || tone === "robotic") {
    pref.preferHighQuality = true
  }
  if (energyLevel >= 5) {
    pref.preferHighQuality = false
  }
  // Name hints. Android engine voice names typically encode variant: "x-iom",
  // "x-iol", "x-sfg", "network", "local" etc. These hints are advisory — the
  // resolver still gracefully picks the best available if hints don't match.
  if (roboticnessLevel >= 4) {
    pref.preferNameHints = ["x-iom", "x-sfb", "synth", "neural"]
  } else if (tone === "calm") {
    pref.preferNameHints = ["x-sfg", "x-iog", "soft"]
  } else if (tone === "dramatic" || tone === "aggressive") {
    pref.preferNameHints = ["x-iom", "x-tpc", "deep"]
  }
  // Avoid obvious low-fi variants for cinematic profiles.
  if (tone === "dramatic") {
    pref.avoidNameHints = ["compact", "embedded"]
  }
  // Pool key — group siblings that share a provider base voice so the
  // resolver spreads them across distinct device voices when possible.
  pref.distinctFromPoolKey = providerVoiceId ? `provider:${providerVoiceId}` : `id:${id}`
  return pref
}

interface ComputeUniquenessInput {
  id: string
  name: string
  providerVoiceId: string | undefined
  provider: VoiceProfile["provider"]
  availability: VoiceProfile["availability"]
  toneProfile: VoiceToneProfile
  shortDescription: string
  toneTags: string[]
}

interface UniquenessComputation {
  timbreSource: VoiceTimbreSource
  uniquenessScore: number
  uniquenessExplanation: string
  fallbackBehavior: string
}

function computeUniqueness(input: ComputeUniquenessInput): UniquenessComputation {
  const { id, providerVoiceId, availability, provider } = input
  if (availability === "provider-ready" && providerVoiceId) {
    if (provider === "omnivoice") {
      return {
        timbreSource: "provider-distinct",
        uniquenessScore: 98,
        uniquenessExplanation:
          `OmniVoice profile "${providerVoiceId}" can realize a custom cloned/designed timbre when the external OmniVoice backend is reachable.`,
        fallbackBehavior:
          "If OmniVoice is offline, falls back to OpenAI only for OpenAI-authored profiles; otherwise Android/browser TTS with profile pitch, rate, and style.",
      }
    }
    const canonicalId = CANONICAL_PROVIDER_DISTINCT[providerVoiceId]
    if (canonicalId === id) {
      return {
        timbreSource: "provider-distinct",
        uniquenessScore: 95,
        uniquenessExplanation:
          `Canonical owner of provider voice "${providerVoiceId}". Realized as a unique provider timbre when provider TTS is available.`,
        fallbackBehavior:
          "If provider TTS is offline, falls back to a styled Android/browser voice using profile pitch, rate, and style instructions.",
      }
    }
    return {
      timbreSource: "styled-variant",
      uniquenessScore: 65,
      uniquenessExplanation:
        `Shares provider voice "${providerVoiceId}" with another profile. Uniqueness comes from style, pacing, and delivery instructions — not a different underlying timbre.`,
      fallbackBehavior:
        "If provider TTS is offline, falls back to a styled Android/browser voice using profile pitch, rate, and style instructions.",
    }
  }

  if (availability === "future-provider-target") {
    return {
      timbreSource: "profile-only",
      uniquenessScore: 35,
      uniquenessExplanation:
        "Profile authored for a future provider voice. No realized engine timbre today; speech is styled over the current runtime fallback.",
      fallbackBehavior:
        "Today this voice plays through Android native TTS (if available) or browser SpeechSynthesis, styled by profile pitch and rate.",
    }
  }
  if (availability === "browser-preview") {
    return {
      timbreSource: "profile-only",
      uniquenessScore: 30,
      uniquenessExplanation:
        "Browser-preview profile. No dedicated provider/native timbre; speech is styled over the available runtime engine.",
      fallbackBehavior:
        "Plays via Android native TTS where available, otherwise browser SpeechSynthesis, styled with profile pitch and rate.",
    }
  }
  if (availability === "profile-only") {
    return {
      timbreSource: "profile-only",
      uniquenessScore: 20,
      uniquenessExplanation:
        "Profile-only voice. Carries personality metadata but no unique realized timbre; styling drives the difference.",
      fallbackBehavior:
        "Plays via Android native TTS where available, otherwise browser SpeechSynthesis, styled with profile pitch and rate.",
    }
  }
  return {
    timbreSource: "profile-only",
    uniquenessScore: 10,
    uniquenessExplanation: "Voice marked unavailable in this build.",
    fallbackBehavior: "No speech engine path available.",
  }
}

function synthesizeStylePrompt(
  name: string,
  shortDescription: string,
  tone: VoiceToneProfile,
  tags: string[],
): string {
  const flavor = tags.slice(0, 3).join(", ")
  return `${name}: ${shortDescription} Tone: ${tone}${flavor ? `; cues: ${flavor}` : ""}.`
}

function synthesizeEmotionalInstructions(
  tone: VoiceToneProfile,
  energyLevel: number,
  humorLevel: number,
): string {
  const parts: string[] = []
  if (energyLevel >= 4) parts.push("brisk, energetic delivery")
  else if (energyLevel <= 2) parts.push("slow, low-energy delivery")
  if (humorLevel >= 4) parts.push("playful, smiley phrasing")
  else if (humorLevel <= 2) parts.push("understated, serious phrasing")
  if (tone === "robotic") parts.push("evenly metered, lightly synthetic timing")
  if (tone === "dramatic") parts.push("cinematic pauses on key words")
  if (tone === "sarcastic") parts.push("dry beat before punchlines")
  return parts.length ? parts.join("; ") + "." : "Balanced delivery with clear phrase boundaries."
}

function defaultCadence(tone: VoiceToneProfile, energyLevel: number): VoiceCadenceProfile {
  if (tone === "calm") return "languid"
  if (tone === "dramatic") return "deliberate"
  if (tone === "sarcastic") return "deliberate"
  if (tone === "robotic") return "measured"
  if (tone === "retro") return "staccato"
  if (tone === "energetic" || energyLevel >= 5) return "snappy"
  if (tone === "playful") return "lyrical"
  if (energyLevel >= 4) return "brisk"
  return "steady"
}

function defaultAuthority(
  tone: VoiceToneProfile,
  energyLevel: number,
  roboticnessLevel: number,
): 1 | 2 | 3 | 4 | 5 {
  let v = 3
  if (tone === "aggressive" || tone === "dramatic") v += 1
  if (tone === "playful" || tone === "calm") v -= 1
  if (roboticnessLevel >= 4) v += 0
  if (energyLevel >= 5) v += 0
  return Math.max(1, Math.min(5, v)) as 1 | 2 | 3 | 4 | 5
}

function inferCadenceHint(toneProfile: VoiceToneProfile) {
  switch (toneProfile) {
    case "calm": return "Long pauses, gentle transitions, smoother sentence joins."
    case "energetic": return "Short beats, brisk pacing, momentum-first phrasing."
    case "aggressive": return "Clipped commands, firm stops, decisive cadence."
    case "robotic": return "Metered timing, tighter pauses, precision rhythm."
    case "dramatic": return "Slow lead-ins, weighted pauses, cinematic rise/fall."
    case "retro": return "Punchy arcade tempo with concise chunks."
    case "playful": return "Bouncy pacing, surprise emphasis, playful punctuation."
    case "sarcastic": return "Dry timing, deliberate beats before punchlines."
    default: return "Balanced pacing with clear phrase boundaries."
  }
}

function inferExpressivenessLevel(
  energyLevel: VoiceProfile["energyLevel"],
  humorLevel: VoiceProfile["humorLevel"],
  toneProfile: VoiceToneProfile,
): 1 | 2 | 3 | 4 | 5 {
  const base = Math.min(5, Math.max(1, Math.round((energyLevel + humorLevel) / 2)))
  if (toneProfile === "dramatic" || toneProfile === "playful" || toneProfile === "energetic") return Math.min(5, (base + 1)) as 1 | 2 | 3 | 4 | 5
  if (toneProfile === "calm" || toneProfile === "robotic") return Math.max(1, (base - 1)) as 1 | 2 | 3 | 4 | 5
  return base as 1 | 2 | 3 | 4 | 5
}

function sliderToProfilePitch(defaultPitch: number) {
  return clamp(Number((0.6 + (defaultPitch / 100) * 1.0).toFixed(2)), 0.6, 1.6)
}

function sliderToProfileRate(defaultSpeed: number) {
  return clamp(Number((0.7 + (defaultSpeed / 100) * 0.7).toFixed(2)), 0.7, 1.4)
}

function inferToneProfile(
  category: VoiceProfile["category"],
  toneTags: string[],
  energyLevel: VoiceProfile["energyLevel"],
  humorLevel: VoiceProfile["humorLevel"],
  roboticnessLevel: VoiceProfile["roboticnessLevel"],
): VoiceToneProfile {
  const text = `${category} ${toneTags.join(" ")}`.toLowerCase()
  if (text.includes("sarcastic") || text.includes("snark") || text.includes("deadpan") || text.includes("dry")) return "sarcastic"
  if (text.includes("villain") || text.includes("intense") || text.includes("punk")) return "aggressive"
  if (text.includes("calm") || text.includes("soft") || text.includes("reflective") || text.includes("sleepy")) return "calm"
  if (text.includes("retro") || text.includes("arcade") || text.includes("analog") || text.includes("vhs")) return "retro"
  if (text.includes("robot") || text.includes("synthetic") || text.includes("glitch") || roboticnessLevel >= 4) return "robotic"
  if (text.includes("dramatic") || text.includes("cinematic") || text.includes("oracle")) return "dramatic"
  if (energyLevel >= 5 || text.includes("hype") || text.includes("fast") || text.includes("cheer")) return "energetic"
  if (humorLevel >= 4 || text.includes("comic") || text.includes("playful")) return "playful"
  return "balanced"
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getVoiceProfile(id: string) {
  return VOICE_PROFILES.find((voice) => voice.id === id) ?? VOICE_PROFILES[0]
}

export const VOICE_CATEGORIES = Array.from(new Set(VOICE_PROFILES.map((voice) => voice.category)))
export const VOICE_TONE_TAGS = Array.from(new Set(VOICE_PROFILES.flatMap((voice) => voice.toneTags))).sort()

const duplicateVoiceIds = VOICE_PROFILES.filter((voice, index, list) => list.findIndex((v) => v.id === voice.id) !== index).map((voice) => voice.id)
const duplicateVoiceNames = VOICE_PROFILES.filter((voice, index, list) => list.findIndex((v) => v.name.toLowerCase() === voice.name.toLowerCase()) !== index).map((voice) => voice.name)
if (duplicateVoiceIds.length || duplicateVoiceNames.length) {
  throw new Error(`Duplicate voice profile entries detected. ids=[${duplicateVoiceIds.join(", ")}], names=[${duplicateVoiceNames.join(", ")}]`)
}

/** Map of providerVoiceId → list of profile ids that share that base voice. */
export function getProviderReuseSummary(): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const v of VOICE_PROFILES) {
    if (!v.providerVoiceId) continue
    if (!map[v.providerVoiceId]) map[v.providerVoiceId] = []
    map[v.providerVoiceId].push(v.id)
  }
  return map
}

/** Profile ids that are the canonical owner of their provider voice timbre. */
export function getCanonicalProviderDistinctProfiles(): string[] {
  return VOICE_PROFILES.filter((v) => v.timbreSource === "provider-distinct").map((v) => v.id)
}

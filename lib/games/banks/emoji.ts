export type EmojiCategory = "cyber" | "games" | "prank" | "tech" | "movie"
export type EmojiDifficulty = "EASY" | "ADAPTIVE" | "HARD"

export interface EmojiItem {
  q: string
  a: string
  o: string[]
  category: EmojiCategory
  difficulty: EmojiDifficulty
  reveal: string
}

export const EMOJI_BANK: EmojiItem[] = [
  // EASY
  { q: "🤖⚡🌃", a: "CYBER ROBOT", o: ["CYBER ROBOT", "SLEEP MODE", "LASER CAT"], category: "cyber", difficulty: "EASY", reveal: "Robot + electric + city = cyber robot." },
  { q: "🎮🏆🔥", a: "HOT STREAK", o: ["HOT STREAK", "WIN SCREEN", "BOSS FIGHT"], category: "games", difficulty: "EASY", reveal: "Game + trophy + fire implies streak." },
  { q: "📱🔋⚡", a: "FAST CHARGE", o: ["FAST CHARGE", "PHONE CASE", "POWER DOWN"], category: "tech", difficulty: "EASY", reveal: "Phone + battery + lightning = fast charge." },
  { q: "🎮🕹️🟢", a: "GAME START", o: ["GAME START", "JOY MODE", "GREEN LIGHT"], category: "games", difficulty: "EASY", reveal: "Controller + stick + green = game start." },
  { q: "💡🧠💥", a: "BIG IDEA", o: ["BIG IDEA", "HEADACHE", "BRAIN STORM"], category: "tech", difficulty: "EASY", reveal: "Bulb + brain + boom = idea moment." },
  { q: "🔔🚪🤡", a: "PRANK CALL", o: ["PRANK CALL", "DOOR OPEN", "CLOWN VISIT"], category: "prank", difficulty: "EASY", reveal: "Bell + door + clown = prank call." },
  { q: "👻🍿📽️", a: "HORROR MOVIE", o: ["HORROR MOVIE", "SNACK NIGHT", "PROJECTOR GHOST"], category: "movie", difficulty: "EASY", reveal: "Ghost + popcorn + projector = horror movie." },

  // ADAPTIVE
  { q: "🔔😂🚪", a: "DOORBELL PRANK", o: ["DOORBELL PRANK", "FUNNY DELIVERY", "RING ALERT"], category: "prank", difficulty: "ADAPTIVE", reveal: "Bell + laugh + door = doorbell prank." },
  { q: "💾🧠⚙️", a: "MACHINE LEARNING", o: ["MACHINE LEARNING", "HARD DRIVE", "BRAIN CHIP"], category: "tech", difficulty: "ADAPTIVE", reveal: "Storage + brain + gear = ML system." },
  { q: "🎮💀🏰", a: "DARK SOULS", o: ["DARK SOULS", "CASTLE BOSS", "DEATH RUN"], category: "games", difficulty: "ADAPTIVE", reveal: "Game + skull + castle = Dark Souls vibe." },
  { q: "🌃🚗🌧️", a: "NIGHT DRIVE", o: ["NIGHT DRIVE", "STORM ALERT", "CITY RUSH"], category: "movie", difficulty: "ADAPTIVE", reveal: "Night + car + rain = night drive." },
  { q: "📡👽📞", a: "ALIEN CALL", o: ["ALIEN CALL", "SAT PHONE", "SIGNAL LOST"], category: "movie", difficulty: "ADAPTIVE", reveal: "Antenna + alien + phone = alien call." },
  { q: "🤖🎵🎤", a: "ROBOT BAND", o: ["ROBOT BAND", "AI SONG", "VOICE MODEL"], category: "cyber", difficulty: "ADAPTIVE", reveal: "Robot + music + mic = robot band." },
  { q: "🥚🚪🏃", a: "EGG HUNT", o: ["EGG HUNT", "EXIT QUICKLY", "EASTER ESCAPE"], category: "prank", difficulty: "ADAPTIVE", reveal: "Egg + door + runner = egg hunt." },

  // HARD
  { q: "🛰️📡🌐", a: "GLOBAL NETWORK", o: ["GLOBAL NETWORK", "ALIEN SIGNAL", "SKY WIFI"], category: "tech", difficulty: "HARD", reveal: "Satellite + antenna + globe = global network." },
  { q: "🎭🤖🔮", a: "PREDICTIVE BOT", o: ["PREDICTIVE BOT", "ROBOT MAGIC", "FUTURE MASK"], category: "cyber", difficulty: "HARD", reveal: "Mask + robot + crystal ball = prediction." },
  { q: "🧠⚡🕸️", a: "NEURAL NET", o: ["NEURAL NET", "BRAIN SHOCK", "SPIDER MIND"], category: "tech", difficulty: "HARD", reveal: "Brain + lightning + web = neural net." },
  { q: "🕹️📼🌃", a: "RETRO ARCADE", o: ["RETRO ARCADE", "OLD CONSOLE", "NIGHT GAME"], category: "games", difficulty: "HARD", reveal: "Joystick + tape + city = retro arcade." },
  { q: "🤡📦🚓", a: "PRANK CAUGHT", o: ["PRANK CAUGHT", "GIFT JOKE", "CIRCUS RAID"], category: "prank", difficulty: "HARD", reveal: "Clown + box + cop car = prank caught." },
  { q: "🦾🌐💾", a: "CYBER WARE", o: ["CYBER WARE", "ARM DRIVE", "WEB STORAGE"], category: "cyber", difficulty: "HARD", reveal: "Cyber arm + web + disk = cyberware." },
  { q: "🎬🤖🌪️", a: "ROBOT APOCALYPSE", o: ["ROBOT APOCALYPSE", "FILM STORM", "MACHINE WIND"], category: "movie", difficulty: "HARD", reveal: "Clapper + robot + tornado = robot apocalypse." },
]

export type TriviaCategory = "tech" | "general" | "science" | "pop" | "neo"
export type TriviaDifficulty = "EASY" | "ADAPTIVE" | "HARD"

export interface TriviaItem {
  q: string
  a: string
  o: string[]
  category: TriviaCategory
  difficulty: TriviaDifficulty
}

export const TRIVIA_BANK: TriviaItem[] = [
  // EASY · tech
  { q: "What does RAM stand for?", a: "RANDOM ACCESS MEMORY", o: ["RANDOM ACCESS MEMORY", "RAPID ARRAY MACHINE", "REMOTE ACTIVE MODULE"], category: "tech", difficulty: "EASY" },
  { q: "HTTP status 404 means?", a: "NOT FOUND", o: ["NOT FOUND", "UNAUTHORIZED", "OK"], category: "tech", difficulty: "EASY" },
  { q: "Which protocol secures most modern web traffic?", a: "HTTPS", o: ["HTTPS", "FTP", "TELNET"], category: "tech", difficulty: "EASY" },
  { q: "Which company makes the iPhone?", a: "APPLE", o: ["APPLE", "SAMSUNG", "GOOGLE"], category: "tech", difficulty: "EASY" },
  { q: "Which symbol begins a hashtag?", a: "#", o: ["#", "@", "&"], category: "tech", difficulty: "EASY" },
  // EASY · general
  { q: "Largest ocean on Earth?", a: "PACIFIC", o: ["PACIFIC", "ATLANTIC", "INDIAN"], category: "general", difficulty: "EASY" },
  { q: "How many continents are there?", a: "7", o: ["7", "5", "9"], category: "general", difficulty: "EASY" },
  { q: "Which country invented sushi?", a: "JAPAN", o: ["JAPAN", "CHINA", "KOREA"], category: "general", difficulty: "EASY" },
  { q: "The Eiffel Tower is in which city?", a: "PARIS", o: ["PARIS", "ROME", "MADRID"], category: "general", difficulty: "EASY" },
  // EASY · science
  { q: "Which star is at the center of our solar system?", a: "THE SUN", o: ["THE SUN", "SIRIUS", "POLARIS"], category: "science", difficulty: "EASY" },
  { q: "Water freezes at how many °C?", a: "0", o: ["0", "32", "100"], category: "science", difficulty: "EASY" },
  { q: "How many legs does a spider have?", a: "8", o: ["8", "6", "10"], category: "science", difficulty: "EASY" },
  // EASY · pop
  { q: "Which fictional wizard attends Hogwarts?", a: "HARRY POTTER", o: ["HARRY POTTER", "FRODO", "LUKE SKYWALKER"], category: "pop", difficulty: "EASY" },
  { q: "Mario's video-game brother?", a: "LUIGI", o: ["LUIGI", "WARIO", "TOAD"], category: "pop", difficulty: "EASY" },
  // EASY · neo
  { q: "Primary glow color in NEO visuals?", a: "CYAN", o: ["CYAN", "RED", "YELLOW"], category: "neo", difficulty: "EASY" },
  { q: "NEO's role in this app is best described as?", a: "ASSISTANT", o: ["ASSISTANT", "FIREWALL", "ROUTER"], category: "neo", difficulty: "EASY" },

  // ADAPTIVE · tech
  { q: "Binary of decimal 10 is?", a: "1010", o: ["1010", "1001", "1111"], category: "tech", difficulty: "ADAPTIVE" },
  { q: "What does CPU stand for?", a: "CENTRAL PROCESSING UNIT", o: ["CENTRAL PROCESSING UNIT", "CORE POWER UNIT", "CACHED PROGRAM UTILITY"], category: "tech", difficulty: "ADAPTIVE" },
  { q: "Which language compiles to bytecode on the JVM?", a: "JAVA", o: ["JAVA", "PYTHON", "C"], category: "tech", difficulty: "ADAPTIVE" },
  { q: "Default HTTPS port?", a: "443", o: ["443", "80", "22"], category: "tech", difficulty: "ADAPTIVE" },
  // ADAPTIVE · science
  { q: "Chemical symbol for gold?", a: "AU", o: ["AU", "AG", "GD"], category: "science", difficulty: "ADAPTIVE" },
  { q: "Speed of light in a vacuum (km/s)?", a: "~300000", o: ["~300000", "~30000", "~3000000"], category: "science", difficulty: "ADAPTIVE" },
  { q: "Which planet has the most moons?", a: "SATURN", o: ["SATURN", "JUPITER", "URANUS"], category: "science", difficulty: "ADAPTIVE" },
  // ADAPTIVE · general
  { q: "Currency of Japan?", a: "YEN", o: ["YEN", "WON", "BAHT"], category: "general", difficulty: "ADAPTIVE" },
  { q: "Fastest land animal?", a: "CHEETAH", o: ["CHEETAH", "FALCON", "HORSE"], category: "general", difficulty: "ADAPTIVE" },
  { q: "Which mountain is Earth's highest peak above sea level?", a: "EVEREST", o: ["EVEREST", "K2", "DENALI"], category: "general", difficulty: "ADAPTIVE" },
  // ADAPTIVE · pop
  { q: "Who wrote '1984'?", a: "GEORGE ORWELL", o: ["GEORGE ORWELL", "ALDOUS HUXLEY", "RAY BRADBURY"], category: "pop", difficulty: "ADAPTIVE" },
  { q: "Which director made 'Inception'?", a: "CHRISTOPHER NOLAN", o: ["CHRISTOPHER NOLAN", "DENIS VILLENEUVE", "RIDLEY SCOTT"], category: "pop", difficulty: "ADAPTIVE" },
  { q: "Which band released 'Dark Side of the Moon'?", a: "PINK FLOYD", o: ["PINK FLOYD", "LED ZEPPELIN", "THE WHO"], category: "pop", difficulty: "ADAPTIVE" },
  // ADAPTIVE · neo
  { q: "In NEO lore style, what powers the cabinet?", a: "NEON CORE", o: ["NEON CORE", "STEAM ENGINE", "SOLAR ICE"], category: "neo", difficulty: "ADAPTIVE" },
  { q: "Which arcade mechanic awards a streak bonus?", a: "CONSECUTIVE CORRECT", o: ["CONSECUTIVE CORRECT", "RANDOM ROLL", "SLOW PLAY"], category: "neo", difficulty: "ADAPTIVE" },

  // HARD · tech
  { q: "Time complexity of binary search?", a: "O(LOG N)", o: ["O(LOG N)", "O(N)", "O(N LOG N)"], category: "tech", difficulty: "HARD" },
  { q: "Which sort is stable and runs in O(n log n)?", a: "MERGE SORT", o: ["MERGE SORT", "QUICK SORT", "HEAP SORT"], category: "tech", difficulty: "HARD" },
  { q: "Which TCP flag begins a connection handshake?", a: "SYN", o: ["SYN", "FIN", "RST"], category: "tech", difficulty: "HARD" },
  { q: "Default Postgres port?", a: "5432", o: ["5432", "3306", "27017"], category: "tech", difficulty: "HARD" },
  // HARD · science
  { q: "Particle with negative charge?", a: "ELECTRON", o: ["ELECTRON", "PROTON", "NEUTRON"], category: "science", difficulty: "HARD" },
  { q: "Most abundant gas in Earth's atmosphere?", a: "NITROGEN", o: ["NITROGEN", "OXYGEN", "ARGON"], category: "science", difficulty: "HARD" },
  { q: "Which scientist proposed general relativity?", a: "EINSTEIN", o: ["EINSTEIN", "NEWTON", "BOHR"], category: "science", difficulty: "HARD" },
  // HARD · general
  { q: "Capital of Iceland?", a: "REYKJAVIK", o: ["REYKJAVIK", "OSLO", "HELSINKI"], category: "general", difficulty: "HARD" },
  { q: "Longest river in the world?", a: "NILE", o: ["NILE", "AMAZON", "YANGTZE"], category: "general", difficulty: "HARD" },
  { q: "Currency of Sweden?", a: "KRONA", o: ["KRONA", "EURO", "FRANC"], category: "general", difficulty: "HARD" },
  // HARD · pop
  { q: "Which movie features a VR layer called the Matrix?", a: "THE MATRIX", o: ["THE MATRIX", "TRON", "INCEPTION"], category: "pop", difficulty: "HARD" },
  { q: "Which author wrote 'Neuromancer'?", a: "WILLIAM GIBSON", o: ["WILLIAM GIBSON", "PHILIP K DICK", "ISAAC ASIMOV"], category: "pop", difficulty: "HARD" },
  { q: "Which game series features the city of Night City?", a: "CYBERPUNK", o: ["CYBERPUNK", "FALLOUT", "DEUS EX"], category: "pop", difficulty: "HARD" },
  // HARD · neo
  { q: "Which encoding represents text as 0s and 1s grouped by 8?", a: "BYTES", o: ["BYTES", "NIBBLES", "FRAMES"], category: "neo", difficulty: "HARD" },
  { q: "Which classic cyberpunk anime features a 'Project 2501'?", a: "GHOST IN THE SHELL", o: ["GHOST IN THE SHELL", "AKIRA", "SERIAL EXPERIMENTS LAIN"], category: "neo", difficulty: "HARD" },
]

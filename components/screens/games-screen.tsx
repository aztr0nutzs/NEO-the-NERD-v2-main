"use client"

import { useEffect, useMemo, useState } from "react"
import { Swords, Shuffle, Sparkles, History, Trophy, Zap } from "lucide-react"
import { GAMES } from "@/lib/data"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import { GameCard } from "../game-card"
import { TicTacToeGame } from "../games/tic-tac-toe"
import { RockPaperScissorsGame } from "../games/rock-paper-scissors"
import { ArcadeGame } from "../games/arcade-games"
import { Knxt4Game } from "../games/knxt4/knxt4-game"
import { DailyChallengeCard } from "../games/daily-challenge-card"
import { AchievementsStrip } from "../games/achievements-strip"
import { CelebrationToast } from "../games/celebration-toast"
import { todayKey } from "@/lib/games/daily-challenge"
import type { GameDef, GameId } from "@/lib/types"

type CategoryFilter = "all" | GameDef["category"]

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "strategy", label: "STRATEGY" },
  { id: "reflex", label: "REFLEX" },
  { id: "puzzle", label: "PUZZLE" },
  { id: "trivia", label: "TRIVIA" },
  { id: "party", label: "PARTY" },
]

const PLAYABLE_GAMES = GAMES.filter((g) => g.playable)

export function GamesScreen() {
  const { acceptedGameInvite, settings, arcadeProgression, refreshDailyChallenge } = useApp()
  const [active, setActive] = useState<GameId | null>(null)
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [featured, setFeatured] = useState<GameId>(() => PLAYABLE_GAMES[0].id)

  useEffect(() => {
    if (acceptedGameInvite) setActive(acceptedGameInvite as GameId)
  }, [acceptedGameInvite])

  // Ensure today's daily challenge exists when the screen mounts or the day rolls over.
  useEffect(() => {
    refreshDailyChallenge()
  }, [refreshDailyChallenge])

  useEffect(() => {
    const t = setInterval(() => {
      setFeatured((cur) => {
        const idx = PLAYABLE_GAMES.findIndex((g) => g.id === cur)
        return PLAYABLE_GAMES[(idx + 1) % PLAYABLE_GAMES.length].id
      })
    }, 6000)
    return () => clearInterval(t)
  }, [])

  const totalRuns = arcadeProgression.totalGamesPlayed
  const xpForNext = arcadeProgression.arcadeLevel * 100
  const xpProgress = Math.min(100, Math.round((arcadeProgression.arcadeXp % 100)))

  const filtered = useMemo(
    () => GAMES.filter((g) => category === "all" || g.category === category),
    [category],
  )

  const featuredGame = useMemo(
    () => GAMES.find((g) => g.id === featured) ?? PLAYABLE_GAMES[0],
    [featured],
  )

  const recents = useMemo(() => {
    return GAMES
      .map((g) => ({ g, stats: arcadeProgression.perGame[g.id] }))
      .filter((x) => x.stats?.lastPlayedAt != null)
      .sort((a, b) => (b.stats!.lastPlayedAt ?? 0) - (a.stats!.lastPlayedAt ?? 0))
      .slice(0, 3)
  }, [arcadeProgression.perGame])

  const bestGame = useMemo(() => {
    let best: { g: GameDef; runs: number; wins: number } | null = null
    for (const g of GAMES) {
      const s = arcadeProgression.perGame[g.id]
      if (!s) continue
      const runs = s.wins + s.losses + s.draws
      if (runs === 0) continue
      if (!best || s.wins > best.wins || (s.wins === best.wins && runs > best.runs)) {
        best = { g, runs, wins: s.wins }
      }
    }
    return best
  }, [arcadeProgression.perGame])

  const topCategory = useMemo<GameDef["category"] | null>(() => {
    const counts: Record<string, number> = {}
    for (const g of GAMES) {
      const s = arcadeProgression.perGame[g.id]
      const runs = s ? s.wins + s.losses + s.draws : 0
      if (runs > 0) counts[g.category] = (counts[g.category] ?? 0) + runs
    }
    const entries = Object.entries(counts)
    if (entries.length === 0) return null
    return entries.sort((a, b) => b[1] - a[1])[0][0] as GameDef["category"]
  }, [arcadeProgression.perGame])

  // Recommendation: pure metadata. If we have a top played category, pick the
  // playable game in that category with the fewest runs (encouraging variety).
  // Otherwise, the first playable game tagged as the recommended difficulty.
  const recommendation = useMemo<GameId | null>(() => {
    const recentIds = new Set(recents.map((r) => r.g.id))
    if (topCategory) {
      const candidates = PLAYABLE_GAMES.filter((g) => g.category === topCategory && !recentIds.has(g.id))
      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const ar = arcadeProgression.perGame[a.id]
          const br = arcadeProgression.perGame[b.id]
          return (ar ? ar.wins + ar.losses + ar.draws : 0) - (br ? br.wins + br.losses + br.draws : 0)
        })
        return candidates[0].id
      }
    }
    return PLAYABLE_GAMES[0].id
  }, [topCategory, recents, arcadeProgression.perGame])

  const shuffleFeatured = () => {
    const others = PLAYABLE_GAMES.filter((g) => g.id !== featured)
    if (others.length === 0) return
    setFeatured(others[Math.floor(Math.random() * others.length)].id)
  }

  const playableCount = PLAYABLE_GAMES.length
  const filteredPlayable = filtered.filter((g) => g.playable).length

  const daily = arcadeProgression.dailyChallenge?.dayKey === todayKey() ? arcadeProgression.dailyChallenge : null

  return (
    <div className="space-y-3">
      {!active && (
        <>
          <CelebrationToast />
          <header className="px-1">
            <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">NEO // ARCADE_HUB</p>
            <h2 className="ps-heading text-2xl">
              <span className="ps-text-orange">MINI</span>{" "}
              <span className="text-white/80">GAMES</span>
            </h2>
          </header>

          {/* Arcade Dashboard */}
          <NeonPanel accent="cyan" glow="strong" className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan">ARCADE_LEVEL</p>
                <p className="ps-heading text-3xl ps-text-cyan" style={{ textShadow: "0 0 12px #00f0ff" }}>
                  L{arcadeProgression.arcadeLevel}
                </p>
                <p className="mt-1 ps-mono text-[10px] tracking-[0.2em] text-white/55">
                  {arcadeProgression.arcadeXp} XP · NEXT @ {xpForNext}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 flex-1 max-w-[260px]">
                <DashStat icon={<Trophy className="h-3 w-3" />} label="WINS" value={`${arcadeProgression.totalWins}`} color="#39ff14" />
                <DashStat icon={<Zap className="h-3 w-3" />} label="STREAK" value={`${arcadeProgression.currentWinStreak}`} color="#ff7a00" />
                <DashStat icon={<History className="h-3 w-3" />} label="RUNS" value={`${totalRuns}`} color="#00f0ff" />
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${xpProgress}%`, background: "linear-gradient(90deg,#00f0ff,#39ff14)", boxShadow: "0 0 8px #00f0ff88" }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between ps-mono text-[9px] tracking-[0.2em] text-white/55">
              <span>LONGEST STREAK {arcadeProgression.longestWinStreak}</span>
              <span>{bestGame ? `TOP: ${bestGame.g.title.toUpperCase()}` : totalRuns === 0 ? "NO RUNS LOGGED" : "TOP: --"}</span>
            </div>
          </NeonPanel>

          {/* Daily Challenge */}
          {daily && (
            <DailyChallengeCard
              challenge={daily}
              stats={arcadeProgression.perGame[daily.gameId]}
              onLaunch={(id) => setActive(id)}
            />
          )}

          {/* Featured Challenge */}
          <NeonPanel accent="orange" glow="strong" className="p-3">
            <div className="flex items-center gap-3">
              <div
                className="grid h-12 w-12 place-items-center rounded-lg"
                style={{ background: "rgba(255,122,0,0.18)", boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.6)" }}
              >
                <Swords className="h-5 w-5 ps-text-orange" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-orange">FEATURED_CHALLENGE</p>
                <p className="ps-heading text-lg text-white/95 leading-tight">{featuredGame.title}</p>
                <p className="ps-mono text-[9px] tracking-[0.2em] text-white/55">
                  {featuredGame.category.toUpperCase()} · {featuredGame.estTime.toUpperCase()} · +XP ON WIN
                </p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={() => setActive(featuredGame.id)}
                className="rounded-lg py-2 ps-mono text-[11px] tracking-[0.3em]"
                style={{ color: "#000", background: "linear-gradient(180deg,#ff7a00,#ff7a00AA)", boxShadow: "inset 0 0 0 1px #ff7a00, 0 0 14px #ff7a00AA" }}
              >
                LAUNCH
              </button>
              <button
                type="button"
                onClick={shuffleFeatured}
                aria-label="Shuffle challenge"
                className="grid h-9 w-9 place-items-center rounded-lg"
                style={{ color: "#ff7a00", background: "rgba(255,122,0,0.12)", boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.5)" }}
              >
                <Shuffle className="h-4 w-4" />
              </button>
            </div>
          </NeonPanel>
        </>
      )}

      {active && (
        <button
          type="button"
          onClick={() => setActive(null)}
          className="fixed right-4 top-4 z-50 rounded-full px-3 py-1.5 ps-mono text-[10px] tracking-[0.25em]"
          style={{ color: "#00f0ff", background: "rgba(0,0,0,0.78)", boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.55), 0 0 14px rgba(0,240,255,0.28)" }}
        >
          BACK
        </button>
      )}

      {/* Active game */}
      {active === "tictactoe" && <TicTacToeGame onClose={() => setActive(null)} />}
      {active === "rps" && <RockPaperScissorsGame onClose={() => setActive(null)} />}
      {active === "knxt4" && <Knxt4Game onClose={() => setActive(null)} />}
      {active && active !== "tictactoe" && active !== "rps" && active !== "knxt4" && (
        <ArcadeGame
          game={active}
          difficulty={settings.gameDifficulty}
          trashTalk={settings.trashTalk}
          onClose={() => setActive(null)}
        />
      )}

      {!active && (
        <>
          {/* First-play empty state */}
          {totalRuns === 0 && (
            <NeonPanel accent="green" glow="soft" className="p-3">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 ps-text-green" />
                <div className="min-w-0">
                  <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-green">FIRST_RUN</p>
                  <p className="text-[12px] text-white/80">Pick any card to log your first run. NEO calibrates from there.</p>
                </div>
              </div>
            </NeonPanel>
          )}

          {/* Recently Played */}
          {recents.length > 0 && (
            <section className="space-y-1.5">
              <p className="ps-mono text-[10px] tracking-[0.3em] text-white/55 px-1">RECENTLY_PLAYED</p>
              <div className="grid grid-cols-3 gap-2">
                {recents.map(({ g, stats }) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActive(g.id)}
                    className="rounded-lg ps-glass p-2 text-left"
                    style={{ boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.08)` }}
                  >
                    <p className="ps-mono text-[8px] tracking-[0.25em]" style={{ color: ACCENT_TO_HEX(g.accent) }}>{g.category.toUpperCase()}</p>
                    <p className="ps-heading text-[11px] leading-tight text-white/90 truncate">{g.title}</p>
                    {stats && (
                      <p className="mt-0.5 ps-mono text-[8px] tracking-[0.2em] text-white/45">
                        {stats!.wins + stats!.losses + stats!.draws} RUN{(stats!.wins + stats!.losses + stats!.draws) === 1 ? "" : "S"}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Category filters */}
          <div className="flex flex-wrap gap-1.5 px-1">
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className="rounded-full px-3 py-1 ps-mono text-[10px] tracking-[0.25em]"
                  style={{
                    color: isActive ? "#000" : "rgba(255,255,255,0.7)",
                    background: isActive ? "#00f0ff" : "rgba(255,255,255,0.04)",
                    boxShadow: isActive ? "inset 0 0 0 1px #00f0ff, 0 0 10px #00f0ff88" : "inset 0 0 0 1px rgba(255,255,255,0.1)",
                  }}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/40 px-1">
            {category === "all" ? `${playableCount} PLAYABLE` : `${filteredPlayable} IN ${category.toUpperCase()}`}
          </p>

          {/* Game grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {filtered.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                stats={arcadeProgression.perGame[g.id]}
                onPlay={(id) => setActive(id)}
                recommended={g.id === recommendation && totalRuns > 0}
              />
            ))}
          </div>

          {/* Achievements */}
          <AchievementsStrip achievements={arcadeProgression.achievements} />
        </>
      )}
    </div>
  )
}

function ACCENT_TO_HEX(a: GameDef["accent"]) {
  switch (a) {
    case "cyan": return "#00f0ff"
    case "purple": return "#b829ff"
    case "pink": return "#ff2d9c"
    case "green": return "#39ff14"
    case "orange": return "#ff7a00"
  }
}

function DashStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-md bg-black/40 px-2 py-1.5" style={{ boxShadow: `inset 0 0 0 1px ${color}33` }}>
      <div className="flex items-center gap-1" style={{ color }}>
        {icon}
        <p className="ps-mono text-[9px] tracking-[0.2em]">{label}</p>
      </div>
      <p className="ps-heading text-base leading-none" style={{ color, textShadow: `0 0 6px ${color}99` }}>{value}</p>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Swords } from "lucide-react"
import { GAMES } from "@/lib/data"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import { GameCard } from "../game-card"
import { TicTacToeGame } from "../games/tic-tac-toe"
import { RockPaperScissorsGame } from "../games/rock-paper-scissors"
import { ArcadeGame } from "../games/arcade-games"
import type { GameId } from "@/lib/types"

const CHALLENGES: { label: string; game: GameId }[] = [
  { label: "Want to play Tic Tac Toe?", game: "tictactoe" },
  { label: "I challenge you to Rock Paper Scissors.", game: "rps" },
  { label: "Want a quick trivia duel?", game: "trivia" },
  { label: "Reaction test. Think you're fast?", game: "reaction" },
]

export function GamesScreen() {
  const { acceptedGameInvite, settings } = useApp()
  const [active, setActive] = useState<GameId | null>(null)
  const [challengeIdx, setChallengeIdx] = useState(0)

  useEffect(() => {
    if (acceptedGameInvite) setActive(acceptedGameInvite as GameId)
  }, [acceptedGameInvite])

  useEffect(() => {
    const t = setInterval(() => {
      setChallengeIdx((i) => (i + 1) % CHALLENGES.length)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="space-y-3">
      <header className="px-1">
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          NEO // ARCADE_DECK
        </p>
        <h2 className="ps-heading text-2xl">
          <span className="ps-text-orange">MINI</span>{" "}
          <span className="text-white/80">GAMES</span>
        </h2>
        <p className="mt-1 text-[12px] text-white/55 text-pretty">
          You vs NEO. Every arcade card is wired live with replay, scoring, and robot responses.
        </p>
      </header>

      {/* Robot challenge prompt */}
      <NeonPanel accent="orange" glow="strong" className="p-3">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-lg"
            style={{
              background: "rgba(255,122,0,0.15)",
              boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.5)",
            }}
          >
            <Swords className="h-4 w-4 ps-text-orange" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-orange">
              ROBOT_CHALLENGE
            </p>
            <p className="text-[14px] text-white/95 text-pretty">
              {CHALLENGES[challengeIdx].label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActive(CHALLENGES[challengeIdx].game)}
            className="rounded-md px-3 py-1.5 ps-mono text-[10px] tracking-[0.2em] ps-glow-orange"
            style={{
              background: "rgba(255,122,0,0.18)",
              color: "#ff7a00",
              boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.6)",
            }}
          >
            LAUNCH
          </button>
        </div>
      </NeonPanel>

      {/* Active game */}
      {active === "tictactoe" && (
        <TicTacToeGame onClose={() => setActive(null)} />
      )}
      {active === "rps" && (
        <RockPaperScissorsGame onClose={() => setActive(null)} />
      )}
      {active &&
        active !== "tictactoe" &&
        active !== "rps" && (
          <ArcadeGame
            game={active}
            difficulty={settings.gameDifficulty}
            trashTalk={settings.trashTalk}
            onClose={() => setActive(null)}
          />
        )}

      {/* Game grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {GAMES.map((g) => (
          <GameCard
            key={g.id}
            game={g}
            onPlay={(id) => setActive(id)}
          />
        ))}
      </div>
    </div>
  )
}

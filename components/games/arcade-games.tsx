"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import type { GameId, GameSessionState } from "@/lib/types"
import { ArcadeGameShell } from "./arcade-game-shell"
import { MemoryMatchGame } from "./memory-match"
import { ReactionTapGame } from "./reaction-tap"
import { GuessNumberGame } from "./guess-number"
import { TriviaDuelGame } from "./trivia-duel"
import { WordScrambleGame } from "./word-scramble"
import { EmojiDecodeGame } from "./emoji-decode"
import { RapidFireGame } from "./rapid-fire"
import { WouldYouRatherGame } from "./would-you-rather"
import { NeonCodebreakerGame } from "./neon-codebreaker"
import { SignalSequenceGame } from "./signal-sequence"
import { FirewallBreachGame } from "./firewall-breach"
import type { Difficulty, SessionResult, UpdatePayload } from "./types"

const TRASH = ["NEO logs this for calibration. Mostly for comedy.", "Bold move. The arcade cabinet is judging respectfully.", "Your reflexes filed a support ticket."]
const trash = (e: boolean) => (e ? ` ${TRASH[Math.floor(Math.random() * TRASH.length)]}` : "")
const makeSession = (game: GameId): GameSessionState => ({ activeGame: game, score: { you: 0, neo: 0 }, round: 1, result: "idle", robotResponse: "NEO is waiting. Begin the round." })

export function ArcadeGame({ game, difficulty, trashTalk, onClose }: { game: Exclude<GameId, "tictactoe" | "rps">; difficulty: Difficulty; trashTalk: boolean; onClose: () => void }) {
  const [session, setSession] = useState<GameSessionState>(() => makeSession(game))
  const { playAvatarReaction, recordGameResult } = useApp()
  const update = (result: SessionResult, robotResponse: string, payload?: UpdatePayload) => {
    if (result === "win") playAvatarReaction("ecstatic")
    if (result === "lose") playAvatarReaction("angry")
    if (result === "draw") playAvatarReaction("surprised")
    if (result === "win" || result === "lose" || result === "draw" || payload?.forceProgression) {
      const progressionResult = result === "win" || result === "lose" || result === "draw" ? result : "draw"
      recordGameResult({ game, result: progressionResult, difficulty, score: payload?.score, completionTimeMs: payload?.completionTimeMs, reactionTimeMs: payload?.reactionTimeMs, streak: payload?.streak })
    }
    setSession((cur) => ({ ...cur, result, robotResponse: `${robotResponse}${trash(trashTalk)}`, round: cur.round + 1, score: { you: cur.score.you + (payload?.score ?? 0), neo: cur.score.neo + (payload?.neoScore ?? 0) } }))
  }
  return <ArcadeGameShell game={game} session={session} onReset={() => setSession(makeSession(game))} onClose={onClose}>
    {game === "memory" && <MemoryMatchGame difficulty={difficulty} update={update} />}
    {game === "reaction" && <ReactionTapGame difficulty={difficulty} update={update} />}
    {game === "guess" && <GuessNumberGame difficulty={difficulty} update={update} />}
    {game === "trivia" && <TriviaDuelGame difficulty={difficulty} update={update} />}
    {game === "scramble" && <WordScrambleGame difficulty={difficulty} update={update} />}
    {game === "emoji" && <EmojiDecodeGame difficulty={difficulty} update={update} />}
    {game === "rapidfire" && <RapidFireGame difficulty={difficulty} update={update} />}
    {game === "wyr" && <WouldYouRatherGame difficulty={difficulty} update={update} />}
    {game === "codebreaker" && <NeonCodebreakerGame difficulty={difficulty} update={update} />}
    {game === "signal" && <SignalSequenceGame difficulty={difficulty} update={update} />}
    {game === "firewall" && <FirewallBreachGame difficulty={difficulty} update={update} />}
  </ArcadeGameShell>
}

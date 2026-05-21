import type { GameSessionState } from "@/lib/types"

export type Difficulty = "EASY" | "ADAPTIVE" | "HARD"
export type SessionResult = GameSessionState["result"]

export interface UpdatePayload {
  score?: number
  neoScore?: number
  completionTimeMs?: number
  reactionTimeMs?: number
  streak?: number
  forceProgression?: boolean
}

export interface ArcadeGameComponentProps {
  difficulty: Difficulty
  update: (result: SessionResult, robotResponse: string, payload?: UpdatePayload) => void
}

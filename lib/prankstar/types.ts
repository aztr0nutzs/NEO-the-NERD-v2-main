export interface PrankSound {
  id: string
  name: string
  category: PrankCategory
  packId: string
  assetPath: string
  sourcePath: string
  durationMs: number
  tags: string[]
  loopable: boolean
  intensityLevel: number
  isSafeForRandomMode: boolean
  description: string
  recommendedUse: string
  prankStyle: string
  previewLabel: string
}

export type PrankCategory =
  | "AMBIENCE"
  | "ANIMAL"
  | "CARTOON"
  | "CREEPY"
  | "FUNNY"
  | "GLITCH"
  | "OFFICE"
  | "ROBOT"
  | "SCI_FI"
  | "VOICE"
  | "DOOR_KNOCKS"
  | "FOOTSTEPS"
  | "HORROR_LITE"
  | (string & {})

export interface PrankAudioState {
  status: "idle" | "loading" | "playing" | "error"
  currentSoundId: string | null
  error: string | null
}

export type PrankAudioListener = (state: PrankAudioState) => void

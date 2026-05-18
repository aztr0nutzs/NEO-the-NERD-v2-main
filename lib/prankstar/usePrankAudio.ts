"use client"

import { useEffect, useState } from "react"
import { prankAudioRuntime } from "./prankAudioRuntime"
import type { PrankAudioState } from "./types"

export function usePrankAudio(): PrankAudioState {
  const [state, setState] = useState<PrankAudioState>(() =>
    prankAudioRuntime.getState(),
  )
  useEffect(() => prankAudioRuntime.subscribe(setState), [])
  return state
}

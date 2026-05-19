"use client"

import { useEffect, useState } from "react"
import {
  soundForgeManager,
  type SoundForgePreviewState,
} from "./soundForge"

export function useSoundForge(): SoundForgePreviewState {
  const [state, setState] = useState<SoundForgePreviewState>(() =>
    soundForgeManager.getState(),
  )
  useEffect(() => soundForgeManager.subscribe(setState), [])
  return state
}

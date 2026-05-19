"use client"

import { useEffect, useState } from "react"
import { chaosManager, type ChaosSnapshot } from "./chaosRandomizer"

export function useChaosRandomizer(): ChaosSnapshot {
  const [snap, setSnap] = useState<ChaosSnapshot>(() =>
    chaosManager.getSnapshot(),
  )
  useEffect(() => chaosManager.subscribe(setSnap), [])
  return snap
}

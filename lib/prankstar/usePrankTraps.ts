"use client"

import { useEffect, useState } from "react"
import { prankTrapsManager, type PrankTrapsSnapshot } from "./prankTraps"

export function usePrankTraps(): PrankTrapsSnapshot {
  const [snap, setSnap] = useState<PrankTrapsSnapshot>(() =>
    prankTrapsManager.getSnapshot(),
  )
  useEffect(() => prankTrapsManager.subscribe(setSnap), [])
  return snap
}

/**
 * Returns a millisecond tick (Date.now()) at a fixed cadence. Drives live
 * countdown labels on the Timer Traps screen without forcing the manager to
 * emit on every tick. 200ms is fast enough that a 5-second trap shows
 * smooth tenths but slow enough that idle CPU stays calm.
 */
export function useCountdownTick(intervalMs = 200): number {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

"use client";

import type { ScanState } from "@/lib/network/types";
import { ScanPulseWave } from "./ScanPulseWave";

interface NetworkMapStatusEffectsProps {
  isSceneActive: boolean;
  reducedMotion: boolean;
  scanProgress: number;
  scanState: ScanState;
}

export function NetworkMapStatusEffects({
  isSceneActive,
  reducedMotion,
  scanProgress,
  scanState,
}: NetworkMapStatusEffectsProps) {
  return (
    <ScanPulseWave
      isSceneActive={isSceneActive}
      reducedMotion={reducedMotion}
      scanProgress={scanProgress}
      scanState={scanState}
    />
  );
}

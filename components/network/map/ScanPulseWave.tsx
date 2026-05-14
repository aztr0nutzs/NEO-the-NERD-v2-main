"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { ScanState } from "@/lib/network/types";

interface ScanPulseWaveProps {
  isSceneActive: boolean;
  reducedMotion: boolean;
  scanProgress: number;
  scanState: ScanState;
}

export function ScanPulseWave({
  isSceneActive,
  reducedMotion,
  scanProgress,
  scanState,
}: ScanPulseWaveProps) {
  const waveRef = useRef<THREE.Mesh>(null);
  const failureRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!isSceneActive || reducedMotion) {
      if (waveRef.current) {
        waveRef.current.scale.setScalar(1.4 + (scanProgress / 100) * 7.8);
      }
      return;
    }
    const elapsed = clock.getElapsedTime();

    if (waveRef.current) {
      const progressRadius = 1.4 + (scanProgress / 100) * 7.8;
      const breathingRadius = scanState === "scanning"
        ? progressRadius + Math.sin(elapsed * 4.2) * 0.18
        : 2.1 + Math.sin(elapsed * 1.2) * 0.08;
      waveRef.current.scale.setScalar(breathingRadius);

      const material = waveRef.current.material as THREE.MeshBasicMaterial;
      material.opacity =
        scanState === "scanning"
          ? 0.32
          : scanState === "complete"
            ? 0.16
            : scanState === "failed"
              ? 0.04
              : 0.08;
    }

    if (failureRef.current) {
      failureRef.current.rotation.z = elapsed * 1.1;
      const material = failureRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = scanState === "failed" ? 0.28 + Math.sin(elapsed * 8) * 0.12 : 0;
    }
  });

  return (
    <group>
      <mesh ref={waveRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.012, 8, 128]} />
        <meshBasicMaterial color="#22d3ee" opacity={0.08} transparent />
      </mesh>
      <mesh ref={failureRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.018, 8, 96]} />
        <meshBasicMaterial color="#f43f5e" opacity={0} transparent />
      </mesh>
    </group>
  );
}

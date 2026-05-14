"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

export function MapParticles({
  isSceneActive,
  reducedMotion,
}: {
  isSceneActive: boolean;
  reducedMotion: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values: number[] = [];

    for (let index = 0; index < 64; index += 1) {
      const angle = index * 2.399963;
      const radius = 4.2 + (index % 10) * 0.72;
      values.push(
        Math.cos(angle) * radius,
        -1.6 + (index % 7) * 0.64,
        Math.sin(angle) * radius
      );
    }

    return new Float32Array(values);
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      if (!isSceneActive) return;
      pointsRef.current.rotation.y = reducedMotion ? 0 : clock.getElapsedTime() * 0.045;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#22d3ee" size={0.028} transparent opacity={reducedMotion ? 0.12 : 0.28} />
    </points>
  );
}

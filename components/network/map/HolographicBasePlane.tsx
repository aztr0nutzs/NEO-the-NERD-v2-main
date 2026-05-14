"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

export function HolographicBasePlane({
  isSceneActive,
  reducedMotion,
}: {
  isSceneActive: boolean;
  reducedMotion: boolean;
}) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current || reducedMotion || !isSceneActive) return;
    ringRef.current.rotation.y = clock.getElapsedTime() * 0.035;
  });

  return (
    <group ref={ringRef} position={[0, -1.82, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[8.8, 96]} />
        <meshBasicMaterial color="#082f49" opacity={0.08} transparent />
      </mesh>
      {[2.4, 4.6, 6.8, 8.8].map((radius, index) => (
        <mesh key={radius} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.008 + index * 0.002, 6, 128]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? "#22d3ee" : "#a855f7"}
            opacity={0.22 - index * 0.03}
            transparent
          />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <ringGeometry args={[1.1, 8.7, 4, 1]} />
        <meshBasicMaterial color="#22d3ee" opacity={0.08} transparent wireframe />
      </mesh>
    </group>
  );
}

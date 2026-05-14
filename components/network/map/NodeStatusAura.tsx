"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { NetworkTopologyNode } from "@/lib/network/types";

interface NodeStatusAuraProps {
  node: NetworkTopologyNode;
  color: string;
  radius?: number;
  intensity?: number;
  reducedMotion?: boolean;
}

export function NodeStatusAura({
  node,
  color,
  radius = 0.52,
  intensity = 1,
  reducedMotion = false,
}: NodeStatusAuraProps) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const scanRingRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const elapsed = clock.getElapsedTime();

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = elapsed * (node.trustLevel === "blocked" ? -0.9 : 0.45);
      const scale = 1 + Math.sin(elapsed * (node.isNew ? 3.6 : 1.8)) * 0.08;
      outerRingRef.current.scale.setScalar(scale);
    }

    if (scanRingRef.current) {
      scanRingRef.current.rotation.x = Math.PI / 2;
      scanRingRef.current.rotation.z = elapsed * 0.7;
    }
  });

  const opacity = (node.status === "offline" ? 0.1 : node.isFlagged ? 0.32 : 0.18) * intensity;

  return (
    <group>
      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.018, 8, 72]} />
        <meshBasicMaterial color={color} opacity={opacity} transparent />
      </mesh>

      {(node.trustLevel === "watch" || node.trustLevel === "blocked" || node.isNew) && (
        <mesh ref={scanRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.34, 0.012, 8, 64]} />
          <meshBasicMaterial
            color={node.trustLevel === "blocked" ? "#f43f5e" : node.isNew ? "#facc15" : "#fb923c"}
            opacity={node.status === "offline" ? 0.08 : 0.34}
            transparent
          />
        </mesh>
      )}
    </group>
  );
}

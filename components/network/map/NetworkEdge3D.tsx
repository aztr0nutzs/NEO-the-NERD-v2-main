"use client";

import { useMemo, useRef } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { Vector3 } from "three";
import type {
  NetworkTopologyEdge,
  NetworkTopologyNode,
  ScanState,
} from "@/lib/network/types";

interface NetworkEdge3DProps {
  edge: NetworkTopologyEdge;
  source: NetworkTopologyNode;
  target: NetworkTopologyNode;
  isDimmed: boolean;
  scanProgress: number;
  scanState: ScanState;
  reducedMotion: boolean;
  isSceneActive: boolean;
  isRelatedToSelection: boolean;
}

const QUALITY_COLORS: Record<NetworkTopologyEdge["quality"], string> = {
  strong: "#22d3ee",
  fair: "#a855f7",
  weak: "#fb923c",
  unknown: "#64748b",
};

export function NetworkEdge3D({
  edge,
  source,
  target,
  isDimmed,
  scanProgress,
  scanState,
  reducedMotion,
  isSceneActive,
  isRelatedToSelection,
}: NetworkEdge3DProps) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const sourcePosition = source.position ?? { x: 0, y: 0, z: 0 };
  const targetPosition = target.position ?? { x: 0, y: 0, z: 0 };

  const points = useMemo(() => {
    const start = new Vector3(sourcePosition.x, sourcePosition.y, sourcePosition.z);
    const end = new Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
    const midpoint = start.clone().lerp(end, 0.5);
    midpoint.y += edge.relation === "wireless-estimate" ? 1.45 : 0.75;
    midpoint.z += edge.isFlagged ? 0.3 : 0;

    return Array.from({ length: 18 }, (_, index) => {
      const t = index / 17;
      return quadraticPoint(start, midpoint, end, t);
    });
  }, [
    edge.relation,
    edge.isFlagged,
    sourcePosition.x,
    sourcePosition.y,
    sourcePosition.z,
    targetPosition.x,
    targetPosition.y,
    targetPosition.z,
  ]);

  const color = edge.isFlagged ? "#fb7185" : QUALITY_COLORS[edge.quality];
  const targetDistance = Math.sqrt(
    targetPosition.x * targetPosition.x + targetPosition.z * targetPosition.z
  );
  const scanRadius = 1.4 + (scanProgress / 100) * 8.2;
  const unreachedDuringScan = scanState === "scanning" && targetDistance > scanRadius + 0.8;
  const opacity = isDimmed
    ? 0.1
    : unreachedDuringScan
      ? 0.12
    : edge.visibilityState === "dimmed" || target.status === "offline"
      ? 0.18
      : isRelatedToSelection
        ? 0.95
      : edge.isFlagged
        ? 0.86
        : 0.58;

  useFrame(({ clock }) => {
    if (!pulseRef.current || !edge.animated || points.length === 0 || reducedMotion || !isSceneActive) return;

    const speed = edge.isFlagged ? 0.55 : 0.34;
    const t = (clock.getElapsedTime() * speed) % 1;
    const pointIndex = Math.min(points.length - 1, Math.floor(t * points.length));
    pulseRef.current.position.copy(points[pointIndex]);
  });

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={isRelatedToSelection ? 3 : edge.isFlagged ? 2.4 : 1.45}
        transparent
        opacity={opacity}
      />
      {(isRelatedToSelection || edge.isFlagged) && (
        <Line
          points={points}
          color={isRelatedToSelection ? "#e0f2fe" : "#fb7185"}
          lineWidth={4.2}
          transparent
          opacity={isRelatedToSelection ? 0.16 : 0.1}
        />
      )}
      {edge.quality === "weak" || edge.quality === "unknown" ? (
        <Line points={points.filter((_, index) => index % 2 === 0)} color="#f97316" lineWidth={1} transparent opacity={0.22} />
      ) : null}
      {edge.animated && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[isRelatedToSelection ? 0.095 : edge.isFlagged ? 0.075 : 0.055, 12, 12]} />
          <meshBasicMaterial color={color} opacity={target.status === "offline" ? 0.18 : 0.85} transparent />
        </mesh>
      )}
    </group>
  );
}

function quadraticPoint(start: Vector3, control: Vector3, end: Vector3, t: number) {
  const oneMinusT = 1 - t;
  return start
    .clone()
    .multiplyScalar(oneMinusT * oneMinusT)
    .add(control.clone().multiplyScalar(2 * oneMinusT * t))
    .add(end.clone().multiplyScalar(t * t));
}

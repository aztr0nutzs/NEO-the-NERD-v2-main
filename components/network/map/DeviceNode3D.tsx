"use client";

import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import type { DiscoveredDevice, NetworkMapLabelMode, NetworkTopologyNode } from "@/lib/network/types";
import { MapDeviceIcon } from "./MapDeviceIcon";
import { NetworkNodeTooltip } from "./NetworkNodeTooltip";
import { NodeStatusAura } from "./NodeStatusAura";

interface DeviceNode3DProps {
  node: NetworkTopologyNode;
  device: DiscoveredDevice | null;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  revealFactor: number;
  discoveryBoost: number;
  isAttentionNode: boolean;
  labelMode: NetworkMapLabelMode;
  reducedMotion: boolean;
  isSceneActive: boolean;
  onHover: (deviceId: string | null) => void;
  onSelect: (deviceId: string) => void;
}

const TRUST_COLORS: Record<NetworkTopologyNode["trustLevel"], string> = {
  trusted: "#22c55e",
  new: "#facc15",
  watch: "#fb923c",
  blocked: "#f43f5e",
};

const STATUS_OPACITY: Record<NetworkTopologyNode["status"], number> = {
  online: 1,
  offline: 0.28,
  unknown: 0.58,
};

export function DeviceNode3D({
  node,
  device,
  isSelected,
  isHovered,
  isDimmed,
  revealFactor,
  discoveryBoost,
  isAttentionNode,
  labelMode,
  reducedMotion,
  isSceneActive,
  onHover,
  onSelect,
}: DeviceNode3DProps) {
  const nodeRef = useRef<THREE.Group>(null);
  const position = node.position ?? { x: 0, y: 0, z: 0 };
  const color = node.deviceType === "unknown" ? "#a855f7" : TRUST_COLORS[node.trustLevel];
  const opacity = STATUS_OPACITY[node.status] * (isDimmed ? 0.32 : 1) * revealFactor;
  const highlightScale =
    (isSelected ? 1.28 : isHovered ? 1.14 : 1) *
    (0.72 + revealFactor * 0.28 + discoveryBoost * 0.12);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect(node.deviceId);
  };

  useFrame(({ clock }) => {
    if (!nodeRef.current || reducedMotion || !isSceneActive) return;
    const elapsed = clock.getElapsedTime();
    const activeMotion = isSelected || isHovered || discoveryBoost > 0;
    nodeRef.current.rotation.y = activeMotion ? Math.sin(elapsed * 1.2) * 0.18 : Math.sin(elapsed * 0.45) * 0.04;
    nodeRef.current.position.y = Math.sin(elapsed * 1.4 + position.x) * (activeMotion ? 0.055 : 0.025);
  });

  return (
    <group
      ref={nodeRef}
      position={[position.x, position.y, position.z]}
      scale={highlightScale}
      onPointerDown={handlePointerDown}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(node.deviceId);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHover(null);
      }}
    >
      <mesh visible={false}>
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <NodeStatusAura
        node={node}
        color={color}
        radius={isSelected ? 0.78 : node.isFlagged ? 0.58 : 0.48}
        intensity={revealFactor + discoveryBoost}
        reducedMotion={reducedMotion}
      />
      {(isSelected || isHovered || discoveryBoost > 0) && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[isAttentionNode ? 0.78 : 0.66, 0.016, 8, 72]} />
          <meshBasicMaterial
            color={discoveryBoost > 0 ? "#facc15" : "#67e8f9"}
            opacity={isSelected ? 0.18 : discoveryBoost > 0 ? 0.2 : 0.1}
            transparent
          />
        </mesh>
      )}
      <DeviceShape node={node} color={color} opacity={opacity} />
      <MapDeviceIcon
        device={device}
        labelMode={labelMode}
        node={node}
        color={node.status === "offline" ? "#94a3b8" : "#f8fafc"}
      />
      {(isHovered || isSelected) && <NetworkNodeTooltip node={node} device={device} />}
    </group>
  );
}

function DeviceShape({
  node,
  color,
  opacity,
}: {
  node: NetworkTopologyNode;
  color: string;
  opacity: number;
}) {
  const material = (
    <meshStandardMaterial
      color="#0f172a"
      emissive={color}
      emissiveIntensity={node.status === "offline" ? 0.08 : node.isFlagged ? 0.85 : 0.48}
      metalness={0.42}
      opacity={opacity}
      roughness={0.32}
      transparent
    />
  );

  switch (node.deviceType) {
    case "phone":
      return (
        <group>
          <mesh scale={[0.36, 0.64, 0.09]}>{material}<boxGeometry args={[1, 1, 1]} /></mesh>
          <mesh position={[0, 0.28, 0.065]} scale={[0.24, 0.015, 0.01]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={color} opacity={0.55} transparent />
          </mesh>
          <mesh position={[0, -0.23, 0.06]} scale={[0.08, 0.02, 0.01]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={color} opacity={0.8} transparent />
          </mesh>
        </group>
      );
    case "computer":
      return (
        <group>
          <mesh scale={[0.72, 0.46, 0.08]}>{material}<boxGeometry args={[1, 1, 1]} /></mesh>
          <mesh position={[0, 0.02, 0.065]} scale={[0.58, 0.32, 0.01]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={color} opacity={0.12} transparent />
          </mesh>
          <mesh position={[0, -0.38, 0]} scale={[0.18, 0.22, 0.06]}>{material}<boxGeometry args={[1, 1, 1]} /></mesh>
          <mesh position={[0, -0.52, 0]} scale={[0.48, 0.05, 0.18]}>{material}<boxGeometry args={[1, 1, 1]} /></mesh>
        </group>
      );
    case "tv":
      return (
        <group>
          <mesh scale={[0.86, 0.48, 0.08]}>
            <boxGeometry args={[1, 1, 1]} />
            {material}
          </mesh>
          <mesh position={[0, -0.34, 0]} scale={[0.18, 0.16, 0.06]}>{material}<boxGeometry args={[1, 1, 1]} /></mesh>
        </group>
      );
    case "console":
      return (
        <mesh rotation={[0.35, 0.35, 0]} scale={[0.62, 0.22, 0.42]}>
          <boxGeometry args={[1, 1, 1]} />
          {material}
        </mesh>
      );
    case "printer":
      return (
        <group>
          <mesh scale={[0.68, 0.28, 0.42]}>{material}<boxGeometry args={[1, 1, 1]} /></mesh>
          <mesh position={[0, 0.22, 0]} scale={[0.52, 0.16, 0.34]}>{material}<boxGeometry args={[1, 1, 1]} /></mesh>
        </group>
      );
    case "iot":
      return (
        <group>
          <mesh rotation={[0.45, 0.75, 0.2]} scale={[0.44, 0.44, 0.44]}>
            <boxGeometry args={[1, 1, 1]} />
            {material}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.48, 0.01, 6, 48]} />
            <meshBasicMaterial color={color} opacity={0.26} transparent />
          </mesh>
        </group>
      );
    case "unknown":
      return (
        <mesh rotation={[0.3, 0.65, 0.1]}>
          <octahedronGeometry args={[0.44, 0]} />
          {material}
        </mesh>
      );
    case "router":
    default:
      return (
        <mesh>
          <cylinderGeometry args={[0.46, 0.46, 0.28, 8]} />
          {material}
        </mesh>
      );
  }
}

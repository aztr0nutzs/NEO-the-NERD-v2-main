"use client";

import { useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import type {
  DiscoveredDevice,
  NetworkMapLabelMode,
  NetworkTopologyNode,
  ScanState,
} from "@/lib/network/types";
import { NetworkNodeTooltip } from "./NetworkNodeTooltip";

interface RouterCoreNode3DProps {
  node: NetworkTopologyNode;
  device: DiscoveredDevice | null;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  labelMode: NetworkMapLabelMode;
  scanState: ScanState;
  reducedMotion: boolean;
  isSceneActive: boolean;
  onHover: (deviceId: string | null) => void;
  onSelect: (deviceId: string) => void;
}

export function RouterCoreNode3D({
  node,
  device,
  isSelected,
  isHovered,
  isDimmed,
  labelMode,
  scanState,
  reducedMotion,
  isSceneActive,
  onHover,
  onSelect,
}: RouterCoreNode3DProps) {
  const position = node.position ?? { x: 0, y: 0, z: 0 };
  const coreRef = useRef<THREE.Group>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const ringCRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (reducedMotion || !isSceneActive) return;
    const elapsed = clock.getElapsedTime();

    if (coreRef.current) {
      coreRef.current.rotation.y = elapsed * 0.18;
    }

    if (ringARef.current) {
      ringARef.current.rotation.z = elapsed * 0.72;
    }

    if (ringBRef.current) {
      ringBRef.current.rotation.x = Math.PI / 2.6;
      ringBRef.current.rotation.z = -elapsed * 0.52;
    }

    if (ringCRef.current) {
      ringCRef.current.rotation.y = elapsed * 0.38;
      ringCRef.current.rotation.z = elapsed * 0.24;
    }

    if (beaconRef.current) {
      beaconRef.current.rotation.y = -elapsed * 0.62;
    }

    if (pulseRef.current) {
      const pulseRate = scanState === "scanning" ? 0.85 : 1.8;
      const pulse = 1.8 + (elapsed % pulseRate) * (scanState === "scanning" ? 1.3 : 0.7);
      pulseRef.current.scale.setScalar(pulse);
      const material = pulseRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, (scanState === "failed" ? 0.22 : 0.18) - (pulse - 1.8) * 0.12);
    }
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect(node.deviceId);
  };

  return (
    <group
      position={[position.x, position.y, position.z]}
      scale={isSelected ? 1.16 : isHovered ? 1.08 : 1}
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
        <sphereGeometry args={[1.65, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.72, 32, 16]} />
        <meshBasicMaterial color="#22d3ee" opacity={isDimmed ? 0.04 : 0.12} transparent wireframe />
      </mesh>

      <group ref={coreRef}>
        <mesh>
          <icosahedronGeometry args={[0.96, 1]} />
          <meshBasicMaterial color="#22d3ee" opacity={0.08} transparent wireframe />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.72, 2]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#22d3ee"
            emissiveIntensity={1.08}
            metalness={0.75}
            roughness={0.28}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.38, 32, 16]} />
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={1.5}
            metalness={0.45}
            roughness={0.18}
          />
        </mesh>
      </group>

      <mesh ref={ringARef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.02, 0.025, 10, 96]} />
        <meshBasicMaterial color="#22d3ee" opacity={0.78} transparent />
      </mesh>
      <mesh ref={ringBRef} rotation={[Math.PI / 2.6, 0, 0]}>
        <torusGeometry args={[1.32, 0.018, 10, 96]} />
        <meshBasicMaterial color="#a855f7" opacity={0.48} transparent />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.08, 0.015, 8, 80]} />
        <meshBasicMaterial color="#ec4899" opacity={0.34} transparent />
      </mesh>
      <mesh ref={ringCRef} rotation={[0.8, 0.2, 0.4]}>
        <torusGeometry args={[1.55, 0.011, 8, 112]} />
        <meshBasicMaterial color="#67e8f9" opacity={0.28} transparent />
      </mesh>

      <group ref={beaconRef}>
        {[0, 1, 2].map((index) => {
          const angle = (Math.PI * 2 * index) / 3;
          return (
            <mesh key={index} position={[Math.cos(angle) * 1.34, 0.08, Math.sin(angle) * 1.34]}>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshBasicMaterial color={index === 1 ? "#ec4899" : "#22d3ee"} opacity={0.85} transparent />
            </mesh>
          );
        })}
      </group>

      <Text
        color="#020617"
        fontSize={0.44}
        fontWeight={900}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.42]}
      >
        N
      </Text>
      <Text
        color="#67e8f9"
        fontSize={0.2}
        anchorX="center"
        anchorY="middle"
        position={[0, -1.05, 0]}
        rotation={[-Math.PI / 4.5, 0, 0]}
      >
        {getRouterLabel({ device, labelMode, node })}
      </Text>
      {(isHovered || isSelected) && <NetworkNodeTooltip node={node} device={device} />}
    </group>
  );
}

function getRouterLabel({
  device,
  labelMode,
  node,
}: {
  device: DiscoveredDevice | null;
  labelMode: NetworkMapLabelMode;
  node: NetworkTopologyNode;
}) {
  if (labelMode === "off") return node.label;
  if (labelMode === "ip") return device?.ipAddress ?? node.label;
  if (labelMode === "vendor") return device?.vendor ?? node.vendor ?? node.label;
  if (labelMode === "status") return node.status.toUpperCase();
  return node.label;
}

"use client";

import { useMemo } from "react";
import type {
  DiscoveredDevice,
  NetworkMapLabelMode,
  NetworkMapNodeOperationalState,
  NetworkMapOverlayMode,
  NetworkTopologyGraph,
  ScanState,
} from "@/lib/network/types";
import { assignNodePositions } from "@/lib/network/map-layout";
import { DeviceNode3D } from "./DeviceNode3D";
import { DiscoveryRevealController } from "./DiscoveryRevealController";
import { HolographicBasePlane } from "./HolographicBasePlane";
import { MapParticles } from "./MapParticles";
import { NetworkEdge3D } from "./NetworkEdge3D";
import { NetworkMapStatusEffects } from "./NetworkMapStatusEffects";
import { RouterCoreNode3D } from "./RouterCoreNode3D";

interface NetworkMapSceneProps {
  topologyGraph: NetworkTopologyGraph;
  devices: DiscoveredDevice[];
  selectedDeviceId: string | null;
  hoveredDeviceId: string | null;
  visibleDeviceIds: string[];
  labelMode: NetworkMapLabelMode;
  reducedMotion: boolean;
  scanProgress: number;
  scanState: ScanState;
  showLinks: boolean;
  showParticles: boolean;
  overlayMode: NetworkMapOverlayMode;
  nodeStates: Map<string, NetworkMapNodeOperationalState>;
  isSceneActive: boolean;
  onNodeHover: (deviceId: string | null) => void;
  onNodeSelect: (deviceId: string) => void;
}

export function NetworkMapScene({
  topologyGraph,
  devices,
  selectedDeviceId,
  hoveredDeviceId,
  visibleDeviceIds,
  labelMode,
  reducedMotion,
  scanProgress,
  scanState,
  showLinks,
  showParticles,
  overlayMode,
  nodeStates,
  isSceneActive,
  onNodeHover,
  onNodeSelect,
}: NetworkMapSceneProps) {
  const graph = useMemo(() => assignNodePositions(topologyGraph), [topologyGraph]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const deviceById = useMemo(() => new Map(devices.map((device) => [device.id, device])), [devices]);
  const visibleDeviceIdSet = useMemo(() => new Set(visibleDeviceIds), [visibleDeviceIds]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5.8, 0]} intensity={1.75} color="#22d3ee" distance={18} />
      <pointLight position={[6, 4, 7]} intensity={0.85} color="#a855f7" distance={18} />
      <pointLight position={[-7, 2.5, -6]} intensity={0.48} color="#ec4899" distance={18} />
      <directionalLight position={[-5, 7, -4]} intensity={0.45} color="#e0f2fe" />

      <gridHelper args={[18, 18, "#164e63", "#111827"]} position={[0, -1.75, 0]} />
      <HolographicBasePlane isSceneActive={isSceneActive} reducedMotion={reducedMotion} />
      {showParticles && <MapParticles isSceneActive={isSceneActive} reducedMotion={reducedMotion} />}
      <NetworkMapStatusEffects
        isSceneActive={isSceneActive}
        reducedMotion={reducedMotion}
        scanProgress={scanProgress}
        scanState={scanState}
      />

      {showLinks && graph.edges.map((edge) => {
        const source = nodeById.get(edge.sourceNodeId);
        const target = nodeById.get(edge.targetNodeId);

        if (!source || !target) return null;

        return (
          <NetworkEdge3D
            key={edge.id}
            edge={edge}
            source={source}
            target={target}
            isDimmed={
              visibleDeviceIdSet.size > 0 &&
              (!visibleDeviceIdSet.has(source.deviceId) || !visibleDeviceIdSet.has(target.deviceId))
            }
            scanProgress={scanProgress}
            scanState={scanState}
            reducedMotion={reducedMotion}
            isSceneActive={isSceneActive}
            isRelatedToSelection={
              selectedDeviceId !== null &&
              (source.deviceId === selectedDeviceId || target.deviceId === selectedDeviceId)
            }
          />
        );
      })}

      {graph.nodes.map((node, nodeIndex) => (
        <DiscoveryRevealController
          key={node.id}
          node={node}
          nodeIndex={nodeIndex}
          totalNodes={graph.nodes.length}
          scanProgress={scanProgress}
          scanState={scanState}
        >
          {({ revealFactor, discoveryBoost, isAttentionNode }) => (
            node.role === "gateway" ? (
              <RouterCoreNode3D
                node={node}
                device={deviceById.get(node.deviceId) ?? null}
                isSelected={selectedDeviceId === node.deviceId}
                isHovered={hoveredDeviceId === node.deviceId}
                isDimmed={visibleDeviceIdSet.size > 0 && !visibleDeviceIdSet.has(node.deviceId)}
                labelMode={labelMode}
                overlayMode={overlayMode}
                nodeState={nodeStates.get(node.deviceId) ?? null}
                onHover={onNodeHover}
                onSelect={onNodeSelect}
                scanState={scanState}
                reducedMotion={reducedMotion}
                isSceneActive={isSceneActive}
              />
            ) : (
              <DeviceNode3D
                node={node}
                device={deviceById.get(node.deviceId) ?? null}
                isSelected={selectedDeviceId === node.deviceId}
                isHovered={hoveredDeviceId === node.deviceId}
                isDimmed={visibleDeviceIdSet.size > 0 && !visibleDeviceIdSet.has(node.deviceId)}
                revealFactor={revealFactor}
                discoveryBoost={discoveryBoost}
                isAttentionNode={isAttentionNode}
                labelMode={labelMode}
                overlayMode={overlayMode}
                nodeState={nodeStates.get(node.deviceId) ?? null}
                reducedMotion={reducedMotion}
                isSceneActive={isSceneActive}
                onHover={onNodeHover}
                onSelect={onNodeSelect}
              />
            )
          )}
        </DiscoveryRevealController>
      ))}
    </>
  );
}

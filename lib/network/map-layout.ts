import type { NetworkTopologyGraph, NetworkTopologyNode } from "./types";

const ROLE_RADIUS: Record<NetworkTopologyNode["role"], number> = {
  gateway: 0,
  "access-point": 4.4,
  client: 6,
  unknown: 7.2,
};

export function getDeviceClusterOffset(node: NetworkTopologyNode, index: number) {
  const typeOffsets: Record<NetworkTopologyNode["deviceType"], number> = {
    router: 0,
    computer: 0.15,
    phone: 0.65,
    console: 1.15,
    tv: 1.75,
    printer: 2.25,
    iot: 2.75,
    unknown: 3.3,
  };

  return typeOffsets[node.deviceType] + index * 0.17;
}

export function generateOrbitalTopologyLayout(nodes: NetworkTopologyNode[]) {
  const nonGatewayNodes = nodes.filter((node) => node.role !== "gateway");
  const total = Math.max(nonGatewayNodes.length, 1);

  return new Map(
    nodes.map((node, index) => {
      if (node.role === "gateway") {
        return [node.id, { x: 0, y: 0, z: 0 }];
      }

      const orbitalIndex = nonGatewayNodes.findIndex((item) => item.id === node.id);
      const angle = (Math.PI * 2 * orbitalIndex) / total + getDeviceClusterOffset(node, index);
      const radius = ROLE_RADIUS[node.role] + (node.isFlagged ? 0.8 : 0) + (orbitalIndex % 2) * 0.35;
      const shell = orbitalIndex % 3;
      const heightBase = shell === 0 ? -1.55 : shell === 1 ? 0.65 : 2.1;
      const height = heightBase + Math.sin(angle * 1.4) * 0.55;
      const depthStretch = 1.1 + shell * 0.18;

      return [
        node.id,
        {
          x: Number((Math.cos(angle) * radius).toFixed(2)),
          y: Number(height.toFixed(2)),
          z: Number((Math.sin(angle) * radius * depthStretch).toFixed(2)),
        },
      ];
    })
  );
}

export function assignNodePositions(graph: NetworkTopologyGraph): NetworkTopologyGraph {
  const generatedPositions = generateOrbitalTopologyLayout(graph.nodes);

  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: node.position ?? generatedPositions.get(node.id) ?? { x: 0, y: 0, z: 0 },
    })),
  };
}

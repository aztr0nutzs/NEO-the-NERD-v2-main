/**
 * N.E.O. the N.E.R.D. - Network Topology Helpers
 *
 * These helpers build truthful demo/estimated topology data for future map views.
 * They do not claim physical path confirmation unless a backend provides it.
 */

import type {
  DeviceType,
  DiscoveredDevice,
  NetworkTopologyEdge,
  NetworkTopologyEdgeQuality,
  NetworkTopologyEdgeRelation,
  NetworkTopologyGraph,
  NetworkTopologyMode,
  NetworkTopologyNode,
  NetworkTopologyRole,
} from "./types";
import { assignNodePositions, generateOrbitalTopologyLayout } from "./map-layout";

const DEVICE_ICON_KEYS: Record<DeviceType, string> = {
  phone: "smartphone",
  computer: "monitor",
  router: "router",
  iot: "cpu",
  tv: "tv",
  console: "gamepad",
  printer: "printer",
  unknown: "help-circle",
};

export function deriveTopologyNodeRole(device: DiscoveredDevice): NetworkTopologyRole {
  if (device.deviceType === "router" || device.ipAddress.endsWith(".1")) {
    return "gateway";
  }

  if (device.hostname.toLowerCase().includes("ap")) {
    return "access-point";
  }

  if (device.deviceType === "unknown") {
    return "unknown";
  }

  return "client";
}

export function deriveEdgeQuality(device: DiscoveredDevice): NetworkTopologyEdgeQuality {
  if (device.status === "offline") {
    return "unknown";
  }

  if (typeof device.signalStrength === "number") {
    if (device.signalStrength >= -55) return "strong";
    if (device.signalStrength >= -70) return "fair";
    return "weak";
  }

  if (typeof device.latencyMs === "number") {
    if (device.latencyMs <= 5) return "strong";
    if (device.latencyMs <= 20) return "fair";
    return "weak";
  }

  return "unknown";
}

export function deriveEdgeRelation(device: DiscoveredDevice): NetworkTopologyEdgeRelation {
  if (device.status === "offline") {
    return "unknown";
  }

  if (typeof device.signalStrength === "number") {
    return "wireless-estimate";
  }

  if (device.deviceType === "computer" || device.deviceType === "console") {
    return "wired-estimate";
  }

  return "logical-estimate";
}

export function buildTopologyGraphFromDevices(
  devices: DiscoveredDevice[],
  topologyMode: NetworkTopologyMode = "estimated"
): NetworkTopologyGraph {
  const gatewayDevice =
    devices.find((device) => deriveTopologyNodeRole(device) === "gateway") ?? devices[0];
  const gatewayNodeId = gatewayDevice ? `node-${gatewayDevice.id}` : "";
  const nonGatewayDevices = devices.filter((device) => device.id !== gatewayDevice?.id);

  const nodesWithoutPositions: NetworkTopologyNode[] = devices.map((device) => {
    const role = deriveTopologyNodeRole(device);

    return {
      id: `node-${device.id}`,
      deviceId: device.id,
      label: device.name,
      deviceType: device.deviceType,
      status: device.status,
      trustLevel: device.trustLevel,
      role,
      signalStrength: device.signalStrength,
      latencyMs: device.latencyMs,
      isNew: device.trustLevel === "new",
      isFlagged: device.trustLevel === "new" || device.trustLevel === "watch" || device.trustLevel === "blocked",
      services: [...device.services],
      vendor: device.vendor,
      iconKey: DEVICE_ICON_KEYS[device.deviceType],
      identityConfidence: device.identityConfidence,
      ownerLabel: device.ownerLabel,
      room: device.room,
      manuallyVerified: device.manuallyVerified,
    };
  });
  const generatedPositions = generateOrbitalTopologyLayout(nodesWithoutPositions);
  const nodes = nodesWithoutPositions.map((node) => ({
    ...node,
    position: generatedPositions.get(node.id) ?? { x: 0, y: 0, z: 0 },
  }));

  const edges: NetworkTopologyEdge[] = nonGatewayDevices.map((device) => {
    const relation = topologyMode === "backend-confirmed" ? "gateway-link" : deriveEdgeRelation(device);

    return {
      id: `edge-${gatewayDevice?.id ?? "gateway"}-${device.id}`,
      sourceNodeId: gatewayNodeId,
      targetNodeId: `node-${device.id}`,
      relation,
      quality: deriveEdgeQuality(device),
      latencyMs: device.latencyMs,
      signalStrength: device.signalStrength,
      animated: device.status === "online",
      isFlagged: device.trustLevel === "new" || device.trustLevel === "watch" || device.trustLevel === "blocked",
      visibilityState: device.status === "offline" ? "dimmed" : "visible",
    };
  });

  return normalizeTopologyGraph({
    nodes,
    edges,
    generatedAt: new Date().toISOString(),
    topologyMode,
    summary: {
      gatewayNodeId,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      flaggedNodes: nodes.filter((node) => node.isFlagged).length,
      unknownNodes: nodes.filter(
        (node) => node.deviceType === "unknown" || node.trustLevel === "new" || node.role === "unknown"
      ).length,
    },
  });
}

export function createDemoTopologyGraph(devices: DiscoveredDevice[]): NetworkTopologyGraph {
  return buildTopologyGraphFromDevices(devices, "demo");
}

export function normalizeTopologyGraph(graph: NetworkTopologyGraph): NetworkTopologyGraph {
  const positionedGraph = assignNodePositions(graph);
  const visibleNodeIds = new Set(graph.nodes.map((node) => node.id));
  const edges = positionedGraph.edges.filter(
    (edge) => visibleNodeIds.has(edge.sourceNodeId) && visibleNodeIds.has(edge.targetNodeId)
  );

  return {
    ...positionedGraph,
    nodes: sortTopologyNodesForDisplay(positionedGraph.nodes),
    edges,
    summary: {
      ...positionedGraph.summary,
      totalNodes: positionedGraph.nodes.length,
      totalEdges: edges.length,
      flaggedNodes: positionedGraph.nodes.filter((node) => node.isFlagged).length,
      unknownNodes: positionedGraph.nodes.filter(
        (node) => node.deviceType === "unknown" || node.trustLevel === "new" || node.role === "unknown"
      ).length,
    },
  };
}

export function sortTopologyNodesForDisplay(nodes: NetworkTopologyNode[]): NetworkTopologyNode[] {
  const roleRank: Record<NetworkTopologyRole, number> = {
    gateway: 0,
    "access-point": 1,
    client: 2,
    unknown: 3,
  };

  return [...nodes].sort((a, b) => roleRank[a.role] - roleRank[b.role] || a.label.localeCompare(b.label));
}

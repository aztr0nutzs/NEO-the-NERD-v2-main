"use client";

import { Text } from "@react-three/drei";
import type { DiscoveredDevice, NetworkMapLabelMode, NetworkTopologyNode } from "@/lib/network/types";

const DEVICE_GLYPHS: Record<NetworkTopologyNode["deviceType"], string> = {
  phone: "P",
  computer: "C",
  router: "R",
  iot: "I",
  tv: "TV",
  console: "G",
  printer: "PR",
  unknown: "?",
};

interface MapDeviceIconProps {
  device: DiscoveredDevice | null;
  labelMode: NetworkMapLabelMode;
  node: NetworkTopologyNode;
  color: string;
}

export function MapDeviceIcon({ device, labelMode, node, color }: MapDeviceIconProps) {
  const label = getNodeLabel({ device, labelMode, node });

  return (
    <group>
      <Text
        color={color}
        fontSize={node.deviceType === "tv" || node.deviceType === "printer" ? 0.22 : 0.28}
        anchorX="center"
        anchorY="middle"
        position={[0, 0.02, 0.04]}
        outlineColor="#020617"
        outlineWidth={0.012}
      >
        {DEVICE_GLYPHS[node.deviceType]}
      </Text>
      {label && (
        <Text
          color="#dffbff"
          fontSize={0.16}
          anchorX="center"
          anchorY="middle"
          position={[0, -0.78, 0.08]}
          outlineColor="#020617"
          outlineWidth={0.018}
          maxWidth={2.1}
        >
          {label}
        </Text>
      )}
    </group>
  );
}

function getNodeLabel({
  device,
  labelMode,
  node,
}: {
  device: DiscoveredDevice | null;
  labelMode: NetworkMapLabelMode;
  node: NetworkTopologyNode;
}) {
  if (labelMode === "off") return "";
  if (labelMode === "ip") return device?.ipAddress ?? "";
  if (labelMode === "vendor") return device?.vendor ?? node.vendor ?? "";
  if (labelMode === "status") return node.status.toUpperCase();
  return node.label;
}

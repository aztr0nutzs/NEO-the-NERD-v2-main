"use client";

import type { ReactNode } from "react";
import type { NetworkTopologyNode, ScanState } from "@/lib/network/types";

interface DiscoveryRevealControllerProps {
  children: (state: {
    revealFactor: number;
    discoveryBoost: number;
    isAttentionNode: boolean;
  }) => ReactNode;
  node: NetworkTopologyNode;
  nodeIndex: number;
  totalNodes: number;
  scanProgress: number;
  scanState: ScanState;
}

export function DiscoveryRevealController({
  children,
  node,
  nodeIndex,
  totalNodes,
  scanProgress,
  scanState,
}: DiscoveryRevealControllerProps) {
  if (node.role === "gateway" || scanState === "idle") {
    return children({ revealFactor: 1, discoveryBoost: 0, isAttentionNode: false });
  }

  const threshold = ((nodeIndex + 1) / Math.max(totalNodes, 1)) * 84;
  const revealFactor =
    scanState === "scanning"
      ? clamp((scanProgress - threshold + 18) / 18)
      : 1;

  const isAttentionNode =
    node.isFlagged === true || node.isNew === true || node.deviceType === "unknown";
  const discoveryBoost =
    scanState === "complete" && isAttentionNode
      ? 1
      : scanState === "failed"
        ? 0.65
        : scanState === "scanning" && isAttentionNode && revealFactor > 0.65
          ? 0.8
          : 0;

  return children({ revealFactor, discoveryBoost, isAttentionNode });
}

function clamp(value: number) {
  return Math.max(0.12, Math.min(value, 1));
}

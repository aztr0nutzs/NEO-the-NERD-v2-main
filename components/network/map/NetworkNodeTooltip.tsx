"use client";

import { Html } from "@react-three/drei";
import type { DiscoveredDevice, NetworkTopologyNode } from "@/lib/network/types";

interface NetworkNodeTooltipProps {
  node: NetworkTopologyNode;
  device: DiscoveredDevice | null;
}

export function NetworkNodeTooltip({ node, device }: NetworkNodeTooltipProps) {
  return (
    <Html center distanceFactor={8} position={[0, 0.95, 0]} zIndexRange={[60, 20]}>
      <div className="pointer-events-none min-w-[190px] rounded-lg border border-cyan-400/40 bg-black/90 p-3 shadow-[0_0_28px_rgba(34,211,238,0.22)] backdrop-blur-md">
        <div className="mb-2 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
          {device?.name ?? node.label}
        </div>
        <div className="space-y-1 font-mono text-[10px] uppercase tracking-wider">
          <TooltipRow label="IP" value={device?.ipAddress ?? "UNKNOWN"} />
          <TooltipRow label="TYPE" value={node.deviceType} />
          <TooltipRow label="STATUS" value={node.status} />
          <TooltipRow label="TRUST" value={node.trustLevel} />
          {device && <TooltipRow label="CONF" value={device.confidence} />}
          {device && <TooltipRow label="SRC" value={device.lastScanSource} />}
        </div>
      </div>
    </Html>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}

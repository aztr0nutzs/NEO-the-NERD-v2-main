"use client";

import type { ReactNode } from "react";
import { Crosshair, MousePointer2 } from "lucide-react";
import type { DiscoveredDevice } from "@/lib/network/types";

interface NetworkMapSelectionOverlayProps {
  selectedDevice: DiscoveredDevice | null;
  hoveredDevice: DiscoveredDevice | null;
  onFocusSelected: () => void;
  onResetCamera: () => void;
  onFitAll: () => void;
}

export function NetworkMapSelectionOverlay({
  selectedDevice,
  hoveredDevice,
  onFocusSelected,
  onResetCamera,
  onFitAll,
}: NetworkMapSelectionOverlayProps) {
  const displayDevice = hoveredDevice ?? selectedDevice;

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-20 w-[min(280px,calc(100%-24px))] rounded-lg border border-cyan-500/25 bg-black/75 p-3 backdrop-blur-md">
      <div className="mb-2 flex items-center gap-2">
        <MousePointer2 className="h-3.5 w-3.5 text-cyan-300" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          NODE_TARGET
        </span>
      </div>
      {displayDevice ? (
        <div className="space-y-1 font-mono text-[10px] uppercase tracking-wider">
          <p className="truncate text-sm font-black tracking-normal text-gray-100">
            {displayDevice.name}
          </p>
          <p className="text-gray-500">{displayDevice.ipAddress}</p>
          <p className="text-gray-500">
            {displayDevice.deviceType} / {displayDevice.status} / {displayDevice.trustLevel}
          </p>
          <p className="text-cyan-400/80">
            {displayDevice.confidence} confidence / {displayDevice.lastScanSource}
          </p>
          <p className="text-purple-300/80">
            {(displayDevice.manuallyVerified ? "verified" : "unverified")} identity
            {displayDevice.room ? ` / ${displayDevice.room}` : ""}
          </p>
        </div>
      ) : (
        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
          Hover or tap a node to inspect topology details.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <ControlButton label="FIT" onClick={onFitAll} />
        <ControlButton label="RESET" onClick={onResetCamera} />
        <ControlButton
          label="FOCUS"
          onClick={onFocusSelected}
          disabled={!selectedDevice}
          icon={<Crosshair className="h-3 w-3" />}
        />
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-900/40 disabled:text-gray-600"
    >
      {icon}
      {label}
    </button>
  );
}

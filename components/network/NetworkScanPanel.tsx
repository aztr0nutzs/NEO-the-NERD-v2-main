"use client";

import { useState } from "react";
import { Radar, Square, Clock, Zap, Scale, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NetworkStatus, ScanComparisonSummary, ScanMode } from "@/lib/network/types";

interface NetworkScanPanelProps {
  status: NetworkStatus;
  scanProgress: number;
  selectedMode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  onStartScan: () => void;
  onStopScan: () => void;
  isDemoMode: boolean;
  lastScanDelta?: ScanComparisonSummary | null;
}

const SCAN_MODES: { mode: ScanMode; label: string; icon: typeof Zap; description: string }[] = [
  {
    mode: "quick",
    label: "QUICK",
    icon: Zap,
    description: "Context + gateway + shallow host probe",
  },
  {
    mode: "balanced",
    label: "BALANCED",
    icon: Scale,
    description: "Quick + ARP/MAC + hostname + SSDP + bounded ports",
  },
  {
    mode: "deep",
    label: "DEEP",
    icon: Search,
    description: "Balanced + larger cap + expanded bounded ports",
  },
];

export function NetworkScanPanel({
  status,
  scanProgress,
  selectedMode,
  onModeChange,
  onStartScan,
  onStopScan,
  isDemoMode,
  lastScanDelta,
}: NetworkScanPanelProps) {
  const isScanning = status.scanState === "scanning";

  const formatLastScan = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4 rounded-lg border border-cyan-500/30 bg-black/60 p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-cyan-400" />
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-cyan-400">
            SCAN_CONTROL
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          <span>LAST: {formatLastScan(status.lastScanAt)}</span>
        </div>
      </div>

      {/* Scan Mode Selector */}
      <div className="grid grid-cols-3 gap-2">
        {SCAN_MODES.map(({ mode, label, icon: Icon, description }) => (
          <button
            key={mode}
            onClick={() => !isScanning && onModeChange(mode)}
            disabled={isScanning}
            className={`
              relative flex flex-col items-center gap-1 rounded-lg border p-3
              font-mono text-xs transition-all duration-200
              ${
                selectedMode === mode
                  ? "border-cyan-400 bg-cyan-500/10 text-cyan-400"
                  : "border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500 hover:text-gray-300"
              }
              ${isScanning ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
            `}
          >
            <Icon className="h-4 w-4" />
            <span className="font-bold tracking-wider">{label}</span>
            <span className="text-[10px] text-gray-500">{description}</span>
            {selectedMode === mode && (
              <div className="absolute -right-px -top-px h-2 w-2 rounded-bl rounded-tr bg-cyan-400" />
            )}
          </button>
        ))}
      </div>

      {/* Scan Progress */}
      {isScanning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-cyan-400">SCANNING_NETWORK...</span>
            <span className="text-cyan-300">{Math.round(scanProgress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            <span className="animate-pulse">
              {selectedMode === "quick" && "Resolving local context + gateway + shallow host probe..."}
              {selectedMode === "balanced" && "Running ARP/MAC, hostname, SSDP, and bounded port probes..."}
              {selectedMode === "deep" && "Running expanded local host cap, timeout, and bounded port/service inference..."}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!isScanning ? (
          <Button
            onClick={onStartScan}
            className="flex-1 border border-cyan-500/50 bg-cyan-500/20 font-mono text-sm font-bold uppercase tracking-wider text-cyan-400 transition-all hover:bg-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/20"
          >
            <Radar className="mr-2 h-4 w-4" />
            START_SCAN
          </Button>
        ) : (
          <Button
            onClick={onStopScan}
            variant="destructive"
            className="flex-1 border border-red-500/50 bg-red-500/20 font-mono text-sm font-bold uppercase tracking-wider text-red-400 transition-all hover:bg-red-500/30"
          >
            <Square className="mr-2 h-4 w-4" />
            STOP_SCAN
          </Button>
        )}
      </div>

      {lastScanDelta && !isScanning && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-purple-300">
              LAST_SCAN_DELTA
            </p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              {new Date(lastScanDelta.generatedAt).toLocaleTimeString()}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <DeltaBadge label="NEW" value={lastScanDelta.newDeviceIds.length} />
            <DeltaBadge label="OFFLINE" value={lastScanDelta.offlineDeviceIds.length} />
            <DeltaBadge label="RETURNED" value={lastScanDelta.returnedDeviceIds.length} />
            <DeltaBadge label="CHANGED" value={lastScanDelta.changedDeviceIds.length} />
          </div>
        </div>
      )}

      {/* Demo Notice */}
      {isDemoMode && (
        <p className="font-mono text-[10px] text-gray-500">
          {"//"} Demo mode: Scan simulates discovery. Install/run the Android app for live local LAN scanning.
        </p>
      )}
    </div>
  );
}

function DeltaBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-black/35 p-2 text-center">
      <p className="font-mono text-sm font-bold text-purple-200">{value}</p>
      <p className="font-mono text-[8px] text-gray-500">{label}</p>
    </div>
  );
}

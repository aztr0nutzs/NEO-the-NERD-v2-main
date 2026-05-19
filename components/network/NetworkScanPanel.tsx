"use client";

import { useState } from "react";
import { Radar, Square, Clock, Zap, Scale, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NetworkStatus, ScanComparisonSummary, ScanCompletionResult, ScanMode } from "@/lib/network/types";

interface NetworkScanPanelProps {
  status: NetworkStatus;
  scanProgress: number;
  selectedMode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  onStartScan: () => void;
  onStopScan: () => void;
  isDemoMode: boolean;
  lastScanDelta?: ScanComparisonSummary | null;
  lastScanResult?: ScanCompletionResult | null;
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
  lastScanResult,
}: NetworkScanPanelProps) {
  const isScanning = status.scanState === "scanning";
  const scanFailed = status.scanState === "failed";
  const scanCancelled = status.scanState === "cancelled";
  const coverage = lastScanResult?.coverage ?? null;

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
            <span className="text-cyan-400">
              {isDemoMode ? "RUNNING_PREVIEW_SCAN..." : "SCANNING_NETWORK..."}
            </span>
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
              {isDemoMode && "Simulating browser-preview discovery data..."}
              {!isDemoMode && selectedMode === "quick" && "Resolving local context + gateway + shallow host probe..."}
              {!isDemoMode && selectedMode === "balanced" && "Running ARP/MAC, hostname, SSDP, and bounded port probes..."}
              {!isDemoMode && selectedMode === "deep" && "Running expanded local host cap, timeout, and bounded port/service inference..."}
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
            {isDemoMode ? "START_DEMO_SCAN" : "START_SCAN"}
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

      {/* Last scan failure indicator — only when no scan is in progress */}
      {!isScanning && scanFailed && lastScanResult?.failureReason && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-red-300">
            LAST_SCAN_FAILED
          </p>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-red-200/85">
            {lastScanResult.failureReason}
          </p>
        </div>
      )}

      {!isScanning && scanCancelled && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-yellow-300">
            LAST_SCAN_CANCELLED
          </p>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-yellow-200/85">
            Scan was stopped before completion. No new results were recorded.
          </p>
        </div>
      )}

      {/* Coverage report from the most recent successful scan */}
      {!isScanning && coverage && !isDemoMode && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">
              SCAN COVERAGE
            </p>
            <span className={`font-mono text-[10px] uppercase tracking-wider ${coverage.fullCoverage && !coverage.scanDeadlineExceeded ? "text-emerald-300" : "text-yellow-300"}`}>
              {coverage.fullCoverage && !coverage.scanDeadlineExceeded ? "FULL" : "PARTIAL"}
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-gray-300/90">
            Scanned {coverage.scannedHosts} of {coverage.subnetTotalHosts} addressable hosts
            {coverage.subnetCidr ? ` on ${coverage.subnetCidr}` : ""}. Found {coverage.discoveredHosts}.
            {coverage.scanDeadlineExceeded && " Native scan stopped at the time budget — partial coverage."}
            {!coverage.fullCoverage && !coverage.scanDeadlineExceeded && " Subnet exceeds the scan host cap; some hosts outside the slice were not probed."}
          </p>
        </div>
      )}

      {lastScanDelta && !isScanning && !scanFailed && !scanCancelled && (
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
          {"//"} Browser preview mode: simulated network data. Install/run the Android app for live local LAN discovery. No backend is required for installed Android local discovery.
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

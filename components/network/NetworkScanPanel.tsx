"use client";

import { Radar, Square, Clock, Zap, Scale, Search, Wifi, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NetworkAdapterStatus, NetworkStatus, ScanComparisonSummary, ScanCompletionResult, ScanMode } from "@/lib/network/types";

interface NetworkScanPanelProps {
  status: NetworkStatus;
  scanProgress: number;
  selectedMode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  onStartScan: () => void;
  onStopScan: () => void;
  onRequestPermissions?: () => void;
  isDemoMode: boolean;
  permissionDenied?: boolean;
  isRequestingPermissions?: boolean;
  lastScanDelta?: ScanComparisonSummary | null;
  lastScanResult?: ScanCompletionResult | null;
  adapterStatus?: NetworkAdapterStatus;
}

const SCAN_MODES: {
  mode: ScanMode;
  label: string;
  icon: typeof Zap;
  description: string;
  estimate: string;
  coverage: string;
  bestFor: string;
  methods: string;
  recommended?: boolean;
}[] = [
  {
    mode: "quick",
    label: "QUICK SCAN",
    icon: Zap,
    description: "Fastest check for gateway and nearby responsive hosts.",
    estimate: "~5-20 sec",
    coverage: "Up to 64 centered hosts",
    bestFor: "Quick sanity check",
    methods: "Gateway, ARP cache, tcp/80 and tcp/443",
  },
  {
    mode: "balanced",
    label: "BALANCED SCAN",
    icon: Scale,
    description: "Recommended normal scan for most home Wi-Fi networks.",
    estimate: "~25-60 sec",
    coverage: "Up to /24 or 254 hosts",
    bestFor: "Normal inventory",
    methods: "ARP, hostname, SSDP/UPnP, tcp/80/443/22/8080",
    recommended: true,
  },
  {
    mode: "deep",
    label: "DEEP SCAN",
    icon: Search,
    description: "Slower scan with wider service probing.",
    estimate: "~75-150 sec",
    coverage: "Up to /24 or 254 hosts",
    bestFor: "Harder-to-find devices",
    methods: "Balanced plus tcp/53/139/445/8443",
  },
];

const SCAN_PHASES = [
  "preparing",
  "checking gateway",
  "scanning subnet",
  "reading ARP cache",
  "probing common ports",
  "checking SSDP/UPnP",
  "classifying devices",
  "building map",
] as const;

function getScanPhase(progress: number) {
  const index = Math.min(SCAN_PHASES.length - 1, Math.floor((Math.max(0, progress) / 100) * SCAN_PHASES.length));
  return SCAN_PHASES[index];
}

function getNextAction(reason: string | null | undefined) {
  if (!reason) return null;
  if (/permission|denied/i.test(reason)) return "Grant Location and Nearby Wi-Fi permission, then retry.";
  if (/subnet|local ip|gateway|wifi|wi-fi/i.test(reason)) return "Connect to Wi-Fi on a physical Android device and keep Location Services enabled.";
  if (/timeout|unresponsive/i.test(reason)) return "Restart the app, keep the phone awake, and retry Balanced before Deep.";
  return "Open diagnostics below, check the runtime state, then retry when the blocker is cleared.";
}

export function NetworkScanPanel({
  status,
  scanProgress,
  selectedMode,
  onModeChange,
  onStartScan,
  onStopScan,
  onRequestPermissions,
  isDemoMode,
  permissionDenied = false,
  isRequestingPermissions = false,
  lastScanDelta,
  lastScanResult,
  adapterStatus,
}: NetworkScanPanelProps) {
  const isScanning = status.scanState === "scanning";
  const scanFailed = status.scanState === "failed";
  const scanCancelled = status.scanState === "cancelled";
  const coverage = lastScanResult?.coverage ?? null;
  const selectedModeMeta = SCAN_MODES.find((mode) => mode.mode === selectedMode) ?? SCAN_MODES[1];
  const phase = getScanPhase(scanProgress);
  const failureNextAction = getNextAction(lastScanResult?.failureReason);
  const canScanLive = isDemoMode || (!permissionDenied && adapterStatus?.mode !== "native-unavailable");

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
    <div className="space-y-3 rounded-lg border border-cyan-500/30 bg-black/60 p-3 backdrop-blur-sm">
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

      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
        <div className="flex items-start gap-2">
          {canScanLive ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
          )}
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
              {canScanLive ? "READY TO SCAN" : "SCAN SETUP NEEDED"}
            </p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-gray-300/90">
              {isDemoMode
                ? "Demo Preview is active. Results are simulated and clearly labeled; switch Demo Mode off on Android for real LAN discovery."
                : permissionDenied
                  ? "Android Location/Nearby Wi-Fi permission is required before local Wi-Fi discovery can run."
                  : adapterStatus?.mode === "native-unavailable"
                    ? adapterStatus.message
                    : `${selectedModeMeta.label} will run ${selectedModeMeta.methods}. Discovery is based on devices that respond; hidden or sleeping devices may not appear.`}
            </p>
          </div>
        </div>
      </div>

      {/* Scan Mode Selector */}
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
        {SCAN_MODES.map(({ mode, label, icon: Icon, description, estimate, coverage: modeCoverage, bestFor, recommended }) => (
          <button
            key={mode}
            onClick={() => !isScanning && onModeChange(mode)}
            disabled={isScanning}
            className={`
              relative flex min-h-[112px] flex-col items-start gap-1 rounded-lg border p-2.5 text-left
              font-mono text-xs transition-all duration-200
              ${
                selectedMode === mode
                  ? "border-cyan-400 bg-cyan-500/10 text-cyan-400"
                  : "border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500 hover:text-gray-300"
              }
              ${isScanning ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
            `}
          >
            <div className="flex w-full items-center gap-2">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="font-bold tracking-wider">{label}</span>
            </div>
            {recommended && (
              <span className="rounded border border-lime-400/40 bg-lime-400/10 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.16em] text-lime-300">
                Recommended
              </span>
            )}
            <span className="text-[10px] leading-relaxed text-gray-400">{description}</span>
            <span className="mt-auto text-[9px] uppercase tracking-[0.12em] text-cyan-300/85">
              {estimate} · {modeCoverage}
            </span>
            <span className="text-[9px] uppercase tracking-[0.12em] text-gray-500">{bestFor}</span>
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
            <span className="text-cyan-400 uppercase">
              {isDemoMode ? "running preview scan" : phase}
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
              {!isDemoMode && `${selectedModeMeta.methods}. Host count updates when native scan returns.`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded border border-gray-800 bg-black/35 p-2">
              <p className="font-mono text-gray-500">SCANNED_HOSTS</p>
              <p className="font-mono text-gray-300">AVAILABLE AFTER SCAN</p>
            </div>
            <div className="rounded border border-gray-800 bg-black/35 p-2">
              <p className="font-mono text-gray-500">DISCOVERED_HOSTS</p>
              <p className="font-mono text-gray-300">{status.devicesFound}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!isScanning && permissionDenied && !isDemoMode ? (
          <Button
            onClick={onRequestPermissions}
            disabled={isRequestingPermissions}
            className="flex-1 border border-yellow-500/50 bg-yellow-500/15 font-mono text-sm font-bold tracking-wider text-yellow-300 transition-all hover:bg-yellow-500/25"
          >
            <Wifi className="mr-2 h-4 w-4" />
            {isRequestingPermissions ? "REQUESTING_PERMISSION..." : "Tap to grant Wi-Fi/Location permission"}
          </Button>
        ) : !isScanning ? (
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

      {!isScanning && permissionDenied && !isDemoMode && (
        <p className="font-mono text-[10px] leading-relaxed text-yellow-100/80">
          Required so NEO can read your local network&apos;s gateway and Wi-Fi peers.
        </p>
      )}

      {/* Last scan failure indicator — only when no scan is in progress */}
      {!isScanning && scanFailed && lastScanResult?.failureReason && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-red-300">
            LAST_SCAN_FAILED
          </p>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-red-200/85">
            {lastScanResult.failureReason}
          </p>
          {failureNextAction && (
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-red-100/90">
              NEXT: {failureNextAction}
            </p>
          )}
        </div>
      )}

      {!isScanning && lastScanResult?.status === "complete" && (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
              LAST_SCAN_SUMMARY
            </p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              {Math.round(lastScanResult.durationMs / 1000)}s · {isDemoMode ? "demo" : "native android"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DeltaBadge label="DISCOVERED" value={coverage?.discoveredHosts ?? status.devicesFound} />
            <DeltaBadge label="NEW" value={lastScanDelta?.newDeviceIds.length ?? 0} />
            <DeltaBadge label="UNKNOWN" value={status.unknownDevices} />
            <DeltaBadge label="ROUTER" value={status.gatewayIp && status.gatewayIp !== "Unavailable" ? 1 : 0} />
          </div>
          {status.devicesFound === 0 && (
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-yellow-100/80">
              No devices responded. This can happen if devices are asleep, blocked by firewall, isolated by the router, or Android permissions/network access are limited.
            </p>
          )}
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

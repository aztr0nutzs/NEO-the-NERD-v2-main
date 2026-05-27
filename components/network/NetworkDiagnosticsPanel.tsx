"use client";

import { AlertTriangle, Cpu, Radar, Router } from "lucide-react";
import type { NativeNetworkPermissionStatus } from "@/lib/network/native-network-bridge";
import type { NativeLocalNetworkContext } from "@/lib/network/native-network-types";
import type {
  NetworkAdapterStatus,
  NetworkSettings,
  NetworkStatus,
  NetworkTopologyGraph,
  RouterCapability,
  RouterControlMode,
  RouterStatus,
  ScanCompletionResult,
  ScanMode,
  DiscoveredDevice,
} from "@/lib/network/types";

interface NetworkDiagnosticsPanelProps {
  platform: string;
  adapterStatus: NetworkAdapterStatus;
  settings: NetworkSettings;
  networkStatus: NetworkStatus;
  selectedMode: ScanMode;
  localContext: NativeLocalNetworkContext | null;
  permissionStatus: NativeNetworkPermissionStatus | null;
  permissionDenied: boolean;
  lastScanResult: ScanCompletionResult | null;
  topologyGraph: NetworkTopologyGraph | null;
  routerStatus: RouterStatus;
  devices: DiscoveredDevice[];
  routerCapabilities: RouterCapability[];
  routerControlMode: RouterControlMode;
  onRefresh: () => void;
}

export function NetworkDiagnosticsPanel({
  platform,
  adapterStatus,
  settings,
  networkStatus,
  selectedMode,
  localContext,
  permissionStatus,
  permissionDenied,
  lastScanResult,
  topologyGraph,
  routerStatus,
  devices,
  routerCapabilities,
  routerControlMode,
  onRefresh,
}: NetworkDiagnosticsPanelProps) {
  const coverage = lastScanResult?.coverage ?? null;
  const localIp = localContext?.localIp ?? networkStatus.localIp;
  const subnet = localContext?.subnet ?? networkStatus.subnet;
  const gatewayIp = localContext?.gatewayIp ?? networkStatus.gatewayIp;
  const ssid = localContext?.networkName ?? networkStatus.networkName;
  const scanSource = settings.demoMode
    ? "demo"
    : adapterStatus.mode === "native-android"
      ? "native"
      : adapterStatus.mode === "native-unavailable"
        ? "unavailable"
        : "browser";
  const topologyConfidence = topologyGraph
    ? topologyGraph.topologyMode === "backend-confirmed" && topologyGraph.relationshipsConfirmed
      ? "LIVE"
      : topologyGraph.topologyMode === "demo"
        ? "DEMO"
        : "ESTIMATED"
    : "ESTIMATED";
  const locationState = permissionStatus?.location ?? (platform === "android" ? "unknown" : "unavailable");
  const wifiState = permissionStatus?.wifi ?? (platform === "android" ? "unknown" : "unavailable");
  const unavailableHints = buildUnavailableHints({
    platform,
    scanSource,
    permissionDenied,
    locationState,
    wifiState,
    ssid,
    gatewayIp,
    localIp,
    connectionType: localContext?.connectionType ?? networkStatus.connectionType,
  });
  const arpEntries = devices.filter((device) => device.discoverySources.includes("arp")).length;
  const ssdpResponses = devices.filter((device) => device.discoverySources.includes("ssdp")).length;
  const tcpProbeHits = devices.filter((device) => device.discoverySources.includes("tcp-probe")).length;
  const probeFailures =
    coverage && coverage.scannedHosts >= 0
      ? Math.max(0, coverage.scannedHosts - tcpProbeHits)
      : null;

  return (
    <section className="rounded-lg border border-cyan-500/30 bg-black/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-xs text-cyan-300/80">
            <Cpu className="h-3.5 w-3.5" />
            <span>N.E.O. // OPERATIONAL_DIAGNOSTICS</span>
          </div>
          <h3 className="font-mono text-sm font-black uppercase tracking-[0.18em] text-cyan-300">
            NETWORK TRUTH PANEL
          </h3>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-gray-400">
            Shows what runtime is actually doing: native scan, demo data, unavailable path, or read-only router status.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500/20"
        >
          REFRESH_DIAGNOSTICS
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Diag label="Runtime platform" value={platform.toUpperCase()} />
        <Diag label="Scan source" value={scanSource.toUpperCase()} tone={scanSource === "native" ? "ok" : scanSource === "demo" ? "warn" : "critical"} />
        <Diag label="Permission state" value={`LOC ${locationState.toUpperCase()} · WIFI ${wifiState.toUpperCase()}`} tone={permissionDenied ? "critical" : "ok"} />
        <Diag label="Location services" value={platform === "android" ? "REQUIRED FOR SSID" : "UNAVAILABLE"} tone={platform === "android" ? "warn" : "muted"} />
        <Diag label="SSID" value={presentOrReason(ssid, "UNAVAILABLE")} tone={ssid && ssid !== "Unavailable" ? "ok" : "warn"} />
        <Diag label="Gateway IP" value={presentOrReason(gatewayIp, "UNAVAILABLE")} tone={gatewayIp && gatewayIp !== "Unavailable" ? "ok" : "warn"} />
        <Diag label="Local IP / subnet" value={`${presentOrReason(localIp, "UNAVAILABLE")} / ${presentOrReason(subnet, "UNAVAILABLE")}`} />
        <Diag label="Scan mode" value={selectedMode.toUpperCase()} />
        <Diag label="Scanned hosts" value={coverage ? String(coverage.scannedHosts) : "NONE"} tone={coverage ? "ok" : "muted"} />
        <Diag label="Discovered hosts" value={coverage ? String(coverage.discoveredHosts) : String(networkStatus.devicesFound)} tone={networkStatus.devicesFound > 0 ? "ok" : "warn"} />
        <Diag label="ARP entries read" value={coverage ? String(arpEntries) : "NOT RUN"} tone={arpEntries > 0 ? "ok" : "muted"} />
        <Diag label="SSDP responses" value={coverage ? String(ssdpResponses) : "NOT RUN"} tone={ssdpResponses > 0 ? "ok" : "muted"} />
        <Diag label="Probe hits/fails" value={coverage ? `${tcpProbeHits}/${probeFailures ?? "UNKNOWN"}` : "NOT RUN"} tone={tcpProbeHits > 0 ? "ok" : "muted"} />
        <Diag label="Last scan duration" value={lastScanResult ? `${Math.round(lastScanResult.durationMs / 1000)}S` : "NONE"} />
        <Diag label="Last scan error" value={lastScanResult?.failureReason ?? "NONE"} tone={lastScanResult?.failureReason ? "critical" : "ok"} />
        <Diag label="Topology confidence" value={topologyConfidence} tone={topologyConfidence === "LIVE" ? "ok" : topologyConfidence === "DEMO" ? "warn" : "warn"} />
        <Diag label="Demo/fallback" value={settings.demoMode ? "DEMO" : adapterStatus.mode === "native-unavailable" ? "UNAVAILABLE" : "OFF"} tone={settings.demoMode || adapterStatus.mode === "native-unavailable" ? "warn" : "ok"} />
        <Diag label="Router mode" value={routerControlMode === "connector-backed" ? "CONNECTOR BACKED" : routerControlMode === "demo" ? "DEMO" : "READ ONLY"} tone={routerControlMode === "connector-backed" ? "ok" : "warn"} />
        <Diag label="Router gateway" value={presentOrReason(routerStatus.gatewayIp, "UNAVAILABLE")} icon="router" />
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <div className="rounded border border-orange-500/25 bg-orange-500/5 p-3">
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-orange-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            UNAVAILABLE / LIMITED CAUSES
          </div>
          <ul className="space-y-1 font-mono text-[10px] leading-relaxed text-orange-100/80">
            {unavailableHints.map((hint) => (
              <li key={hint}>- {hint}</li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-cyan-500/20 bg-cyan-500/5 p-3">
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
            <Router className="h-3.5 w-3.5" />
            ROUTER ACTION TRUTH
          </div>
          <div className="grid gap-1">
            {routerCapabilities.map((capability) => (
              <div key={capability.key} className="flex items-center justify-between gap-2 rounded bg-black/35 px-2 py-1">
                <span className="font-mono text-[10px] text-gray-300">{capability.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-orange-300">
                  {capability.status === "available" ? "LIVE" : capability.status === "demo-only" ? "DEMO" : capability.status === "requires-connector" ? "CONNECTOR REQUIRED" : "UNAVAILABLE"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded border border-lime-500/20 bg-lime-500/5 p-3">
        <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-lime-300">
          <Radar className="h-3.5 w-3.5" />
          HOW TO GET BETTER RESULTS
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "Use a physical Android device",
            "Connect to Wi-Fi",
            "Enable Location permission",
            "Enable Location Services",
            "Keep the phone awake",
            "Run Balanced or Deep scan",
            "Some devices may not respond to scans",
          ].map((tip) => (
            <span key={tip} className="rounded border border-gray-800 bg-black/35 px-2 py-1 font-mono text-[10px] leading-relaxed text-gray-300">
              {tip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Diag({
  label,
  value,
  tone = "muted",
  icon,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "critical" | "muted";
  icon?: "router";
}) {
  const color =
    tone === "ok" ? "#39ff14" :
      tone === "warn" ? "#ff7a00" :
        tone === "critical" ? "#ff2d9c" : "#9ca3af";
  return (
    <div className="rounded border border-gray-800 bg-gray-900/35 p-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        {icon === "router" ? <Router className="h-3 w-3" style={{ color }} /> : <Radar className="h-3 w-3" style={{ color }} />}
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
      </div>
      <p className="break-words font-mono text-[11px] uppercase tracking-[0.08em]" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function presentOrReason(value: string | null | undefined, fallback: string) {
  if (!value || value === "Unavailable" || value === "unknown") return fallback;
  return value;
}

function buildUnavailableHints({
  platform,
  scanSource,
  permissionDenied,
  locationState,
  wifiState,
  ssid,
  gatewayIp,
  localIp,
  connectionType,
}: {
  platform: string;
  scanSource: string;
  permissionDenied: boolean;
  locationState: string;
  wifiState: string;
  ssid: string;
  gatewayIp: string;
  localIp: string;
  connectionType: string;
}) {
  const hints: string[] = [];
  if (platform !== "android") hints.push("Browser/runtime preview cannot perform true LAN discovery; use Android on physical Wi-Fi for live scan proof.");
  if (permissionDenied || locationState === "denied") hints.push("Location permission denied can hide SSID and local Wi-Fi context.");
  if (wifiState === "denied") hints.push("Nearby Wi-Fi permission missing on Android 13+ can limit Wi-Fi metadata.");
  if (!ssid || ssid === "Unavailable") hints.push("SSID unavailable: possible Location Services off, emulator network, not connected to Wi-Fi, or Android privacy restrictions.");
  if (!gatewayIp || gatewayIp === "Unavailable") hints.push("Gateway unavailable: emulator networking, cellular-only connection, VPN, or route table restrictions.");
  if (!localIp || localIp === "Unavailable") hints.push("Local IP/subnet unavailable: no active Wi-Fi/LAN interface or Android privacy/network restriction.");
  if (connectionType !== "wifi") hints.push(`Connection type is ${connectionType || "unknown"}; physical Android Wi-Fi is required for true LAN discovery.`);
  if (scanSource === "unavailable") hints.push("Native plugin unavailable or failed; no demo devices are injected while live mode is selected.");
  if (hints.length === 0) hints.push("No blocking condition detected. If discovery is empty, the LAN may block ARP/TCP/SSDP responses or the scan mode may be too shallow.");
  return hints;
}

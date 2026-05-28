"use client";

import Image from "next/image";
import {
  AlertTriangle,
  Clipboard,
  Cpu,
  Eye,
  Gauge,
  ListFilter,
  Map,
  Radar,
  RefreshCw,
  Router,
  Search,
  ShieldAlert,
  Square,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  DiscoveredDevice,
  NetworkAdapterStatus,
  NetworkStatus,
  NetworkTopologyGraph,
  RouterStatus,
  ScanCompletionResult,
  ScanComparisonSummary,
  ScanMode,
} from "@/lib/network/types";
import type { NativeLocalNetworkContext } from "@/lib/network/native-network-types";
import type { NativeNetworkPermissionStatus } from "@/lib/network/native-network-bridge";

type ReactorState =
  | "idle-ready"
  | "needs-permission"
  | "scanning"
  | "scan-complete"
  | "scan-empty"
  | "demo"
  | "error"
  | "unavailable";

type DeviceFilterShortcut = "all" | "unknown" | "online" | "router" | "needs-review";

interface NetworkReactorCoreProps {
  status: NetworkStatus;
  devices: DiscoveredDevice[];
  routerStatus: RouterStatus;
  adapterStatus: NetworkAdapterStatus;
  localContext: NativeLocalNetworkContext | null;
  permissionStatus: NativeNetworkPermissionStatus | null;
  permissionDenied: boolean;
  isRequestingPermissions: boolean;
  isDemoMode: boolean;
  selectedMode: ScanMode;
  scanProgress: number;
  lastScanResult: ScanCompletionResult | null;
  lastScanDelta: ScanComparisonSummary | null;
  topologyGraph: NetworkTopologyGraph | null;
  reducedMotion?: boolean;
  clipboardAvailable?: boolean;
  onModeChange: (mode: ScanMode) => void;
  onStartScan: () => void;
  onStopScan: () => void;
  onRequestPermissions: () => void;
  onRescanLastMode: () => void;
  onOpenDevices: () => void;
  onOpenMap: () => void;
  onOpenDiagnostics: () => void;
  onOpenGateway: () => void;
  onFilterDevices: (filter: DeviceFilterShortcut) => void;
  onCopyScanSummary: () => void;
}

const MODE_LABEL: Record<ScanMode, string> = {
  quick: "Quick",
  balanced: "Balanced",
  deep: "Deep",
};

const STATE_THEME: Record<ReactorState, { color: string; glow: string; label: string }> = {
  "idle-ready": { color: "#00f0ff", glow: "rgba(0,240,255,0.46)", label: "READY" },
  "needs-permission": { color: "#ff7a00", glow: "rgba(255,122,0,0.46)", label: "PERMISSION NEEDED" },
  scanning: { color: "#39ff14", glow: "rgba(57,255,20,0.5)", label: "SCANNING" },
  "scan-complete": { color: "#39ff14", glow: "rgba(57,255,20,0.48)", label: "SCAN COMPLETE" },
  "scan-empty": { color: "#ff7a00", glow: "rgba(255,122,0,0.42)", label: "SCAN EMPTY" },
  demo: { color: "#b829ff", glow: "rgba(184,41,255,0.45)", label: "DEMO MODE" },
  error: { color: "#ff2d9c", glow: "rgba(255,45,156,0.48)", label: "ERROR" },
  unavailable: { color: "#8a93a6", glow: "rgba(138,147,166,0.24)", label: "UNAVAILABLE" },
};

export function NetworkReactorCore({
  status,
  devices,
  routerStatus,
  adapterStatus,
  localContext,
  permissionStatus,
  permissionDenied,
  isRequestingPermissions,
  isDemoMode,
  selectedMode,
  scanProgress,
  lastScanResult,
  lastScanDelta,
  topologyGraph,
  reducedMotion = false,
  clipboardAvailable = false,
  onModeChange,
  onStartScan,
  onStopScan,
  onRequestPermissions,
  onRescanLastMode,
  onOpenDevices,
  onOpenMap,
  onOpenDiagnostics,
  onOpenGateway,
  onFilterDevices,
  onCopyScanSummary,
}: NetworkReactorCoreProps) {
  const isScanning = status.scanState === "scanning";
  const lastFailure = lastScanResult?.failureReason ?? (status.scanState === "failed" ? adapterStatus.message : null);
  const gatewayDevice = devices.find(
    (device) =>
      device.deviceType === "router" ||
      device.discoverySources.includes("gateway") ||
      device.ipAddress === status.gatewayIp ||
      device.ipAddress === routerStatus.gatewayIp,
  );
  const unknownCount = devices.filter((device) => device.deviceType === "unknown").length;
  const needsReviewCount = devices.filter((device) =>
    device.trustLevel === "new" ||
    device.trustLevel === "watch" ||
    device.deviceType === "unknown" ||
    device.vendor === "Unavailable" ||
    device.dataLimited,
  ).length;
  const onlineCount = devices.filter((device) => device.status === "online").length;
  const sourceCounts = {
    arp: devices.filter((device) => device.discoverySources.includes("arp")).length,
    ssdp: devices.filter((device) => device.discoverySources.includes("ssdp")).length,
    tcp: devices.filter((device) => device.discoverySources.includes("tcp-probe")).length,
  };
  const coverage = lastScanResult?.coverage ?? null;
  const topologyConfidence =
    topologyGraph?.topologyMode === "backend-confirmed" && topologyGraph.relationshipsConfirmed
      ? "LIVE"
      : topologyGraph?.topologyMode === "demo"
        ? "DEMO"
        : "ESTIMATED";
  const reactorState = getReactorState({
    isDemoMode,
    isScanning,
    permissionDenied,
    permissionStatus,
    adapterStatus,
    status,
    lastFailure,
  });
  const theme = STATE_THEME[reactorState];
  const canScan = isDemoMode || (!permissionDenied && adapterStatus.mode !== "native-unavailable");
  const scanDisabledReason = isScanning
    ? "Scan already running"
    : permissionDenied
      ? "Permission needed"
      : adapterStatus.mode === "native-unavailable"
        ? adapterStatus.message
        : null;
  const ssid = localContext?.networkName ?? status.networkName;
  const gatewayIp = localContext?.gatewayIp ?? status.gatewayIp;
  const localIp = localContext?.localIp ?? status.localIp;
  const subnet = localContext?.subnet ?? status.subnet;
  const recommendedAction = getRecommendedAction({
    reactorState,
    devicesFound: status.devicesFound,
    needsReviewCount,
    adapterStatus,
    isDemoMode,
    permissionDenied,
  });

  return (
    <section
      className="relative overflow-hidden rounded-2xl border bg-black/80 p-3 shadow-[0_0_45px_rgba(0,240,255,0.12)] backdrop-blur-sm sm:p-4"
      style={{
        borderColor: `${theme.color}66`,
        boxShadow: `inset 0 0 0 1px ${theme.color}33, 0 0 42px ${theme.glow}`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 28%, rgba(0,240,255,0.16), transparent 32%), linear-gradient(135deg, rgba(0,240,255,0.08), rgba(255,45,156,0.05) 46%, rgba(57,255,20,0.07))",
        }}
      />
      <div className="pointer-events-none absolute inset-0 ps-mesh-fine opacity-40" />

      <div className="relative z-10 grid gap-3 xl:grid-cols-[minmax(260px,0.78fr)_minmax(340px,1.08fr)_minmax(260px,0.82fr)]">
        <div className="order-2 space-y-2 xl:order-1">
          <PanelTitle icon={Router} label="NETWORK IDENTITY" color="#00f0ff" />
          <HudGrid>
            <Metric label="SSID" value={displayValue(ssid)} tone={ssid && ssid !== "Unavailable" ? "ok" : "warn"} />
            <Metric label="Gateway" value={displayValue(gatewayIp)} onClick={gatewayDevice ? onOpenGateway : undefined} tone={gatewayDevice ? "ok" : "warn"} />
            <Metric label="Local IP" value={displayValue(localIp)} />
            <Metric label="Subnet" value={displayValue(subnet)} />
            <Metric label="Source" value={isDemoMode ? "DEMO" : adapterStatus.label} tone={isDemoMode ? "warn" : adapterStatus.mode === "native-android" ? "ok" : "critical"} />
            <Metric label="Topology" value={topologyConfidence} onClick={onOpenMap} tone={topologyConfidence === "LIVE" ? "ok" : "warn"} />
          </HudGrid>
          <ControlGroup label="Scan Mode">
            {(["quick", "balanced", "deep"] as ScanMode[]).map((mode) => (
              <ReactorButton
                key={mode}
                label={MODE_LABEL[mode]}
                icon={mode === "quick" ? Zap : mode === "balanced" ? Gauge : Search}
                active={selectedMode === mode}
                disabled={isScanning}
                title={isScanning ? "Cannot change scan mode while scanning." : `Use ${MODE_LABEL[mode]} scan`}
                onClick={() => onModeChange(mode)}
              />
            ))}
          </ControlGroup>
          <ControlGroup label="Run">
            {isScanning ? (
              <ReactorButton label="Stop Scan" icon={Square} danger onClick={onStopScan} />
            ) : permissionDenied && !isDemoMode ? (
              <ReactorButton
                label={isRequestingPermissions ? "Requesting" : "Grant Permission"}
                icon={ShieldAlert}
                warn
                disabled={isRequestingPermissions}
                onClick={onRequestPermissions}
              />
            ) : (
              <ReactorButton
                label={`${MODE_LABEL[selectedMode]} Scan`}
                icon={Radar}
                disabled={!canScan}
                title={scanDisabledReason ?? `Run ${selectedMode} scan`}
                onClick={onStartScan}
              />
            )}
            <ReactorButton
              label="Rescan"
              icon={RefreshCw}
              disabled={isScanning || !canScan}
              title={scanDisabledReason ?? "Run the last selected scan mode again."}
              onClick={onRescanLastMode}
            />
          </ControlGroup>
        </div>

        <div className="order-1 flex flex-col items-center justify-center gap-3 xl:order-2">
          <div
            className="relative grid aspect-square w-full max-w-[520px] place-items-center overflow-visible rounded-full"
            aria-label={`Network reactor core state: ${STATE_THEME[reactorState].label}`}
          >
            <div
              className="absolute inset-[4%] rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.glow} 0%, rgba(0,0,0,0) 62%)`,
                filter: "blur(16px)",
              }}
            />
            <Image
              src="/images/neo_reactor.png"
              alt=""
              width={1600}
              height={1200}
              priority
              draggable={false}
              className={`relative z-10 h-full w-full select-none object-contain drop-shadow-[0_0_28px_rgba(0,240,255,0.32)] ${!reducedMotion && isScanning ? "animate-ps-pulse-ring" : ""}`}
            />
            <CoreRing size="84%" color={theme.color} active={!reducedMotion && isScanning} reverse={false} />
            <CoreRing size="68%" color={needsReviewCount > 0 ? "#ff7a00" : "#b829ff"} active={!reducedMotion && reactorState === "error"} reverse />
            <div
              className={`absolute z-20 h-[60%] w-[60%] rounded-full border ${!reducedMotion && isScanning ? "animate-ps-spin-slow" : ""}`}
              style={{
                borderColor: `${theme.color}22`,
                background: `conic-gradient(from 0deg, transparent 0deg, ${theme.color}55 24deg, transparent 52deg, rgba(255,45,156,0.24) 102deg, transparent 130deg, rgba(57,255,20,0.22) 220deg, transparent 256deg)`,
                filter: `drop-shadow(0 0 12px ${theme.color})`,
                maskImage: "radial-gradient(circle, transparent 51%, #000 52%)",
              }}
            />
            <div
              className={`absolute z-20 h-[34%] w-[34%] rounded-full ${!reducedMotion && (isScanning || reactorState === "error") ? "animate-ps-pulse-ring" : ""}`}
              style={{
                background: `radial-gradient(circle, ${theme.color}55 0%, ${theme.color}22 32%, rgba(0,0,0,0.2) 64%, transparent 72%)`,
                boxShadow: `0 0 32px ${theme.glow}, inset 0 0 22px ${theme.color}66`,
              }}
            />
            <div
              className={`absolute z-20 h-[92%] w-[92%] rounded-full ${!reducedMotion && isScanning ? "animate-ps-spin-rev" : ""}`}
              style={{
                background: `conic-gradient(from 45deg, transparent 0deg, transparent 16deg, ${theme.color} 17deg, transparent 19deg, transparent 58deg, #ff2d9c 60deg, transparent 62deg, transparent 118deg, #39ff14 120deg, transparent 123deg)`,
                opacity: 0.42,
                maskImage: "radial-gradient(circle, transparent 62%, #000 63%)",
              }}
            />
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <span
                key={index}
                className="absolute z-20 h-1.5 w-1.5 rounded-full"
                style={{
                  background: index % 2 ? "#ff2d9c" : "#00f0ff",
                  boxShadow: `0 0 10px ${index % 2 ? "#ff2d9c" : "#00f0ff"}`,
                  transform: `rotate(${index * 60}deg) translateY(-${150 + (index % 2) * 18}px)`,
                  opacity: reducedMotion ? 0.45 : 0.85,
                }}
              />
            ))}
            <div className="absolute left-1/2 top-[52%] z-30 grid h-[18%] w-[28%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/20 bg-black/30 text-center shadow-[0_0_22px_rgba(0,240,255,0.35)] backdrop-blur-[1px]">
              <button
                type="button"
                onClick={onOpenDevices}
                className="font-mono text-4xl font-black italic leading-none text-cyan-100 drop-shadow-[0_0_12px_rgba(0,240,255,0.85)] sm:text-5xl"
                title="Open device list"
              >
                {status.devicesFound}
              </button>
            </div>
            <div className="absolute bottom-[14%] left-1/2 z-30 min-w-[46%] -translate-x-1/2 rounded-xl border border-cyan-300/45 bg-black/70 px-3 py-2 text-center shadow-[0_0_18px_rgba(0,240,255,0.28)] backdrop-blur-sm">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.26em]" style={{ color: theme.color }}>
                  {theme.label}
                </p>
                <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-cyan-100/80">
                  Network Launcher: {adapterStatus.mode === "native-android" ? "Live" : isDemoMode ? "Demo" : "Limited"}
                </p>
              </div>
            </div>
            {isScanning && (
              <div className="absolute bottom-[9%] left-1/2 z-30 h-2 w-[42%] -translate-x-1/2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-lime-300 to-pink-400 transition-all duration-300" style={{ width: `${Math.max(5, scanProgress)}%` }} />
              </div>
            )}
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-4">
            <OrbitalMetric label="Scan" value={isScanning ? `${Math.round(scanProgress)}%` : status.scanState.toUpperCase()} color="#00f0ff" />
            <OrbitalMetric label="Online" value={onlineCount} color="#39ff14" onClick={() => onFilterDevices("online")} />
            <OrbitalMetric label="Review" value={needsReviewCount} color="#ff7a00" onClick={() => onFilterDevices("needs-review")} />
            <OrbitalMetric label="Map" value={topologyConfidence} color="#b829ff" onClick={onOpenMap} />
          </div>
          <p className="max-w-xl text-center font-mono text-[10px] leading-relaxed text-white/55">
            Estimated topology. Discovery depends on Android permissions and device responses. Some devices may not answer probes. Router control requires connector.
          </p>
        </div>

        <div className="order-3 space-y-2">
          <PanelTitle icon={AlertTriangle} label="SCAN HEALTH / RISK" color="#ff7a00" />
          <HudGrid>
            <Metric label="Scanned" value={coverage ? String(coverage.scannedHosts) : "Not scanned"} tone={coverage ? "ok" : "muted"} />
            <Metric label="Discovered" value={coverage ? String(coverage.discoveredHosts) : String(status.devicesFound)} onClick={onOpenDevices} />
            <Metric label="Duration" value={lastScanResult ? `${Math.round(lastScanResult.durationMs / 1000)}s` : "None"} />
            <Metric label="Last Scan" value={formatAge(status.lastScanAt)} />
            <Metric label="ARP / SSDP" value={`${sourceCounts.arp} / ${sourceCounts.ssdp}`} />
            <Metric label="TCP Hits" value={String(sourceCounts.tcp)} />
            <Metric label="Unknown" value={String(unknownCount)} onClick={() => onFilterDevices("unknown")} tone={unknownCount ? "warn" : "ok"} />
            <Metric label="New Since Last" value={String(lastScanDelta?.newDeviceIds.length ?? 0)} tone={(lastScanDelta?.newDeviceIds.length ?? 0) > 0 ? "warn" : "ok"} />
            <Metric label="Gateway" value={gatewayDevice ? "Present" : "Missing"} onClick={gatewayDevice ? onOpenGateway : undefined} tone={gatewayDevice ? "ok" : "warn"} />
          </HudGrid>
          <div className="rounded-lg border border-lime-400/25 bg-lime-400/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lime-300">Recommended Action</p>
            <p className="mt-1 text-[12px] leading-snug text-white/78">{recommendedAction}</p>
          </div>
          <ControlGroup label="Views">
            <ReactorButton label="Devices" icon={Eye} onClick={onOpenDevices} />
            <ReactorButton label="Map" icon={Map} onClick={onOpenMap} />
            <ReactorButton label="Diagnostics" icon={Cpu} onClick={onOpenDiagnostics} />
            <ReactorButton label="Gateway" icon={Router} disabled={!gatewayDevice} title={gatewayDevice ? "Open gateway detail" : "Gateway device not found in current results."} onClick={onOpenGateway} />
          </ControlGroup>
          <ControlGroup label="Filters">
            {(["all", "unknown", "online", "router", "needs-review"] as DeviceFilterShortcut[]).map((filter) => (
              <ReactorButton key={filter} label={filter.replace("-", " ")} icon={ListFilter} compact onClick={() => onFilterDevices(filter)} />
            ))}
          </ControlGroup>
          <ControlGroup label="Diagnostics">
            <ReactorButton label="Copy Summary" icon={Clipboard} disabled={!clipboardAvailable} title={clipboardAvailable ? "Copy current scan summary" : "Clipboard API unavailable in this runtime."} onClick={onCopyScanSummary} />
            <ReactorButton label="Retry Setup" icon={RefreshCw} disabled={isDemoMode || isRequestingPermissions} title={isDemoMode ? "Demo mode does not request Android permissions." : "Request Android network permissions again."} onClick={onRequestPermissions} />
          </ControlGroup>
          {lastFailure && (
            <div className="rounded-lg border border-pink-500/35 bg-pink-500/10 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pink-300">Last Error</p>
              <p className="mt-1 text-[11px] leading-snug text-pink-100/85">{lastFailure}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function getReactorState(input: {
  isDemoMode: boolean;
  isScanning: boolean;
  permissionDenied: boolean;
  permissionStatus: NativeNetworkPermissionStatus | null;
  adapterStatus: NetworkAdapterStatus;
  status: NetworkStatus;
  lastFailure: string | null;
}): ReactorState {
  if (input.isDemoMode) return "demo";
  if (input.isScanning) return "scanning";
  if (input.lastFailure || input.status.scanState === "failed" || input.adapterStatus.mode === "scan-failed") return "error";
  if (input.adapterStatus.mode === "native-unavailable") return "unavailable";
  if (input.permissionDenied || input.permissionStatus?.location === "denied" || input.permissionStatus?.wifi === "denied") return "needs-permission";
  if (input.status.scanState === "complete" && input.status.devicesFound === 0) return "scan-empty";
  if (input.status.scanState === "complete" || input.status.devicesFound > 0) return "scan-complete";
  return "idle-ready";
}

function getRecommendedAction(input: {
  reactorState: ReactorState;
  devicesFound: number;
  needsReviewCount: number;
  adapterStatus: NetworkAdapterStatus;
  isDemoMode: boolean;
  permissionDenied: boolean;
}) {
  if (input.reactorState === "needs-permission" || input.permissionDenied) return "Grant Android Location/Nearby Wi-Fi permission, then run Balanced Scan.";
  if (input.reactorState === "demo") return "Demo mode is active. Switch Demo Mode off and use a physical Android device for live LAN discovery.";
  if (input.reactorState === "unavailable") return "Open Diagnostics and confirm the native Android discovery plugin is available.";
  if (input.reactorState === "error") return "Open Diagnostics, review the exact failure, then retry Balanced Scan.";
  if (input.needsReviewCount > 0) return "Review unknown or new devices before trusting the current network inventory.";
  if (input.devicesFound === 0) return "Run Balanced Scan. If still empty, try Deep Scan and keep the phone awake on Wi-Fi.";
  if (input.adapterStatus.mode !== "native-android" && !input.isDemoMode) return "Switch to a physical Android device for live LAN discovery.";
  return "Open the map or device list to review discovered hosts. Balanced Scan is the normal rescan path.";
}

function displayValue(value: string | null | undefined) {
  if (!value || value === "unknown" || value === "Unavailable") return "Unavailable";
  return value;
}

function formatAge(timestamp: string | null) {
  if (!timestamp) return "Never";
  const ms = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Unknown";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function HudGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function PanelTitle({ icon: Icon, label, color }: { icon: LucideIcon; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color, filter: `drop-shadow(0 0 5px ${color})` }} />
      <p className="font-mono text-[10px] uppercase tracking-[0.26em]" style={{ color }}>{label}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "muted",
  onClick,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "critical" | "muted";
  onClick?: () => void;
}) {
  const color = tone === "ok" ? "#39ff14" : tone === "warn" ? "#ff7a00" : tone === "critical" ? "#ff2d9c" : "#d1d5db";
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`min-h-[58px] rounded-lg border border-white/10 bg-black/50 p-2 text-left ${onClick ? "transition hover:border-cyan-300/60 hover:bg-cyan-300/10" : ""}`}
    >
      <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-1 break-words font-mono text-[11px] font-bold uppercase leading-tight" style={{ color }}>
        {value}
      </p>
    </Comp>
  );
}

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/42">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ReactorButton({
  label,
  icon: Icon,
  onClick,
  active = false,
  disabled = false,
  danger = false,
  warn = false,
  compact = false,
  title,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  warn?: boolean;
  compact?: boolean;
  title?: string;
}) {
  const color = danger ? "#ff2d9c" : warn ? "#ff7a00" : active ? "#39ff14" : "#00f0ff";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-45 ${compact ? "min-h-9 px-2 text-[9px]" : ""}`}
      style={{
        color,
        borderColor: `${color}66`,
        background: active ? `${color}1f` : "rgba(0,0,0,0.42)",
        boxShadow: active ? `0 0 14px ${color}44, inset 0 0 0 1px ${color}55` : `inset 0 0 0 1px ${color}22`,
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function CoreRing({ size, color, active, reverse }: { size: string; color: string; active: boolean; reverse: boolean }) {
  return (
    <div
      className={`absolute rounded-full ${active ? (reverse ? "animate-ps-spin-rev" : "animate-ps-spin-slow") : ""}`}
      style={{
        width: size,
        height: size,
        border: `1px solid ${color}44`,
        background: `conic-gradient(from 0deg, ${color}00 0deg, ${color} 10deg, ${color}00 30deg, ${color}00 92deg, ${color}99 108deg, ${color}00 132deg, ${color}00 210deg, ${color}77 228deg, ${color}00 250deg)`,
        boxShadow: `0 0 22px ${color}22`,
        maskImage: "radial-gradient(circle, transparent 58%, #000 59%)",
      }}
    />
  );
}

function OrbitalMetric({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: string | number;
  color: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-lg border bg-black/55 p-2 text-center ${onClick ? "transition hover:bg-white/10" : ""}`}
      style={{ borderColor: `${color}55` }}
    >
      <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-1 truncate font-mono text-[12px] font-black uppercase" style={{ color }}>{value}</p>
    </Comp>
  );
}

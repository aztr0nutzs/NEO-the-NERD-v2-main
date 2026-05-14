"use client";

import type { NetworkAction, NetworkSettings, NetworkStatus } from "@/lib/network/types";
import type { DiscoveredDevice } from "@/lib/network/types";

interface NerdControlPanelProps {
  networkStatus: NetworkStatus | null;
  devices: DiscoveredDevice[];
  isScanning: boolean;
  scanProgress: number;
  actions: NetworkAction[];
  settings: NetworkSettings | null;
  onOpenDevices?: () => void;
  onOpenQueue?: () => void;
  onOpenSecurity?: () => void;
  onOpenScan?: () => void;
}

export function NerdControlPanel({
  networkStatus,
  devices,
  isScanning,
  scanProgress,
  actions,
  settings,
  onOpenDevices,
  onOpenQueue,
  onOpenSecurity,
  onOpenScan,
}: NerdControlPanelProps) {
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const flaggedDevices = devices.filter((d) => d.trustLevel === "new" || d.trustLevel === "watch").length;
  const queuedActions = actions.filter((a) => a.status === "queued" || a.status === "running").length;
  const isSimulated = settings?.demoMode ?? true;
  const adapterMode = isSimulated ? "SIMULATED NETWORK DATA" : "REAL NETWORK DATA";
  const statusTone = isScanning ? "#b829ff" : flaggedDevices > 0 ? "#ff7a00" : "#39ff14";

  return (
    <div className="relative w-full overflow-hidden rounded-xl border-2 border-gray-700 bg-gradient-to-b from-gray-900 to-black">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-2 top-2 h-2 w-2 rounded-full border border-gray-600 bg-gray-800" />
        <div className="absolute right-2 top-2 h-2 w-2 rounded-full border border-gray-600 bg-gray-800" />
        <div className="absolute bottom-2 left-2 h-2 w-2 rounded-full border border-gray-600 bg-gray-800" />
        <div className="absolute bottom-2 right-2 h-2 w-2 rounded-full border border-gray-600 bg-gray-800" />
      </div>

      <div className="relative p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-center">
          <div className="relative">
            <h2
              className="font-mono text-2xl font-black tracking-wider sm:text-3xl"
              style={{
                color: "#7CFC00",
                textShadow: "0 0 20px rgba(124, 252, 0, 0.5), 0 0 40px rgba(124, 252, 0, 0.3)",
              }}
            >
              NERD
            </h2>
            <div className="absolute -inset-2 -z-10 rounded bg-gradient-to-b from-green-900/20 to-transparent" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <MetricCard
            label={isSimulated ? "SIMULATED DEVICES" : "ONLINE DEVICES"}
            value={isSimulated ? String(devices.length) : `${onlineDevices}/${devices.length}`}
            color="#00f0ff"
            detail={isSimulated ? "NOT A LIVE COUNT" : networkStatus?.networkName ?? "NETWORK UNKNOWN"}
            onClick={onOpenDevices}
          />

          <div className="flex flex-col items-center justify-between">
            <div className="relative flex h-24 w-24 items-center justify-center sm:h-32 sm:w-32">
              <div className="absolute inset-0 rounded-full border border-cyan-500/30" />
              <div className="absolute inset-2 rounded-full border border-purple-500/30" />
              <div className="absolute inset-4 rounded-full border border-cyan-500/20" />
              <div className="absolute inset-6 rounded-full border border-pink-500/20" />

              {isScanning && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.4) 30deg, rgba(168,85,247,0.3) 60deg, transparent 90deg)",
                    animation: "spin 3s linear infinite",
                  }}
                />
              )}

              <div
                className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-cyan-500/50 sm:h-16 sm:w-16"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(34,211,238,0.3) 0%, rgba(0,0,0,0.9) 70%)",
                  boxShadow: isScanning
                    ? "0 0 30px rgba(34,211,238,0.5), inset 0 0 20px rgba(34,211,238,0.3)"
                    : "0 0 15px rgba(34,211,238,0.2)",
                }}
              >
                <span
                  className="font-mono text-lg font-black text-cyan-400 sm:text-xl"
                  style={{ textShadow: "0 0 10px rgba(34,211,238,0.8)" }}
                >
                  N
                </span>
              </div>
            </div>

            <div className="mt-2 w-full rounded-lg border border-gray-700/50 bg-black/40 p-2">
              <div className="mb-1 flex justify-between font-mono text-[9px] font-bold tracking-wider text-gray-400 sm:text-[10px]">
                <span>SCAN PROGRESS</span>
                <span style={{ color: statusTone }}>{Math.round(scanProgress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${scanProgress}%`,
                    background: "linear-gradient(90deg, #00f0ff, #b829ff, #ff2d9c)",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <MetricCard
              label="FLAGGED DEVICES"
              value={String(flaggedDevices)}
              color={flaggedDevices > 0 ? "#ff7a00" : "#39ff14"}
              detail={`${networkStatus?.unknownDevices ?? 0} UNKNOWN`}
              onClick={onOpenSecurity}
            />
            <MetricCard
              label="QUEUED ACTIONS"
              value={String(queuedActions)}
              color={queuedActions > 0 ? "#b829ff" : "#00f0ff"}
              detail={adapterMode}
              onClick={onOpenQueue}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenScan}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-gray-700/50 bg-black/40 px-3 py-1.5 text-left"
        >
          <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-gray-500 sm:text-[9px]">
            ADAPTER STATUS
          </span>
          <span
            className="font-mono text-[9px] font-bold tracking-wider sm:text-[10px]"
            style={{
              color: statusTone,
              textShadow: `0 0 8px ${statusTone}80`,
            }}
          >
            {adapterMode} {"//"} {networkStatus?.scanState.toUpperCase() ?? "INITIALIZING"}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-wider text-gray-500">
            OPEN SCAN
          </span>
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  detail,
  onClick,
}: {
  label: string;
  value: string;
  color: string;
  detail: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-lg border border-gray-700/50 bg-black/40 p-2 text-left transition-transform duration-150 hover:scale-[1.01]">
      <h3 className="mb-2 font-mono text-[9px] font-bold tracking-wider text-cyan-400 sm:text-[10px]">
        {label}
      </h3>
      <p
        className="font-mono text-2xl font-black tracking-wider sm:text-3xl"
        style={{ color, textShadow: `0 0 12px ${color}80` }}
      >
        {value}
      </p>
      <p className="mt-1 truncate font-mono text-[7px] uppercase tracking-wider text-gray-500 sm:text-[8px]">
        {detail}
      </p>
    </button>
  );
}

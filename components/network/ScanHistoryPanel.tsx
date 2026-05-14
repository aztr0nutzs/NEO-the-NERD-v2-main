"use client";

import { Clock, Zap, Scale, Search, Monitor, Plus, Minus, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScanHistoryEntry, ScanMode } from "@/lib/network/types";

interface ScanHistoryPanelProps {
  history: ScanHistoryEntry[];
}

const MODE_CONFIG: Record<ScanMode, { icon: typeof Zap; label: string; color: string }> = {
  quick: { icon: Zap, label: "QUICK", color: "text-cyan-400" },
  balanced: { icon: Scale, label: "BALANCED", color: "text-purple-400" },
  deep: { icon: Search, label: "DEEP", color: "text-pink-400" },
};

export function ScanHistoryPanel({ history }: ScanHistoryPanelProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-cyan-500/30 bg-black/60 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-cyan-400">
              SCAN_HISTORY
            </h3>
          </div>
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 font-mono text-xs text-cyan-400">
            {history.length} SCANS
          </span>
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="mb-2 h-8 w-8 text-gray-600" />
              <p className="font-mono text-sm text-gray-500">NO_SCAN_HISTORY</p>
              <p className="mt-1 font-mono text-xs text-gray-600">
                Run a scan to see history
              </p>
            </div>
          ) : (
            history.map((entry, index) => {
              const modeConfig = MODE_CONFIG[entry.scanMode];
              const ModeIcon = modeConfig.icon;

              return (
                <div
                  key={entry.id}
                  className={`
                    rounded-lg border border-gray-800 bg-gray-900/30 p-3
                    transition-all duration-200 hover:border-gray-700
                    ${index === 0 ? "border-cyan-500/30 bg-cyan-500/5" : ""}
                  `}
                >
                  {/* Time and Mode */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-400">
                        {formatTime(entry.startedAt)}
                      </span>
                      {index === 0 && (
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400">
                          LATEST
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ModeIcon className={`h-3 w-3 ${modeConfig.color}`} />
                      <span className={`font-mono text-[10px] font-bold ${modeConfig.color}`}>
                        {modeConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <StatBadge
                      icon={Monitor}
                      value={entry.devicesFound}
                      label="FOUND"
                      color="text-cyan-400"
                    />
                    <StatBadge
                      icon={Plus}
                      value={entry.newDevices}
                      label="NEW"
                      color="text-emerald-400"
                      highlight={entry.newDevices > 0}
                    />
                    <StatBadge
                      icon={Minus}
                      value={entry.offlineDevices}
                      label="OFFLINE"
                      color="text-gray-400"
                    />
                    <StatBadge
                      icon={AlertTriangle}
                      value={entry.flaggedDevices}
                      label="FLAGGED"
                      color="text-orange-400"
                      highlight={entry.flaggedDevices > 0}
                    />
                  </div>

                  {/* Duration */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-gray-500">
                      Duration: {formatDuration(entry.durationMs)}
                    </span>
                    <span className="font-mono text-[10px] text-gray-600">
                      {new Date(entry.finishedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatBadge({
  icon: Icon,
  value,
  label,
  color,
  highlight,
}: {
  icon: typeof Monitor;
  value: number;
  label: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`
        flex flex-col items-center rounded p-1.5
        ${highlight ? "bg-yellow-500/10" : "bg-gray-800/30"}
      `}
    >
      <div className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className={`font-mono text-sm font-bold ${color}`}>{value}</span>
      </div>
      <span className="font-mono text-[8px] text-gray-500">{label}</span>
    </div>
  );
}

"use client";

import {
  Activity,
  Radar,
  Search,
  Edit3,
  Shield,
  Eye,
  Ban,
  Power,
  RefreshCcw,
  Wifi,
  Gauge,
  StickyNote,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NetworkAction, ActionType, ActionStatus } from "@/lib/network/types";

interface NetworkActionQueueProps {
  actions: NetworkAction[];
}

const ACTION_ICONS: Record<ActionType, typeof Radar> = {
  scan: Radar,
  identify: Search,
  rename: Edit3,
  trust: Shield,
  watch: Eye,
  block: Ban,
  wake: Power,
  router_reboot: RefreshCcw,
  toggle_guest: Wifi,
  toggle_qos: Gauge,
  note: StickyNote,
};

const STATUS_CONFIG: Record<
  ActionStatus,
  { icon: typeof CheckCircle; color: string; bgColor: string; label: string }
> = {
  queued: {
    icon: Clock,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    label: "QUEUED",
  },
  running: {
    icon: Loader2,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    label: "RUNNING",
  },
  success: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    label: "SUCCESS",
  },
  failed: {
    icon: XCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    label: "FAILED",
  },
};

export function NetworkActionQueue({ actions }: NetworkActionQueueProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-purple-500/30 bg-black/60 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-purple-400">
              ACTION_QUEUE
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {actions.filter((a) => a.status === "running").length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                RUNNING
              </span>
            )}
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 font-mono text-xs text-purple-400">
              {actions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Actions List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="mb-2 h-8 w-8 text-gray-600" />
              <p className="font-mono text-sm text-gray-500">NO_ACTIONS_QUEUED</p>
              <p className="mt-1 font-mono text-xs text-gray-600">
                Actions will appear here when triggered
              </p>
            </div>
          ) : (
            actions.map((action) => {
              const ActionIcon = ACTION_ICONS[action.type];
              const statusConfig = STATUS_CONFIG[action.status];
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={action.id}
                  className={`
                    rounded-lg border border-gray-800 bg-gray-900/30 p-3
                    transition-all duration-200
                    ${action.status === "running" ? "border-cyan-500/30 bg-cyan-500/5" : ""}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Action Icon */}
                    <div
                      className={`
                        flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                        ${statusConfig.bgColor}
                      `}
                    >
                      <ActionIcon className={`h-4 w-4 ${statusConfig.color}`} />
                    </div>

                    {/* Action Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-mono text-sm font-bold text-gray-200">
                          {action.label}
                        </h4>
                      </div>

                      <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                        {action.message}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={`
                            flex items-center gap-1 rounded px-1.5 py-0.5
                            font-mono text-[9px] font-bold
                            ${statusConfig.bgColor} ${statusConfig.color}
                          `}
                        >
                          <StatusIcon
                            className={`h-2.5 w-2.5 ${
                              action.status === "running" ? "animate-spin" : ""
                            }`}
                          />
                          {statusConfig.label}
                        </span>

                        {/* Timestamp */}
                        <span className="font-mono text-[10px] text-gray-500">
                          {formatTime(action.createdAt)}
                        </span>
                      </div>
                    </div>
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

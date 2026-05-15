"use client";

import { AlertTriangle, Bell, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NetworkAlert, NetworkMonitorState } from "@/lib/network/types";

interface NetworkAlertsPanelProps {
  alerts: NetworkAlert[];
  monitorState: NetworkMonitorState;
  onMarkAllRead: () => void;
  onClearRead: () => void;
}

export function NetworkAlertsPanel({
  alerts,
  monitorState,
  onMarkAllRead,
  onClearRead,
}: NetworkAlertsPanelProps) {
  const unreadAlerts = alerts.filter((alert) => alert.status === "unread");
  const latestCritical = alerts.find((alert) => alert.severity === "high" || alert.severity === "medium");
  const latest = latestCritical ?? alerts[0] ?? null;

  return (
    <section className="mb-6 rounded-lg border border-cyan-500/25 bg-black/55 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-cyan-300" />
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            ALERT_CENTER
          </h2>
          {unreadAlerts.length > 0 && (
            <span className="rounded-full bg-pink-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-pink-300">
              {unreadAlerts.length} UNREAD
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onMarkAllRead}
            disabled={!unreadAlerts.length}
            className="h-8 border border-cyan-500/30 bg-cyan-500/10 font-mono text-[10px] uppercase text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-40"
          >
            <CheckCheck className="mr-1.5 h-3 w-3" />
            READ
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onClearRead}
            disabled={!alerts.some((alert) => alert.status === "read")}
            className="h-8 border border-gray-700 bg-gray-900/60 font-mono text-[10px] uppercase text-gray-400 hover:bg-gray-800 disabled:opacity-40"
          >
            <Trash2 className="mr-1.5 h-3 w-3" />
            CLEAR
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
          {latest ? (
            <>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-300" />
                <p className="font-mono text-xs font-bold uppercase text-gray-200">{latest.title}</p>
              </div>
              <p className="mt-1 font-mono text-[11px] text-gray-400">{latest.message}</p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-gray-600">
                {new Date(latest.timestamp).toLocaleString()} / {latest.notificationStatus}
                {latest.notificationReason ? ` / ${latest.notificationReason}` : ""}
              </p>
            </>
          ) : (
            <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
              NO_RECENT_ALERTS
            </p>
          )}
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
            MONITOR_STATUS
          </p>
          <p className="mt-1 font-mono text-xs text-gray-300">
            {monitorState.schedulerStatus.toUpperCase()} / {monitorState.backgroundCapability}
          </p>
          <p className="mt-1 font-mono text-[10px] text-gray-500">
            Next run: {monitorState.nextRunAt ? new Date(monitorState.nextRunAt).toLocaleString() : "Not scheduled"}
          </p>
          <p className="mt-1 font-mono text-[10px] text-gray-500">
            Notifications: {monitorState.notificationCapability}
          </p>
        </div>
      </div>
    </section>
  );
}

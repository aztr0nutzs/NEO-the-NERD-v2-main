"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Filter,
  Map as MapIcon,
  Monitor,
  Router,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  DiscoveredDevice,
  InsightSeverity,
  NetworkEvent,
  NetworkEventType,
  ScanComparisonSummary,
} from "@/lib/network/types";

interface NetworkTimelinePanelProps {
  events: NetworkEvent[];
  devices: DiscoveredDevice[];
  lastScanDelta: ScanComparisonSummary | null;
  onSelectDevice: (device: DiscoveredDevice) => void;
  onOpenMap: () => void;
}

const TYPE_LABELS: Record<NetworkEventType, string> = {
  scan_started: "SCAN_STARTED",
  scan_completed: "SCAN_COMPLETED",
  device_first_seen: "FIRST_SEEN",
  device_returned: "RETURNED",
  device_went_offline: "OFFLINE",
  device_trust_changed: "TRUST_CHANGED",
  device_renamed: "RENAMED",
  device_flagged: "FLAGGED",
  router_status_changed: "ROUTER_CHANGED",
  scan_failed: "SCAN_FAILED",
  network_context_changed: "CONTEXT_CHANGED",
  speed_test_started: "SPEED_STARTED",
  speed_test_completed: "SPEED_COMPLETE",
  speed_test_failed: "SPEED_FAILED",
};

const SEVERITY_STYLES: Record<InsightSeverity, string> = {
  info: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  low: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  medium: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  high: "border-red-500/35 bg-red-500/10 text-red-300",
};

const EVENT_TYPES: Array<"all" | NetworkEventType> = [
  "all",
  "device_first_seen",
  "device_went_offline",
  "device_returned",
  "device_trust_changed",
  "device_renamed",
  "device_flagged",
  "scan_completed",
  "scan_failed",
];

const SEVERITIES: Array<"all" | InsightSeverity> = ["all", "info", "low", "medium", "high"];

export function NetworkTimelinePanel({
  events,
  devices,
  lastScanDelta,
  onSelectDevice,
  onOpenMap,
}: NetworkTimelinePanelProps) {
  const [typeFilter, setTypeFilter] = useState<"all" | NetworkEventType>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | InsightSeverity>("all");
  const deviceById = useMemo(() => new globalThis.Map(devices.map((device) => [device.id, device])), [devices]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (typeFilter !== "all" && event.type !== typeFilter) return false;
        if (severityFilter !== "all" && event.severity !== severityFilter) return false;
        return true;
      }),
    [events, severityFilter, typeFilter]
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-purple-500/30 bg-black/60 backdrop-blur-sm">
      <div className="border-b border-gray-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-300" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-purple-300">
              NETWORK_TIMELINE
            </h3>
          </div>
          <span className="rounded-full bg-purple-500/10 px-2 py-0.5 font-mono text-xs text-purple-300">
            {events.length} EVENTS
          </span>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-gray-500">
          Retains up to 500 events or 90 days, whichever limit is reached first.
        </p>
      </div>

      <div className="space-y-3 border-b border-gray-800 p-3">
        {lastScanDelta && (
          <div className="grid grid-cols-4 gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2">
            <DeltaStat label="NEW" value={lastScanDelta.newDeviceIds.length} />
            <DeltaStat label="OFFLINE" value={lastScanDelta.offlineDeviceIds.length} />
            <DeltaStat label="RETURNED" value={lastScanDelta.returnedDeviceIds.length} />
            <DeltaStat label="CHANGED" value={lastScanDelta.changedDeviceIds.length} />
          </div>
        )}

        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-gray-500">
          <Filter className="h-3.5 w-3.5" />
          FILTERS
        </div>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((type) => (
            <FilterChip
              key={type}
              label={type === "all" ? "ALL_TYPES" : TYPE_LABELS[type]}
              active={typeFilter === type}
              onClick={() => setTypeFilter(type)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {SEVERITIES.map((severity) => (
            <FilterChip
              key={severity}
              label={severity === "all" ? "ALL_SEVERITY" : severity.toUpperCase()}
              active={severityFilter === severity}
              onClick={() => setSeverityFilter(severity)}
            />
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ScanLine className="mb-2 h-8 w-8 text-gray-600" />
              <p className="font-mono text-sm text-gray-500">NO_TIMELINE_EVENTS</p>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const relatedDevice = event.relatedDeviceId ? deviceById.get(event.relatedDeviceId) : null;
              return (
                <article
                  key={event.id}
                  className={`rounded-lg border p-3 ${SEVERITY_STYLES[event.severity]}`}
                >
                  <div className="flex items-start gap-3">
                    <EventIcon type={event.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-mono text-sm font-bold text-gray-100">
                          {event.title}
                        </p>
                        <span className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[9px] uppercase text-gray-300">
                          {TYPE_LABELS[event.type]}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                        {event.sourceScanId ? ` / ${event.sourceScanId}` : ""}
                      </p>
                      <p className="mt-2 truncate font-mono text-[10px] text-gray-400">
                        {formatDetail(event.detail)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {relatedDevice && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onSelectDevice(relatedDevice)}
                        className="h-8 border border-cyan-500/40 bg-cyan-500/15 font-mono text-[10px] uppercase text-cyan-300 hover:bg-cyan-500/25"
                      >
                        <Monitor className="mr-1.5 h-3 w-3" />
                        DEVICE
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={onOpenMap}
                      className="h-8 border border-purple-500/40 bg-purple-500/15 font-mono text-[10px] uppercase text-purple-300 hover:bg-purple-500/25"
                    >
                      <MapIcon className="mr-1.5 h-3 w-3" />
                      MAP
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function EventIcon({ type }: { type: NetworkEventType }) {
  if (type.startsWith("router")) return <Router className="mt-0.5 h-4 w-4 shrink-0 text-purple-300" />;
  if (type === "scan_failed" || type === "device_flagged") {
    return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />;
  }
  if (type.startsWith("scan")) return <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />;
  return <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />;
}

function DeltaStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-black/35 p-2 text-center">
      <p className="font-mono text-sm font-bold text-cyan-300">{value}</p>
      <p className="font-mono text-[9px] text-gray-500">{label}</p>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider transition ${
        active
          ? "border-purple-400 bg-purple-500/20 text-purple-200"
          : "border-gray-700 bg-gray-900/50 text-gray-500 hover:border-gray-600 hover:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

function formatDetail(detail: NetworkEvent["detail"]) {
  return Object.entries(detail)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(",") : value}`)
    .join(" / ");
}

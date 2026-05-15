import type {
  DiscoveredDevice,
  NetworkAlert,
  NetworkEvent,
  NetworkMapFocusMode,
  NetworkMapNodeOperationalState,
  NetworkMapOverlayMode,
  ScanComparisonSummary,
} from "./types";

const SEVERITY_RANK = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
} as const;

const SEVERITY_COLORS = {
  info: "#22d3ee",
  low: "#39ff14",
  medium: "#facc15",
  high: "#f43f5e",
} as const;

const TRUST_COLORS = {
  trusted: "#22c55e",
  new: "#facc15",
  watch: "#fb923c",
  blocked: "#f43f5e",
} as const;

const CONFIDENCE_COLORS = {
  high: "#22c55e",
  medium: "#facc15",
  low: "#fb923c",
} as const;

interface BuildMapOperationalStateOptions {
  devices: DiscoveredDevice[];
  events: NetworkEvent[];
  alerts: NetworkAlert[];
  lastScanDelta: ScanComparisonSummary | null;
  overlayMode: NetworkMapOverlayMode;
  now?: Date;
}

export function buildMapOperationalState({
  devices,
  events,
  alerts,
  lastScanDelta,
  overlayMode,
  now = new Date(),
}: BuildMapOperationalStateOptions) {
  const recentEventCutoff = now.getTime() - 1000 * 60 * 60 * 24;
  const eventsByDevice = new Map<string, NetworkEvent[]>();

  events
    .filter((event) => event.relatedDeviceId && Date.parse(event.timestamp) >= recentEventCutoff)
    .forEach((event) => {
      const key = event.relatedDeviceId as string;
      eventsByDevice.set(key, [...(eventsByDevice.get(key) ?? []), event]);
    });

  const alertsByDevice = new Map<string, NetworkAlert[]>();
  alerts
    .filter((alert) => alert.relatedDeviceId && alert.status === "unread")
    .forEach((alert) => {
      const key = alert.relatedDeviceId as string;
      alertsByDevice.set(key, [...(alertsByDevice.get(key) ?? []), alert]);
    });

  return new Map(
    devices.map((device) => {
      const deviceEvents = eventsByDevice.get(device.id) ?? [];
      const deviceAlerts = alertsByDevice.get(device.id) ?? [];
      const isNew =
        device.isNewIdentity ||
        device.trustLevel === "new" ||
        lastScanDelta?.newDeviceIds.includes(device.id) ||
        deviceEvents.some((event) => event.type === "device_first_seen");
      const isReturned =
        lastScanDelta?.returnedDeviceIds.includes(device.id) ||
        deviceEvents.some((event) => event.type === "device_returned");
      const isTrustedOffline = device.trustLevel === "trusted" && device.status === "offline";
      const isWatchOrFlagged =
        device.trustLevel === "watch" ||
        device.trustLevel === "blocked" ||
        device.watchState ||
        device.requestedBlockState ||
        deviceEvents.some((event) => event.type === "device_flagged");
      const changedSinceLastScan = Boolean(
        lastScanDelta &&
          [
            ...lastScanDelta.newDeviceIds,
            ...lastScanDelta.offlineDeviceIds,
            ...lastScanDelta.returnedDeviceIds,
            ...lastScanDelta.changedDeviceIds,
            ...lastScanDelta.trustChangedDeviceIds,
          ].includes(device.id),
      );
      const alertSeverity = deviceAlerts.reduce<NetworkAlert["severity"] | null>((highest, alert) => {
        if (!highest) return alert.severity;
        return SEVERITY_RANK[alert.severity] > SEVERITY_RANK[highest] ? alert.severity : highest;
      }, null);
      const freshness = getFreshness(device.lastSeen, now);
      const latencyGrade = getLatencyGrade(device.latencyMs);
      const baseState: NetworkMapNodeOperationalState = {
        deviceId: device.id,
        isNew: Boolean(isNew),
        isReturned: Boolean(isReturned),
        isTrustedOffline,
        isWatchOrFlagged: Boolean(isWatchOrFlagged),
        hasRecentAlert: deviceAlerts.length > 0,
        changedSinceLastScan,
        alertSeverity,
        freshness,
        latencyGrade,
        discoveryConfidence: device.confidence,
        overlayColor: "#22d3ee",
        overlayLabel: "Operational",
        reasons: [],
      };

      const reasons = [
        baseState.hasRecentAlert ? `${alertSeverity?.toUpperCase() ?? "RECENT"} alert` : null,
        baseState.isNew ? "New device" : null,
        baseState.isReturned ? "Returned online" : null,
        baseState.isTrustedOffline ? "Trusted offline" : null,
        baseState.isWatchOrFlagged ? "Watch/flagged" : null,
        baseState.changedSinceLastScan ? "Changed since last scan" : null,
      ].filter(Boolean) as string[];

      return [
        device.id,
        {
          ...baseState,
          reasons,
          ...getOverlayPresentation(device, baseState, overlayMode),
        },
      ] as const;
    }),
  );
}

export function getFocusedDeviceIds(
  devices: DiscoveredDevice[],
  states: Map<string, NetworkMapNodeOperationalState>,
  focusMode: NetworkMapFocusMode,
) {
  if (focusMode === "all") return [];

  return devices
    .filter((device) => {
      const state = states.get(device.id);
      if (!state) return false;
      if (focusMode === "unknown") {
        return device.deviceType === "unknown" || device.trustLevel === "new" || device.isNewIdentity;
      }
      if (focusMode === "flagged") return state.isWatchOrFlagged || state.hasRecentAlert;
      if (focusMode === "offline-trusted") return state.isTrustedOffline;
      return state.changedSinceLastScan;
    })
    .map((device) => device.id);
}

function getOverlayPresentation(
  device: DiscoveredDevice,
  state: NetworkMapNodeOperationalState,
  overlayMode: NetworkMapOverlayMode,
) {
  if (overlayMode === "alert-severity") {
    return {
      overlayColor: state.alertSeverity ? SEVERITY_COLORS[state.alertSeverity] : "#475569",
      overlayLabel: state.alertSeverity ? `${state.alertSeverity.toUpperCase()} alert` : "No unread alert",
    };
  }

  if (overlayMode === "trust-state") {
    return {
      overlayColor: TRUST_COLORS[device.trustLevel],
      overlayLabel: device.requestedBlockState ? "Block requested" : device.trustLevel,
    };
  }

  if (overlayMode === "last-seen") {
    const colors = { fresh: "#22c55e", recent: "#facc15", stale: "#fb923c", unknown: "#64748b" };
    return {
      overlayColor: colors[state.freshness],
      overlayLabel: `Last seen ${state.freshness}`,
    };
  }

  if (overlayMode === "latency") {
    const colors = { good: "#22c55e", watch: "#facc15", degraded: "#f43f5e", unknown: "#64748b" };
    return {
      overlayColor: colors[state.latencyGrade],
      overlayLabel: device.latencyMs ? `${device.latencyMs}ms latency` : "Latency unavailable",
    };
  }

  if (overlayMode === "discovery-confidence") {
    return {
      overlayColor: CONFIDENCE_COLORS[device.confidence],
      overlayLabel: `${device.confidence} discovery confidence`,
    };
  }

  if (state.hasRecentAlert) return { overlayColor: SEVERITY_COLORS[state.alertSeverity ?? "medium"], overlayLabel: "Recent alert" };
  if (state.isTrustedOffline) return { overlayColor: "#f43f5e", overlayLabel: "Trusted offline" };
  if (state.isWatchOrFlagged) return { overlayColor: "#fb923c", overlayLabel: "Watch/flagged" };
  if (state.isNew) return { overlayColor: "#facc15", overlayLabel: "New device" };
  if (state.isReturned) return { overlayColor: "#39ff14", overlayLabel: "Returned online" };
  if (state.changedSinceLastScan) return { overlayColor: "#a855f7", overlayLabel: "Changed since last scan" };
  return { overlayColor: "#22d3ee", overlayLabel: "No recent change" };
}

function getFreshness(lastSeen: string, now: Date) {
  const lastSeenMs = Date.parse(lastSeen);
  if (!Number.isFinite(lastSeenMs)) return "unknown";
  const ageMinutes = (now.getTime() - lastSeenMs) / 60000;
  if (ageMinutes <= 15) return "fresh";
  if (ageMinutes <= 180) return "recent";
  return "stale";
}

function getLatencyGrade(latencyMs?: number) {
  if (!latencyMs || latencyMs <= 0) return "unknown";
  if (latencyMs <= 80) return "good";
  if (latencyMs <= 180) return "watch";
  return "degraded";
}

import type {
  NetworkAlert,
  NetworkAssistantContext,
  NetworkAssistantIntent,
  NetworkAssistantSnapshot,
  NetworkEvent,
  NetworkHealthSnapshot,
  NetworkMonitorState,
  ScanComparisonSummary,
} from "./types";

const NETWORK_INTENT_PATTERNS: Array<{ intent: NetworkAssistantIntent; patterns: RegExp[] }> = [
  {
    intent: "summarize-changes",
    patterns: [/\b(what changed|changed today|changes|what happened|last scan|during the last scan|went offline|offline devices?)\b/i],
  },
  {
    intent: "suspicious-device",
    patterns: [/\b(unknown|devices.*unknown|suspicious|untrusted|new device|review first|what should i review)\b/i],
  },
  {
    intent: "diagnose-slow-network",
    patterns: [/\b(slow|lag|latency|degraded|bad health|health score|why.*health|diagnose)\b/i],
  },
  {
    intent: "scan-status",
    patterns: [/\b(scan status|is scanning|scan running|scan complete|scan results)\b/i],
  },
  {
    intent: "device-identity-question",
    patterns: [/\b(what is this device|which device|label device|identify device|device identity)\b/i],
  },
  {
    intent: "monitoring-status",
    patterns: [/\b(auto scan|autoscan|monitoring|alerts|notifications|next run)\b/i],
  },
  {
    intent: "explain-network",
    patterns: [/\b(network|wifi|router|devices|health|timeline)\b/i],
  },
];

export function detectNetworkAssistantIntent(prompt: string): NetworkAssistantIntent | null {
  const normalized = prompt.trim();
  if (!normalized) return null;
  return NETWORK_INTENT_PATTERNS.find((entry) =>
    entry.patterns.some((pattern) => pattern.test(normalized))
  )?.intent ?? null;
}

export function buildNetworkAssistantContext({
  prompt,
  snapshot,
  events,
  latestScan,
  healthSnapshots,
  alerts,
  monitorState,
}: {
  prompt: string;
  snapshot: NetworkAssistantSnapshot | null;
  events: NetworkEvent[];
  latestScan: ScanComparisonSummary | null;
  healthSnapshots: NetworkHealthSnapshot[];
  alerts: NetworkAlert[];
  monitorState: NetworkMonitorState;
}): NetworkAssistantContext | null {
  const intent = detectNetworkAssistantIntent(prompt);
  if (!intent) return null;

  const devices = snapshot?.devices ?? [];
  const latestHealth = [...healthSnapshots].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    intent,
    status: snapshot?.status
      ? {
          networkName: snapshot.status.networkName,
          gatewayIp: snapshot.status.gatewayIp,
          localIp: snapshot.status.localIp,
          scanState: snapshot.status.scanState,
          devicesFound: snapshot.status.devicesFound,
          onlineDevices: snapshot.status.onlineDevices,
          unknownDevices: snapshot.status.unknownDevices,
          flaggedDevices: snapshot.status.flaggedDevices,
          lastScanAt: snapshot.status.lastScanAt,
        }
      : null,
    latestScan,
    health: latestHealth
      ? {
          score: latestHealth.score,
          grade: latestHealth.grade,
          headline: latestHealth.headline,
          trend: latestHealth.trend,
          topFactors: latestHealth.factors.slice(0, 3).map((factor) => `${factor.label}: ${factor.detail}`),
          diagnostics: latestHealth.diagnostics
            .slice(0, 5)
            .map((probe) => `${probe.label}: ${probe.status}${probe.latencyMs ? ` (${Math.round(probe.latencyMs)}ms)` : ""}`),
        }
      : null,
    unknownDevices: devices
      .filter((device) => device.trustLevel === "new" || device.deviceType === "unknown" || device.isNewIdentity)
      .slice(0, 6)
      .map(compactDevice),
    watchDevices: devices
      .filter((device) => device.trustLevel === "watch" || device.watchState || device.requestedBlockState)
      .slice(0, 6)
      .map(compactDevice),
    offlineDevices: devices
      .filter((device) => device.status === "offline")
      .slice(0, 6)
      .map(compactDevice),
    recentEvents: events.slice(0, 8).map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      severity: event.severity,
      title: event.title,
      relatedDeviceId: event.relatedDeviceId,
    })),
    alerts: alerts.slice(0, 5).map((alert) => ({
      id: alert.id,
      timestamp: alert.timestamp,
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      relatedDeviceId: alert.relatedDeviceId,
    })),
    router: snapshot?.routerStatus
      ? {
          name: snapshot.routerStatus.name,
          gatewayIp: snapshot.routerStatus.gatewayIp,
          controlMode: snapshot.routerControlMode,
          readOnlyMode: snapshot.routerStatus.readOnlyMode,
          capabilities: snapshot.routerCapabilities.slice(0, 6).map((capability) => ({
            key: capability.key,
            label: capability.label,
            status: capability.status,
            supported: capability.supported,
          })),
        }
      : null,
    monitoring: {
      enabled: monitorState.enabled,
      nextRunAt: monitorState.nextRunAt,
      schedulerStatus: monitorState.schedulerStatus,
      backgroundCapability: monitorState.backgroundCapability,
      notificationCapability: monitorState.notificationCapability,
    },
  };
}

export function answerNetworkQuestion(context: NetworkAssistantContext): string {
  const noData = "I do not have a current Network snapshot yet. Open the Network screen or run a scan so I can answer from real data.";
  if (!context.status) return noData;

  const statusLine = `${context.status.devicesFound} devices found, ${context.status.onlineDevices} online, ${context.status.unknownDevices} unknown, ${context.status.flaggedDevices} flagged.`;
  const healthLine = context.health
    ? `Health is ${context.health.score}/100 (${context.health.grade}): ${context.health.headline}.`
    : "No health score has been calculated yet.";

  switch (context.intent) {
    case "summarize-changes": {
      const scan = context.latestScan;
      const eventTitles = context.recentEvents.slice(0, 4).map((event) => event.title);
      if (!scan && !eventTitles.length) return `I do not have recorded network changes yet. ${statusLine}`;
      return [
        scan
          ? `Last scan delta: ${scan.newDeviceIds.length} new, ${scan.offlineDeviceIds.length} offline, ${scan.returnedDeviceIds.length} returned, ${scan.changedDeviceIds.length} changed.`
          : "No scan delta is stored yet.",
        eventTitles.length ? `Recent events: ${eventTitles.join("; ")}.` : "No recent event titles are stored.",
        "Open timeline for the full sequence.",
      ].join(" ");
    }
    case "suspicious-device": {
      const names = context.unknownDevices.map((device) => `${device.name} (${device.ipAddress})`);
      const watch = context.watchDevices.map((device) => `${device.name} (${device.ipAddress})`);
      if (!names.length && !watch.length) return `I do not see unknown or watch-list devices in the current snapshot. ${statusLine}`;
      return [
        names.length ? `Unknown/new devices: ${names.join(", ")}.` : "No unknown/new devices are listed.",
        watch.length ? `Watch devices: ${watch.join(", ")}.` : "",
        "Review the unknown devices first, then label or trust the ones you recognize.",
      ].filter(Boolean).join(" ");
    }
    case "diagnose-slow-network": {
      const factors = context.health?.topFactors ?? [];
      return [
        healthLine,
        factors.length ? `Top factors: ${factors.join("; ")}.` : "No negative health factors are currently recorded.",
        context.health?.diagnostics.length ? `Diagnostics: ${context.health.diagnostics.join("; ")}.` : "Run health diagnostics for gateway, DNS, and reachability probes.",
      ].join(" ");
    }
    case "scan-status":
      return `Scan state is ${context.status.scanState}. Last scan: ${context.status.lastScanAt ?? "not recorded"}. ${statusLine}`;
    case "device-identity-question": {
      const unknown = context.unknownDevices[0];
      if (!unknown) return "There is no unknown device at the top of the current Network snapshot.";
      return `First identity review target: ${unknown.name} at ${unknown.ipAddress}. It is typed as ${unknown.deviceType} with trust state ${unknown.trustLevel}. Open device details to label, trust, watch, or add notes.`;
    }
    case "monitoring-status":
      return `Monitoring is ${context.monitoring.enabled ? "enabled" : "disabled"}. Scheduler status: ${context.monitoring.schedulerStatus}. Next run: ${context.monitoring.nextRunAt ?? "not scheduled"}. Background mode: ${context.monitoring.backgroundCapability}. Notifications: ${context.monitoring.notificationCapability}.`;
    case "explain-network":
    default:
      return `${healthLine} Current snapshot: ${statusLine} Gateway ${context.status.gatewayIp}, local IP ${context.status.localIp}. ${context.recentEvents.length ? `Latest event: ${context.recentEvents[0].title}.` : "No recent event is recorded."}`;
  }
}

function compactDevice(device: NetworkAssistantSnapshot["devices"][number]) {
  return {
    id: device.id,
    name: device.name,
    ipAddress: device.ipAddress,
    deviceType: device.deviceType,
    trustLevel: device.trustLevel,
  };
}

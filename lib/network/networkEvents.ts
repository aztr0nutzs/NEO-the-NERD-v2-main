import type {
  DiscoveredDevice,
  NetworkEvent,
  NetworkEventType,
  NetworkStatus,
  RouterStatus,
  ScanComparisonSummary,
  ScanMode,
  InsightSeverity,
} from "./types";

export const NETWORK_EVENT_RETENTION_LIMIT = 500;
export const NETWORK_EVENT_RETENTION_DAYS = 90;

type EventDetail = NetworkEvent["detail"];

function eventId(type: NetworkEventType, timestamp: string) {
  return `evt-${timestamp.replace(/[^0-9]/g, "")}-${type}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createNetworkEvent({
  type,
  severity,
  title,
  detail,
  timestamp = new Date().toISOString(),
  relatedDeviceId,
  relatedRouterId,
  sourceScanId,
}: {
  type: NetworkEventType;
  severity: InsightSeverity;
  title: string;
  detail: EventDetail;
  timestamp?: string;
  relatedDeviceId?: string;
  relatedRouterId?: string;
  sourceScanId?: string;
}): NetworkEvent {
  return {
    id: eventId(type, timestamp),
    timestamp,
    type,
    severity,
    title,
    detail,
    relatedDeviceId,
    relatedRouterId,
    sourceScanId,
  };
}

export function retainNetworkEvents(events: NetworkEvent[], now = Date.now()) {
  const oldestAllowed = now - NETWORK_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  return [...events]
    .filter((event) => new Date(event.timestamp).getTime() >= oldestAllowed)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, NETWORK_EVENT_RETENTION_LIMIT);
}

export function appendNetworkEvents(current: NetworkEvent[], additions: NetworkEvent[]) {
  if (!additions.length) return retainNetworkEvents(current);
  return retainNetworkEvents([...additions, ...current]);
}

function deviceKey(device: DiscoveredDevice) {
  return device.identityKey ?? device.id;
}

function displayName(device: DiscoveredDevice) {
  return device.customName || device.name || device.hostname || device.ipAddress;
}

export function createScanStartedEvent(scanId: string, scanMode: ScanMode, timestamp = new Date().toISOString()) {
  return createNetworkEvent({
    type: "scan_started",
    severity: "info",
    title: `Scan started (${scanMode})`,
    timestamp,
    sourceScanId: scanId,
    detail: { scanId, scanMode },
  });
}

export function createScanFailedEvent(scanId: string, scanMode: ScanMode, errorMessage: string) {
  return createNetworkEvent({
    type: "scan_failed",
    severity: "high",
    title: "Network scan failed",
    sourceScanId: scanId,
    detail: { scanId, scanMode, errorMessage },
  });
}

export function compareScanDevices({
  previousDevices,
  currentDevices,
  scanId,
  timestamp = new Date().toISOString(),
}: {
  previousDevices: DiscoveredDevice[];
  currentDevices: DiscoveredDevice[];
  scanId: string;
  timestamp?: string;
}): { events: NetworkEvent[]; summary: ScanComparisonSummary } {
  const previousByKey = new Map(previousDevices.map((device) => [deviceKey(device), device]));
  const currentKeys = new Set(currentDevices.map(deviceKey));
  const events: NetworkEvent[] = [];
  const summary: ScanComparisonSummary = {
    scanId,
    generatedAt: timestamp,
    newDeviceIds: [],
    offlineDeviceIds: [],
    returnedDeviceIds: [],
    changedDeviceIds: [],
    labelChangedDeviceIds: [],
    statusChangedDeviceIds: [],
    trustChangedDeviceIds: [],
  };

  for (const device of currentDevices) {
    const key = deviceKey(device);
    const previous = previousByKey.get(key);

    if (!previous) {
      summary.newDeviceIds.push(device.id);
      events.push(
        createNetworkEvent({
          type: "device_first_seen",
          severity: device.trustLevel === "new" || device.deviceType === "unknown" ? "medium" : "info",
          title: `New device detected: ${displayName(device)}`,
          timestamp,
          relatedDeviceId: device.id,
          sourceScanId: scanId,
          detail: {
            ipAddress: device.ipAddress,
            macAddress: device.macAddress,
            vendor: device.vendor,
            identityConfidence: device.identityConfidence ?? device.identityMatchConfidence ?? "weak",
          },
        })
      );
      continue;
    }

    const changed = new Set<string>();

    if (previous.status !== device.status) {
      changed.add("status");
      summary.statusChangedDeviceIds.push(device.id);
      if (previous.status === "online" && device.status === "offline") {
        summary.offlineDeviceIds.push(device.id);
        events.push(
          createNetworkEvent({
            type: "device_went_offline",
            severity: "low",
            title: `${displayName(device)} went offline`,
            timestamp,
            relatedDeviceId: device.id,
            sourceScanId: scanId,
            detail: { previousStatus: previous.status, currentStatus: device.status, ipAddress: device.ipAddress },
          })
        );
      } else if (previous.status !== "online" && device.status === "online") {
        summary.returnedDeviceIds.push(device.id);
        events.push(
          createNetworkEvent({
            type: "device_returned",
            severity: "info",
            title: `${displayName(device)} returned online`,
            timestamp,
            relatedDeviceId: device.id,
            sourceScanId: scanId,
            detail: { previousStatus: previous.status, currentStatus: device.status, ipAddress: device.ipAddress },
          })
        );
      }
    }

    if (previous.trustLevel !== device.trustLevel || previous.trustedState !== device.trustedState) {
      changed.add("trust");
      summary.trustChangedDeviceIds.push(device.id);
      events.push(
        createNetworkEvent({
          type: "device_trust_changed",
          severity: device.trustLevel === "trusted" ? "info" : "medium",
          title: `Trust changed: ${displayName(device)}`,
          timestamp,
          relatedDeviceId: device.id,
          sourceScanId: scanId,
          detail: {
            previousTrust: previous.trustedState ?? previous.trustLevel,
            currentTrust: device.trustedState ?? device.trustLevel,
          },
        })
      );
    }

    if (previous.name !== device.name || previous.customName !== device.customName) {
      changed.add("label");
      summary.labelChangedDeviceIds.push(device.id);
      events.push(
        createNetworkEvent({
          type: "device_renamed",
          severity: "info",
          title: `Device label changed: ${displayName(device)}`,
          timestamp,
          relatedDeviceId: device.id,
          sourceScanId: scanId,
          detail: {
            previousName: previous.name,
            currentName: device.name,
            customName: device.customName ?? "",
          },
        })
      );
    }

    if (changed.size) {
      summary.changedDeviceIds.push(device.id);
    }
  }

  for (const previous of previousDevices) {
    if (currentKeys.has(deviceKey(previous))) continue;
    if (previous.status === "online") {
      summary.offlineDeviceIds.push(previous.id);
      summary.changedDeviceIds.push(previous.id);
      events.push(
        createNetworkEvent({
          type: "device_went_offline",
          severity: "low",
          title: `${displayName(previous)} missing from latest scan`,
          timestamp,
          relatedDeviceId: previous.id,
          sourceScanId: scanId,
          detail: { previousStatus: previous.status, currentStatus: "missing", ipAddress: previous.ipAddress },
        })
      );
    }
  }

  events.push(
    createNetworkEvent({
      type: "scan_completed",
      severity: summary.newDeviceIds.length || summary.offlineDeviceIds.length ? "low" : "info",
      title: `Scan completed: ${currentDevices.length} devices`,
      timestamp,
      sourceScanId: scanId,
      detail: {
        devicesFound: currentDevices.length,
        newDevices: summary.newDeviceIds.length,
        offlineDevices: summary.offlineDeviceIds.length,
        returnedDevices: summary.returnedDeviceIds.length,
        changedDevices: summary.changedDeviceIds.length,
      },
    })
  );

  return { events, summary };
}

export function createDeviceIdentityEvents({
  before,
  after,
  timestamp = new Date().toISOString(),
}: {
  before: DiscoveredDevice;
  after: DiscoveredDevice;
  timestamp?: string;
}) {
  const events: NetworkEvent[] = [];

  if (before.name !== after.name || before.customName !== after.customName) {
    events.push(
      createNetworkEvent({
        type: "device_renamed",
        severity: "info",
        title: `Device renamed: ${displayName(after)}`,
        timestamp,
        relatedDeviceId: after.id,
        detail: { previousName: before.name, currentName: after.name },
      })
    );
  }

  if (before.trustedState !== after.trustedState || before.trustLevel !== after.trustLevel) {
    events.push(
      createNetworkEvent({
        type: "device_trust_changed",
        severity: after.trustLevel === "trusted" ? "info" : "medium",
        title: `Trust updated: ${displayName(after)}`,
        timestamp,
        relatedDeviceId: after.id,
        detail: {
          previousTrust: before.trustedState ?? before.trustLevel,
          currentTrust: after.trustedState ?? after.trustLevel,
        },
      })
    );
  }

  if (after.watchState && !before.watchState) {
    events.push(
      createNetworkEvent({
        type: "device_flagged",
        severity: "medium",
        title: `Device flagged for watch: ${displayName(after)}`,
        timestamp,
        relatedDeviceId: after.id,
        detail: { reason: after.requestedBlockState ? "block requested" : "watch state enabled" },
      })
    );
  }

  return events;
}

export function compareNetworkContext(
  previous: NetworkStatus | null,
  current: NetworkStatus,
  timestamp = new Date().toISOString()
) {
  if (!previous) return [];
  const changed =
    previous.gatewayIp !== current.gatewayIp ||
    previous.localIp !== current.localIp ||
    previous.subnet !== current.subnet ||
    previous.networkName !== current.networkName;

  if (!changed) return [];

  return [
    createNetworkEvent({
      type: "network_context_changed",
      severity: "medium",
      title: "Network context changed",
      timestamp,
      detail: {
        previousNetwork: previous.networkName,
        currentNetwork: current.networkName,
        previousGateway: previous.gatewayIp,
        currentGateway: current.gatewayIp,
        previousLocalIp: previous.localIp,
        currentLocalIp: current.localIp,
      },
    }),
  ];
}

export function compareRouterStatus(previous: RouterStatus | null, current: RouterStatus) {
  if (!previous) return [];
  const changed =
    previous.connectionStatus !== current.connectionStatus ||
    previous.firmwareVersion !== current.firmwareVersion ||
    previous.firewallEnabled !== current.firewallEnabled ||
    previous.guestNetworkEnabled !== current.guestNetworkEnabled ||
    previous.qosEnabled !== current.qosEnabled;

  if (!changed) return [];

  return [
    createNetworkEvent({
      type: "router_status_changed",
      severity: previous.connectionStatus !== current.connectionStatus ? "medium" : "info",
      title: "Router status changed",
      relatedRouterId: current.gatewayIp,
      detail: {
        gatewayIp: current.gatewayIp,
        previousConnection: previous.connectionStatus,
        currentConnection: current.connectionStatus,
        firmwareVersion: current.firmwareVersion,
        guestNetworkEnabled: current.guestNetworkEnabled,
        qosEnabled: current.qosEnabled,
        firewallEnabled: current.firewallEnabled,
      },
    }),
  ];
}

export function selectEventsFromToday(events: NetworkEvent[], now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return events.filter((event) => new Date(event.timestamp) >= start);
}

export function selectRecentChanges(events: NetworkEvent[], limit = 25) {
  return events
    .filter((event) => event.type !== "scan_started")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function selectSuspiciousChanges(events: NetworkEvent[]) {
  return events.filter(
    (event) =>
      event.severity === "high" ||
      event.type === "device_first_seen" ||
      event.type === "device_flagged" ||
      event.type === "scan_failed" ||
      event.type === "network_context_changed"
  );
}

import type {
  DiscoveredDevice,
  NetworkAlert,
  NetworkEvent,
  NetworkNotificationCapability,
  NetworkSettings,
  ScanComparisonSummary,
} from "./types";

export async function getNetworkNotificationCapability(): Promise<NetworkNotificationCapability> {
  if (typeof window === "undefined") return "unsupported-platform";

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const permissions = await LocalNotifications.checkPermissions();
      if (permissions.display === "granted") return "available";
      if (permissions.display === "prompt" || permissions.display === "prompt-with-rationale") {
        return "permission-required";
      }
      return "unavailable";
    }
  } catch {
    return "unavailable";
  }

  if (!("Notification" in window)) return "unsupported-platform";
  if (Notification.permission === "granted") return "available";
  if (Notification.permission === "default") return "permission-required";
  return "unavailable";
}

export async function sendNetworkNotification({
  title,
  body,
}: {
  title: string;
  body: string;
}): Promise<{ status: "sent" | "in-app-only" | "failed"; reason?: string }> {
  const capability = await getNetworkNotificationCapability();
  if (capability !== "available") {
    return { status: "in-app-only", reason: capability };
  }

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 2147483647),
            title,
            body,
            schedule: { at: new Date(Date.now() + 250) },
          },
        ],
      });
      return { status: "sent" };
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
      return { status: "sent" };
    }
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : "notification failed" };
  }

  return { status: "in-app-only", reason: "unsupported-platform" };
}

export function buildAlertsForScanEvents({
  events,
  devices,
  settings,
  summary,
}: {
  events: NetworkEvent[];
  devices: DiscoveredDevice[];
  settings: NetworkSettings;
  summary: ScanComparisonSummary;
}) {
  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const alerts: Array<Omit<NetworkAlert, "notificationStatus" | "notificationReason">> = [];

  for (const event of events) {
    if (event.type === "device_first_seen" && settings.notifyNewDevices) {
      alerts.push({
        id: `alert-${event.id}`,
        eventId: event.id,
        timestamp: event.timestamp,
        title: "New device detected",
        message: event.title,
        severity: event.severity,
        status: "unread",
        relatedDeviceId: event.relatedDeviceId,
      });
    }

    if (event.type === "device_went_offline" && settings.notifyOfflineDevices && event.relatedDeviceId) {
      const device = deviceById.get(event.relatedDeviceId);
      const isTrusted = device?.trustLevel === "trusted" || device?.trustedState === "trusted";
      if (isTrusted) {
        alerts.push({
          id: `alert-${event.id}`,
          eventId: event.id,
          timestamp: event.timestamp,
          title: "Trusted device offline",
          message: event.title,
          severity: "medium",
          status: "unread",
          relatedDeviceId: event.relatedDeviceId,
        });
      }
    }

    if (event.type === "scan_failed") {
      alerts.push({
        id: `alert-${event.id}`,
        eventId: event.id,
        timestamp: event.timestamp,
        title: "Monitoring issue",
        message: event.title,
        severity: "high",
        status: "unread",
      });
    }
  }

  if (
    summary.newDeviceIds.length + summary.offlineDeviceIds.length + summary.returnedDeviceIds.length > 0 &&
    (settings.notifyNewDevices || settings.notifyOfflineDevices)
  ) {
    const scanEvent = events.find((event) => event.type === "scan_completed");
    if (scanEvent) {
      alerts.push({
        id: `alert-summary-${scanEvent.id}`,
        eventId: scanEvent.id,
        timestamp: scanEvent.timestamp,
        title: "Scan completed with changes",
        message: `${summary.newDeviceIds.length} new, ${summary.offlineDeviceIds.length} offline, ${summary.returnedDeviceIds.length} returned`,
        severity: "low",
        status: "unread",
      });
    }
  }

  return alerts;
}

export async function materializeNetworkAlerts(
  alerts: Array<Omit<NetworkAlert, "notificationStatus" | "notificationReason">>
): Promise<NetworkAlert[]> {
  const materialized: NetworkAlert[] = [];

  for (const alert of alerts) {
    const result = await sendNetworkNotification({ title: alert.title, body: alert.message });
    materialized.push({
      ...alert,
      notificationStatus: result.status,
      notificationReason: result.reason,
    });
  }

  return materialized;
}

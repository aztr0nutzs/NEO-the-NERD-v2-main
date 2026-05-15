import type { NetworkMonitorState, NetworkSettings } from "./types";

export function computeNextAutoScanAt(
  settings: Pick<NetworkSettings, "autoScanIntervalMinutes">,
  fromMs = Date.now()
) {
  return new Date(fromMs + Math.max(1, settings.autoScanIntervalMinutes) * 60_000).toISOString();
}

export function shouldRunAutoScan({
  settings,
  monitorState,
  isScanning,
  nowMs = Date.now(),
}: {
  settings: Pick<NetworkSettings, "autoScanEnabled">;
  monitorState: Pick<NetworkMonitorState, "nextRunAt">;
  isScanning: boolean;
  nowMs?: number;
}) {
  if (!settings.autoScanEnabled) return false;
  if (isScanning) return false;
  if (!monitorState.nextRunAt) return true;
  return nowMs >= new Date(monitorState.nextRunAt).getTime();
}

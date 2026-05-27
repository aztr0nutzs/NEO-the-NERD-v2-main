import type {
  DiscoveredDevice,
  NetworkAlert,
  NetworkAssistantSnapshot,
  NetworkEvent,
  NetworkHealthSnapshot,
  ScanComparisonSummary,
  SpeedTestResult,
} from "@/lib/network/types"
import { inferUploadState, uploadValueLabel } from "@/lib/network/speedTestSemantics"

export interface NetworkReportInput {
  generatedAt?: string
  snapshot: NetworkAssistantSnapshot | null
  devices?: DiscoveredDevice[]
  events: NetworkEvent[]
  alerts: NetworkAlert[]
  healthSnapshots: NetworkHealthSnapshot[]
  latestScan: ScanComparisonSummary | null
  adapterLabel?: string
  adapterIsDemo?: boolean
  speedTestHistory?: SpeedTestResult[]
}

export interface NetworkReportSection<T> {
  title: string
  description: string
  count: number
  items: T[]
}

export interface NetworkReportSummary {
  generatedAt: string
  adapterLabel: string
  adapterIsDemo: boolean
  networkName: string
  gatewayIp: string
  localIp: string
  devicesFound: number
  onlineDevices: number
  unknownDevices: number
  flaggedDevices: number
  lastScanAt: string | null
  latestHealth: NetworkHealthSnapshot | null
  latestSpeedTest: string | null
}

export interface DeviceRow {
  id: string
  name: string
  hostname: string
  ipAddress: string
  macAddress: string
  vendor: string
  deviceType: string
  status: string
  trustLevel: string
  firstSeen: string
  lastSeen: string
  openPorts: string
  notes: string
  ownerLabel: string
  room: string
  flagged: boolean
  newSinceLastScan: boolean
  offlineSinceLastScan: boolean
}

export interface EventRow {
  id: string
  timestamp: string
  type: string
  severity: string
  title: string
  relatedDeviceId: string
}

export interface AlertRow {
  id: string
  timestamp: string
  title: string
  severity: string
  status: string
  message: string
  relatedDeviceId: string
}

export interface SpeedTestRow {
  id: string
  startedAt: string
  completedAt: string
  provider: string
  downloadMbps: number
  uploadMbps: number | null
  uploadState: string
  uploadDisplay: string
  latencyMs: number
  jitterMs: number
  success: boolean
  failureReason: string
  uploadMeasured: boolean
  completeness: "partial-no-upload" | "full"
}

export interface HealthRow {
  id: string
  timestamp: string
  score: number
  grade: string
  headline: string
  trend: string
  topFactor: string
}

export interface NetworkReport {
  schema: "neo.network-report/v1"
  summary: NetworkReportSummary
  devices: NetworkReportSection<DeviceRow>
  flaggedDevices: NetworkReportSection<DeviceRow>
  events: NetworkReportSection<EventRow>
  alerts: NetworkReportSection<AlertRow>
  health: NetworkReportSection<HealthRow>
  speedTests: NetworkReportSection<SpeedTestRow>
}

function deviceRow(
  device: DiscoveredDevice,
  newIds: Set<string>,
  offlineIds: Set<string>,
): DeviceRow {
  return {
    id: device.id,
    name: device.customName || device.name || device.hostname || device.ipAddress,
    hostname: device.hostname ?? "",
    ipAddress: device.ipAddress ?? "",
    macAddress: device.macAddress ?? "",
    vendor: device.vendor ?? "",
    deviceType: device.deviceType ?? "unknown",
    status: device.status ?? "unknown",
    trustLevel: device.trustLevel ?? "unknown",
    firstSeen: device.firstSeen ?? "",
    lastSeen: device.lastSeen ?? "",
    openPorts: (device.openPorts ?? []).join(", "),
    notes: device.notes ?? "",
    ownerLabel: device.ownerLabel ?? "",
    room: device.room ?? "",
    flagged: device.trustLevel === "new" || device.deviceType === "unknown" || device.isNewIdentity === true,
    newSinceLastScan: newIds.has(device.id),
    offlineSinceLastScan: offlineIds.has(device.id),
  }
}

function selectLatestHealthSnapshot(
  healthSnapshots: NetworkHealthSnapshot[],
): NetworkHealthSnapshot | null {
  if (!healthSnapshots.length) return null
  return [...healthSnapshots].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0]
}

export function buildNetworkReport(input: NetworkReportInput): NetworkReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const snapshot = input.snapshot
  const devices = input.devices ?? snapshot?.devices ?? []
  const newIds = new Set(input.latestScan?.newDeviceIds ?? [])
  const offlineIds = new Set(input.latestScan?.offlineDeviceIds ?? [])
  const latestHealth = selectLatestHealthSnapshot(input.healthSnapshots)
  const speedTests = [...(input.speedTestHistory ?? [])]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  const latestSpeedTestRun = speedTests[0] ?? null
  const speedTestRows: SpeedTestRow[] = speedTests.slice(0, 30).map((run) => ({
    id: run.id,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    provider: run.provider,
    downloadMbps: Number(run.downloadMbps.toFixed(2)),
    uploadMbps: run.uploadMbps === null ? null : Number(run.uploadMbps.toFixed(2)),
    uploadState: inferUploadState(run),
    uploadDisplay: uploadValueLabel(run),
    latencyMs: Number(run.latencyMs.toFixed(2)),
    jitterMs: Number(run.jitterMs.toFixed(2)),
    success: run.success,
    failureReason: run.failureReason ?? "",
    uploadMeasured: run.uploadMeasured ?? run.uploadMbps !== null,
    completeness: run.completeness ?? (run.uploadMbps === null ? "partial-no-upload" : "full"),
  }))

  const deviceRows = devices.map((device) => deviceRow(device, newIds, offlineIds))
  const flaggedRows = deviceRows.filter((row) => row.flagged)

  const eventRows: EventRow[] = [...input.events]
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 100)
    .map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      severity: event.severity,
      title: event.title,
      relatedDeviceId: event.relatedDeviceId ?? "",
    }))

  const alertRows: AlertRow[] = [...input.alerts]
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .map((alert) => ({
      id: alert.id,
      timestamp: alert.timestamp,
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      message: alert.message ?? "",
      relatedDeviceId: alert.relatedDeviceId ?? "",
    }))

  const healthRows: HealthRow[] = [...input.healthSnapshots]
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 30)
    .map((snap) => ({
      id: snap.id,
      timestamp: snap.timestamp,
      score: snap.score,
      grade: snap.grade,
      headline: snap.headline,
      trend: snap.trend,
      topFactor: snap.factors[0]?.label ?? "",
    }))

  const status = snapshot?.status ?? null
  const summary: NetworkReportSummary = {
    generatedAt,
    adapterLabel: input.adapterLabel ?? "UNKNOWN_ADAPTER",
    adapterIsDemo: Boolean(input.adapterIsDemo),
    networkName: status?.networkName ?? "Unknown SSID",
    gatewayIp: status?.gatewayIp ?? "",
    localIp: status?.localIp ?? "",
    devicesFound: status?.devicesFound ?? deviceRows.length,
    onlineDevices:
      status?.onlineDevices ??
      deviceRows.filter((row) => row.status === "online").length,
    unknownDevices:
      status?.unknownDevices ?? deviceRows.filter((row) => row.flagged).length,
    flaggedDevices:
      status?.flaggedDevices ??
      deviceRows.filter((row) => row.trustLevel === "blocked").length,
    lastScanAt: status?.lastScanAt ?? null,
    latestHealth,
    // Prefer the standalone Speed Test run if one exists; fall back to the
    // diagnostics-derived value so older reports remain meaningful.
    latestSpeedTest: latestSpeedTestRun
      ? `down ${latestSpeedTestRun.downloadMbps.toFixed(2)} Mbps · ${
          latestSpeedTestRun.uploadMbps === null
            ? `up ${uploadValueLabel(latestSpeedTestRun).toLowerCase()}`
            : `up ${latestSpeedTestRun.uploadMbps.toFixed(2)} Mbps`
        } · lat ${Math.round(latestSpeedTestRun.latencyMs)}ms · ${latestSpeedTestRun.provider} · ${
          inferUploadState(latestSpeedTestRun) === "MEASURED"
            ? "FULL_TEST"
            : `PARTIAL_TEST_UPLOAD_${inferUploadState(latestSpeedTestRun).replace(/\s+/g, "_")}`
        }`
      : latestHealth?.diagnostics.find((probe) => probe.key === "throughput")?.value ?? null,
  }

  return {
    schema: "neo.network-report/v1",
    summary,
    devices: {
      title: "Devices",
      description: "All devices currently in the discovery set.",
      count: deviceRows.length,
      items: deviceRows,
    },
    flaggedDevices: {
      title: "Flagged devices",
      description: "Devices marked as new, unknown, or blocked.",
      count: flaggedRows.length,
      items: flaggedRows,
    },
    events: {
      title: "Recent events",
      description: "Up to 100 most recent network events.",
      count: eventRows.length,
      items: eventRows,
    },
    alerts: {
      title: "Alerts",
      description: "Network alerts captured during monitoring.",
      count: alertRows.length,
      items: alertRows,
    },
    health: {
      title: "Network health timeline",
      description: "Up to 30 most recent health snapshots.",
      count: healthRows.length,
      items: healthRows,
    },
    speedTests: {
      title: "Speed test history",
      description:
        "Up to 30 most recent throughput runs. download Mbps + latency/jitter are measured each run; upload is measured only when an upload POST endpoint is configured. completeness marks partial vs full tests.",
      count: speedTestRows.length,
      items: speedTestRows,
    },
  }
}

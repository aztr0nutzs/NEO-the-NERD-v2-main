import type {
  AlertRow,
  DeviceRow,
  EventRow,
  HealthRow,
  NetworkReport,
  NetworkReportSection,
} from "./network-report"

export type ExportFormat = "json" | "csv" | "text"

export interface SerializedReport {
  filename: string
  mime: string
  body: string
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const stringValue = String(value)
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function rowsToCsv(
  headers: string[],
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>,
) {
  const lines: string[] = [headers.map(escapeCsvCell).join(",")]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvCell(row[header])).join(","))
  }
  return lines.join("\n")
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

const DEVICE_HEADERS: Array<keyof DeviceRow> = [
  "id",
  "name",
  "hostname",
  "ipAddress",
  "macAddress",
  "vendor",
  "deviceType",
  "status",
  "trustLevel",
  "firstSeen",
  "lastSeen",
  "openPorts",
  "ownerLabel",
  "room",
  "notes",
  "flagged",
  "newSinceLastScan",
  "offlineSinceLastScan",
]

const EVENT_HEADERS: Array<keyof EventRow> = [
  "id",
  "timestamp",
  "type",
  "severity",
  "title",
  "relatedDeviceId",
]

const ALERT_HEADERS: Array<keyof AlertRow> = [
  "id",
  "timestamp",
  "title",
  "severity",
  "status",
  "message",
  "relatedDeviceId",
]

const HEALTH_HEADERS: Array<keyof HealthRow> = [
  "id",
  "timestamp",
  "score",
  "grade",
  "headline",
  "trend",
  "topFactor",
]

function multiCsv(report: NetworkReport): string {
  const summary = rowsToCsv(
    [
      "generatedAt",
      "adapterLabel",
      "adapterIsDemo",
      "networkName",
      "gatewayIp",
      "localIp",
      "devicesFound",
      "onlineDevices",
      "unknownDevices",
      "flaggedDevices",
      "lastScanAt",
    ],
    [
      {
        generatedAt: report.summary.generatedAt,
        adapterLabel: report.summary.adapterLabel,
        adapterIsDemo: report.summary.adapterIsDemo,
        networkName: report.summary.networkName,
        gatewayIp: report.summary.gatewayIp,
        localIp: report.summary.localIp,
        devicesFound: report.summary.devicesFound,
        onlineDevices: report.summary.onlineDevices,
        unknownDevices: report.summary.unknownDevices,
        flaggedDevices: report.summary.flaggedDevices,
        lastScanAt: report.summary.lastScanAt ?? "",
      },
    ],
  )

  const devices = rowsToCsv(DEVICE_HEADERS as string[], report.devices.items as unknown as Array<Record<string, unknown>>)
  const flagged = rowsToCsv(DEVICE_HEADERS as string[], report.flaggedDevices.items as unknown as Array<Record<string, unknown>>)
  const events = rowsToCsv(EVENT_HEADERS as string[], report.events.items as unknown as Array<Record<string, unknown>>)
  const alerts = rowsToCsv(ALERT_HEADERS as string[], report.alerts.items as unknown as Array<Record<string, unknown>>)
  const health = rowsToCsv(HEALTH_HEADERS as string[], report.health.items as unknown as Array<Record<string, unknown>>)

  return [
    "# NEO Network Report — CSV bundle",
    `# Schema: ${report.schema}`,
    "",
    "## summary",
    summary,
    "",
    `## devices (count=${report.devices.count})`,
    devices,
    "",
    `## flagged_devices (count=${report.flaggedDevices.count})`,
    flagged,
    "",
    `## events (count=${report.events.count})`,
    events,
    "",
    `## alerts (count=${report.alerts.count})`,
    alerts,
    "",
    `## health (count=${report.health.count})`,
    health,
    "",
  ].join("\n")
}

function fmtRows<T>(
  section: NetworkReportSection<T>,
  rowMapper: (row: T) => string,
): string {
  if (!section.count) return `  (none recorded)`
  return section.items.map((row, index) => `  ${index + 1}. ${rowMapper(row)}`).join("\n")
}

function renderTextReport(report: NetworkReport, aiSummary?: string): string {
  const s = report.summary
  const headlineSummary = aiSummary?.trim() || deterministicHeadline(report)

  const lines = [
    "════════════════════════════════════════════════════════",
    "  NEO THE NERD // NETWORK MISSION REPORT",
    "════════════════════════════════════════════════════════",
    "",
    `Generated:    ${s.generatedAt}`,
    `Adapter:      ${s.adapterLabel}${s.adapterIsDemo ? " (DEMO DATA)" : ""}`,
    `Network:      ${s.networkName}`,
    `Gateway IP:   ${s.gatewayIp || "—"}`,
    `Local IP:     ${s.localIp || "—"}`,
    `Last scan:    ${s.lastScanAt ?? "—"}`,
    "",
    "── Summary ────────────────────────────────────────────",
    `  Devices found:     ${s.devicesFound}`,
    `  Online devices:    ${s.onlineDevices}`,
    `  Unknown / flagged: ${s.unknownDevices}`,
    `  Blocked / quarantine: ${s.flaggedDevices}`,
    "",
    "── Mission summary ───────────────────────────────────",
    `  ${headlineSummary}`,
    "",
    "── Health snapshot ────────────────────────────────────",
  ]

  if (s.latestHealth) {
    lines.push(
      `  Score:    ${s.latestHealth.score}/100`,
      `  Grade:    ${s.latestHealth.grade}`,
      `  Trend:    ${s.latestHealth.trend}`,
      `  Headline: ${s.latestHealth.headline}`,
    )
  } else {
    lines.push("  (no health snapshot captured yet)")
  }

  lines.push(
    "",
    `── Devices (${report.devices.count}) ──────────────────────────────────────`,
    fmtRows(report.devices, (row) => {
      const r = row as DeviceRow
      return `${r.name} · ${r.ipAddress || "no IP"} · ${r.deviceType} · ${r.status} · trust=${r.trustLevel}`
    }),
    "",
    `── Flagged devices (${report.flaggedDevices.count}) ───────────────────────`,
    fmtRows(report.flaggedDevices, (row) => {
      const r = row as DeviceRow
      return `${r.name} · ${r.ipAddress || "no IP"} · trust=${r.trustLevel}${
        r.newSinceLastScan ? " · NEW" : ""
      }`
    }),
    "",
    `── Recent events (${report.events.count}) ─────────────────────────────`,
    fmtRows(report.events, (row) => {
      const r = row as EventRow
      return `[${r.timestamp}] ${r.severity.toUpperCase()} · ${r.title}`
    }),
    "",
    `── Alerts (${report.alerts.count}) ────────────────────────────────────`,
    fmtRows(report.alerts, (row) => {
      const r = row as AlertRow
      return `[${r.timestamp}] ${r.status.toUpperCase()} · ${r.title}`
    }),
    "",
    `── Health timeline (${report.health.count}) ───────────────────────────`,
    fmtRows(report.health, (row) => {
      const r = row as HealthRow
      return `[${r.timestamp}] ${r.score}/100 · ${r.grade} · ${r.trend}`
    }),
    "",
    "Report generated locally by NEO the NERD. No data left your device.",
    "════════════════════════════════════════════════════════",
  )

  return lines.join("\n")
}

function deterministicHeadline(report: NetworkReport): string {
  const summary = report.summary
  const flagged = report.flaggedDevices.count
  const offline = report.devices.items.filter((row) => row.offlineSinceLastScan).length
  const fresh = report.devices.items.filter((row) => row.newSinceLastScan).length

  const parts: string[] = []
  parts.push(`${summary.onlineDevices} of ${summary.devicesFound} devices currently online.`)
  if (fresh > 0) {
    parts.push(`${fresh} new arrival${fresh === 1 ? "" : "s"} since the last scan.`)
  }
  if (offline > 0) {
    parts.push(`${offline} device${offline === 1 ? "" : "s"} went offline.`)
  }
  if (flagged > 0) {
    parts.push(`${flagged} device${flagged === 1 ? "" : "s"} flagged for review.`)
  }
  if (summary.latestHealth) {
    parts.push(`Network health ${summary.latestHealth.score}/100 (${summary.latestHealth.grade}).`)
  }
  return parts.join(" ")
}

export function serializeReport(
  report: NetworkReport,
  format: ExportFormat,
  options: { aiSummary?: string } = {},
): SerializedReport {
  const ts = timestamp()
  if (format === "json") {
    return {
      filename: `neo-network-report-${ts}.json`,
      mime: "application/json",
      body: JSON.stringify({ ...report, aiSummary: options.aiSummary ?? null }, null, 2),
    }
  }
  if (format === "csv") {
    return {
      filename: `neo-network-report-${ts}.csv`,
      mime: "text/csv",
      body: multiCsv(report),
    }
  }
  return {
    filename: `neo-network-report-${ts}.txt`,
    mime: "text/plain",
    body: renderTextReport(report, options.aiSummary),
  }
}

export function serializeDeviceInventory(
  report: NetworkReport,
  format: ExportFormat,
): SerializedReport {
  const ts = timestamp()
  const inventory = report.devices.items.map((row) => ({
    id: row.id,
    name: row.name,
    ownerLabel: row.ownerLabel,
    room: row.room,
    trustLevel: row.trustLevel,
    deviceType: row.deviceType,
    macAddress: row.macAddress,
    ipAddress: row.ipAddress,
    vendor: row.vendor,
    notes: row.notes,
    firstSeen: row.firstSeen,
    lastSeen: row.lastSeen,
  }))

  if (format === "json") {
    return {
      filename: `neo-device-inventory-${ts}.json`,
      mime: "application/json",
      body: JSON.stringify(
        { schema: "neo.device-inventory/v1", generatedAt: report.summary.generatedAt, devices: inventory },
        null,
        2,
      ),
    }
  }
  if (format === "csv") {
    const headers = [
      "id",
      "name",
      "ownerLabel",
      "room",
      "trustLevel",
      "deviceType",
      "macAddress",
      "ipAddress",
      "vendor",
      "notes",
      "firstSeen",
      "lastSeen",
    ]
    return {
      filename: `neo-device-inventory-${ts}.csv`,
      mime: "text/csv",
      body: rowsToCsv(headers, inventory as unknown as Array<Record<string, unknown>>),
    }
  }
  return {
    filename: `neo-device-inventory-${ts}.txt`,
    mime: "text/plain",
    body: [
      `NEO THE NERD // DEVICE INVENTORY`,
      `Generated: ${report.summary.generatedAt}`,
      `Total devices: ${inventory.length}`,
      "",
      ...inventory.map(
        (row, index) =>
          `${index + 1}. ${row.name} (${row.deviceType}) — ${row.ipAddress || "no IP"} · trust=${row.trustLevel}${
            row.ownerLabel ? ` · owner=${row.ownerLabel}` : ""
          }${row.room ? ` · room=${row.room}` : ""}`,
      ),
    ].join("\n"),
  }
}

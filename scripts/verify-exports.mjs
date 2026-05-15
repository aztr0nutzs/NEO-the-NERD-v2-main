/**
 * Happy-path export test.
 *
 * Builds a NetworkReport from a representative snapshot fixture, then
 * serializes it as JSON, CSV, and text. Asserts that:
 *  - the JSON parses round-trip
 *  - the CSV has all expected section headers and at least one device row
 *  - the text report contains the cyberpunk banner and a device row
 *  - the device inventory exports each format without throwing
 *
 * Run with:
 *   node --experimental-strip-types scripts/verify-exports.mjs
 *
 * Exits non-zero if any assertion fails so it can be wired into CI.
 */

import assert from "node:assert/strict"

const { buildNetworkReport } = await import("../lib/exports/network-report.ts")
const { serializeReport, serializeDeviceInventory } = await import(
  "../lib/exports/formatters.ts"
)

const snapshot = {
  status: {
    networkName: "neo-test-lab",
    gatewayIp: "192.168.1.1",
    localIp: "192.168.1.42",
    subnet: "192.168.1.0/24",
    connectionType: "wifi",
    scanState: "idle",
    lastScanAt: "2026-05-15T05:00:00.000Z",
    devicesFound: 2,
    onlineDevices: 2,
    unknownDevices: 1,
    flaggedDevices: 0,
  },
  devices: [
    {
      id: "dev-1",
      name: "Living-Room TV",
      hostname: "living-room-tv.local",
      ipAddress: "192.168.1.50",
      macAddress: "AA:BB:CC:DD:EE:01",
      vendor: "Samsung",
      deviceType: "tv",
      status: "online",
      trustLevel: "trusted",
      firstSeen: "2026-04-01T00:00:00.000Z",
      lastSeen: "2026-05-15T05:00:00.000Z",
      openPorts: [80, 443],
      services: ["UPnP"],
      notes: "",
      discoverySources: ["arp"],
      confidence: "high",
      dataLimited: false,
      lastScanSource: "arp",
      ownerLabel: "Family",
      room: "Living Room",
      customName: "Living-Room TV",
    },
    {
      id: "dev-2",
      name: "Unknown ESP32",
      hostname: "esp-9f3a.local",
      ipAddress: "192.168.1.77",
      macAddress: "AA:BB:CC:DD:EE:02",
      vendor: "Espressif",
      deviceType: "unknown",
      status: "online",
      trustLevel: "new",
      firstSeen: "2026-05-15T04:55:00.000Z",
      lastSeen: "2026-05-15T05:00:00.000Z",
      openPorts: [],
      services: [],
      notes: "Appeared during latest scan",
      discoverySources: ["arp"],
      confidence: "medium",
      dataLimited: false,
      lastScanSource: "arp",
      isNewIdentity: true,
    },
  ],
  routerStatus: null,
  routerCapabilities: [],
  routerControlMode: "demo",
}

const report = buildNetworkReport({
  generatedAt: "2026-05-15T05:01:00.000Z",
  snapshot,
  events: [
    {
      id: "evt-1",
      timestamp: "2026-05-15T05:00:30.000Z",
      type: "device_added",
      severity: "info",
      relatedDeviceId: "dev-2",
      title: "New device joined the network",
      detail: {},
    },
  ],
  alerts: [
    {
      id: "alert-1",
      timestamp: "2026-05-15T05:00:31.000Z",
      eventId: "evt-1",
      title: "Unknown ESP32 detected",
      message: "Review and label this device.",
      severity: "warning",
      status: "unread",
      relatedDeviceId: "dev-2",
      notificationStatus: "in-app-only",
    },
  ],
  healthSnapshots: [
    {
      id: "health-1",
      timestamp: "2026-05-15T05:00:32.000Z",
      score: 88,
      grade: "Good",
      headline: "Network looks healthy with one unknown device.",
      factors: [
        { id: "f1", label: "Unknown device present", impact: -8, severity: "warning", detail: "" },
      ],
      diagnostics: [],
      trend: "stable",
      source: "scan",
    },
  ],
  latestScan: {
    scanId: "scan-1",
    generatedAt: "2026-05-15T05:00:00.000Z",
    newDeviceIds: ["dev-2"],
    offlineDeviceIds: [],
    returnedDeviceIds: [],
    changedDeviceIds: [],
    labelChangedDeviceIds: [],
    statusChangedDeviceIds: [],
    trustChangedDeviceIds: [],
  },
  adapterLabel: "TEST_FIXTURE",
  adapterIsDemo: false,
})

assert.equal(report.schema, "neo.network-report/v1")
assert.equal(report.devices.count, 2)
assert.equal(report.flaggedDevices.count, 1)
assert.equal(report.events.count, 1)
assert.equal(report.alerts.count, 1)
assert.equal(report.health.count, 1)
assert.equal(report.summary.networkName, "neo-test-lab")
assert.ok(report.devices.items[1].newSinceLastScan, "dev-2 should be marked new")

// JSON round-trip
const json = serializeReport(report, "json", { aiSummary: "Deterministic summary string." })
assert.ok(json.filename.endsWith(".json"))
const parsed = JSON.parse(json.body)
assert.equal(parsed.schema, "neo.network-report/v1")
assert.equal(parsed.aiSummary, "Deterministic summary string.")

// CSV sanity
const csv = serializeReport(report, "csv")
assert.ok(csv.body.includes("## summary"))
assert.ok(csv.body.includes("## devices"))
assert.ok(csv.body.includes("## flagged_devices"))
assert.ok(csv.body.includes("## events"))
assert.ok(csv.body.includes("Living-Room TV"))

// Text report sanity
const text = serializeReport(report, "text", { aiSummary: "All clear." })
assert.ok(text.body.includes("NETWORK MISSION REPORT"))
assert.ok(text.body.includes("Living-Room TV"))
assert.ok(text.body.includes("All clear."))

// Device inventory
const inventoryJson = serializeDeviceInventory(report, "json")
const invParsed = JSON.parse(inventoryJson.body)
assert.equal(invParsed.schema, "neo.device-inventory/v1")
assert.equal(invParsed.devices.length, 2)

const inventoryCsv = serializeDeviceInventory(report, "csv")
assert.ok(inventoryCsv.body.includes("ownerLabel"))
assert.ok(inventoryCsv.body.includes("Living-Room TV"))

const inventoryText = serializeDeviceInventory(report, "text")
assert.ok(inventoryText.body.includes("DEVICE INVENTORY"))

console.log(
  JSON.stringify(
    {
      ok: true,
      formats: ["json", "csv", "text"],
      reportSections: {
        devices: report.devices.count,
        flagged: report.flaggedDevices.count,
        events: report.events.count,
        alerts: report.alerts.count,
        health: report.health.count,
      },
      filenames: [json.filename, csv.filename, text.filename, inventoryJson.filename, inventoryCsv.filename, inventoryText.filename],
    },
    null,
    2,
  ),
)

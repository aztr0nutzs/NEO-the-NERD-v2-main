import type {
  DiagnosticProbeResult,
  DiscoveredDevice,
  NetworkAlert,
  NetworkEvent,
  NetworkHealthFactor,
  NetworkHealthGrade,
  NetworkHealthSnapshot,
  NetworkStatus,
  RouterStatus,
  ScanComparisonSummary,
} from "./types";

const HEALTH_HISTORY_LIMIT = 60;

function nowIso() {
  return new Date().toISOString();
}

function gradeForScore(score: number): NetworkHealthGrade {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Watch";
  if (score >= 40) return "Degraded";
  return "Critical";
}

function headlineForGrade(grade: NetworkHealthGrade) {
  if (grade === "Excellent") return "Network looks healthy";
  if (grade === "Good") return "Network is stable";
  if (grade === "Watch") return "Network deserves attention";
  if (grade === "Degraded") return "Network health is degraded";
  return "Network needs immediate review";
}

function factor(
  id: string,
  label: string,
  impact: number,
  severity: NetworkHealthFactor["severity"],
  detail: string
): NetworkHealthFactor {
  return { id, label, impact, severity, detail };
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function jitter(values: number[]) {
  if (values.length < 2) return null;
  const avg = average(values);
  if (avg === null) return null;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function recentEvents(events: NetworkEvent[], minutes: number) {
  const minTime = Date.now() - minutes * 60_000;
  return events.filter((event) => new Date(event.timestamp).getTime() >= minTime);
}

export function calculateNetworkHealth({
  status,
  routerStatus,
  devices,
  events,
  alerts,
  lastScanDelta,
  diagnostics = [],
  previousSnapshot,
  source = "scan",
  timestamp = nowIso(),
}: {
  status: NetworkStatus;
  routerStatus: RouterStatus | null;
  devices: DiscoveredDevice[];
  events: NetworkEvent[];
  alerts: NetworkAlert[];
  lastScanDelta: ScanComparisonSummary | null;
  diagnostics?: DiagnosticProbeResult[];
  previousSnapshot?: NetworkHealthSnapshot | null;
  source?: NetworkHealthSnapshot["source"];
  timestamp?: string;
}): NetworkHealthSnapshot {
  const factors: NetworkHealthFactor[] = [];
  const onlineDevices = devices.filter((device) => device.status === "online");
  const latencyValues = onlineDevices
    .map((device) => device.latencyMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const avgLatency = average(latencyValues);
  const unknownOrNew = devices.filter(
    (device) => device.trustLevel === "new" || device.deviceType === "unknown" || device.isNewIdentity
  );
  const offlineTrusted = devices.filter(
    (device) =>
      device.status === "offline" && (device.trustLevel === "trusted" || device.trustedState === "trusted")
  );
  const recent = recentEvents(events, 24 * 60);
  const recentScanFailures = recent.filter((event) => event.type === "scan_failed");
  const unreadAlerts = alerts.filter((alert) => alert.status === "unread");
  const highAlerts = unreadAlerts.filter((alert) => alert.severity === "high").length;
  const mediumAlerts = unreadAlerts.filter((alert) => alert.severity === "medium").length;
  const gatewayProbe = diagnostics.find((probe) => probe.key === "gateway");
  const internetProbe = diagnostics.find((probe) => probe.key === "internet");
  const dnsProbe = diagnostics.find((probe) => probe.key === "dns");

  if (routerStatus?.connectionStatus === "disconnected" || gatewayProbe?.status === "failed") {
    factors.push(factor("gateway", "Gateway reachability", 25, "high", "Gateway did not answer the latest probe."));
  } else if (gatewayProbe?.status === "passed" && typeof gatewayProbe.latencyMs === "number" && gatewayProbe.latencyMs > 100) {
    factors.push(factor("gateway-latency", "Gateway latency", 8, "medium", `Gateway probe took ${Math.round(gatewayProbe.latencyMs)}ms.`));
  }

  if (internetProbe?.status === "failed") {
    factors.push(factor("internet", "Internet reachability", 15, "medium", "Known-host reachability probe failed."));
  }

  if (dnsProbe?.status === "failed") {
    factors.push(factor("dns", "DNS resolution", 10, "medium", "DNS-over-HTTPS resolution probe failed."));
  }

  if (avgLatency !== null) {
    if (avgLatency > 250) {
      factors.push(factor("latency", "Average device latency", 20, "high", `Average local latency is ${Math.round(avgLatency)}ms.`));
    } else if (avgLatency > 100) {
      factors.push(factor("latency", "Average device latency", 10, "medium", `Average local latency is ${Math.round(avgLatency)}ms.`));
    }
  }

  if (unknownOrNew.length > 0) {
    factors.push(
      factor(
        "unknown-devices",
        "Unknown/new devices",
        Math.min(20, unknownOrNew.length * 5),
        unknownOrNew.length >= 3 ? "medium" : "low",
        `${unknownOrNew.length} device${unknownOrNew.length === 1 ? "" : "s"} need identity review.`
      )
    );
  }

  if (offlineTrusted.length > 0) {
    factors.push(
      factor(
        "offline-trusted",
        "Trusted devices offline",
        Math.min(20, offlineTrusted.length * 8),
        "medium",
        `${offlineTrusted.length} trusted device${offlineTrusted.length === 1 ? "" : "s"} are offline.`
      )
    );
  }

  if (recentScanFailures.length > 0) {
    factors.push(
      factor(
        "scan-failures",
        "Recent scan failures",
        Math.min(20, recentScanFailures.length * 10),
        "high",
        `${recentScanFailures.length} scan failure${recentScanFailures.length === 1 ? "" : "s"} in the last 24 hours.`
      )
    );
  }

  if (highAlerts > 0 || mediumAlerts > 0) {
    factors.push(
      factor(
        "alerts",
        "Recent alert severity",
        Math.min(25, highAlerts * 12 + mediumAlerts * 6),
        highAlerts > 0 ? "high" : "medium",
        `${highAlerts} high and ${mediumAlerts} medium unread alert${highAlerts + mediumAlerts === 1 ? "" : "s"}.`
      )
    );
  }

  if (lastScanDelta && lastScanDelta.changedDeviceIds.length > 0) {
    factors.push(
      factor(
        "last-scan-delta",
        "Latest scan changes",
        Math.min(10, lastScanDelta.changedDeviceIds.length * 2),
        "low",
        `${lastScanDelta.changedDeviceIds.length} changed device record${lastScanDelta.changedDeviceIds.length === 1 ? "" : "s"} in the latest scan.`
      )
    );
  }

  const score = Math.max(0, Math.min(100, 100 - factors.reduce((sum, item) => sum + item.impact, 0)));
  const grade = gradeForScore(score);
  const trend =
    !previousSnapshot
      ? "unknown"
      : score >= previousSnapshot.score + 5
        ? "improving"
        : score <= previousSnapshot.score - 5
          ? "declining"
          : "stable";

  return {
    id: `health-${timestamp.replace(/[^0-9]/g, "")}`,
    timestamp,
    score,
    grade,
    headline: headlineForGrade(grade),
    factors: factors.sort((a, b) => b.impact - a.impact),
    diagnostics,
    trend,
    source,
  };
}

async function timedFetch(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const started = performance.now();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    return { ok: true, latencyMs: performance.now() - started };
  } catch (error) {
    return {
      ok: false,
      latencyMs: performance.now() - started,
      error: error instanceof Error ? error.message : "probe failed",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

async function repeatedProbe(url: string, timeoutMs: number, count: number, init?: RequestInit) {
  const samples: number[] = [];
  let failures = 0;
  for (let index = 0; index < count; index += 1) {
    const result = await timedFetch(url, timeoutMs, init);
    if (result.ok) {
      samples.push(result.latencyMs);
    } else {
      failures += 1;
    }
  }
  return { samples, failures };
}

export async function runNetworkDiagnostics(status: NetworkStatus): Promise<DiagnosticProbeResult[]> {
  const measuredAt = nowIso();
  if (typeof window === "undefined") {
    return [
      {
        key: "throughput",
        label: "Throughput",
        status: "unavailable",
        detail: "Throughput testing is future/provider-backed; no fake speed value is generated.",
        measuredAt,
      },
    ];
  }

  const gatewayUrl = `http://${status.gatewayIp}`;
  const gateway = await repeatedProbe(gatewayUrl, 1800, 3, { mode: "no-cors" });
  const gatewayAverage = average(gateway.samples);
  const gatewayJitter = jitter(gateway.samples);
  const internet = await timedFetch("https://www.gstatic.com/generate_204", 2500, { mode: "no-cors" });
  const dns = await timedFetch("https://dns.google/resolve?name=example.com&type=A", 3000);

  return [
    {
      key: "gateway",
      label: "Gateway latency",
      status: gatewayAverage === null ? "failed" : "passed",
      latencyMs: gatewayAverage ?? undefined,
      samples: gateway.samples,
      detail:
        gatewayAverage === null
          ? "Gateway HTTP timing probe failed or was blocked by the runtime."
          : `Gateway responded to browser-safe timing probe in ${Math.round(gatewayAverage)}ms average.`,
      measuredAt,
    },
    {
      key: "internet",
      label: "Internet reachability",
      status: internet.ok ? "passed" : "failed",
      latencyMs: internet.latencyMs,
      detail: internet.ok
        ? "Known-host reachability probe completed."
        : `Known-host reachability failed: ${internet.error}`,
      measuredAt,
      provider: "https://www.gstatic.com/generate_204",
    },
    {
      key: "dns",
      label: "DNS resolution",
      status: dns.ok ? "passed" : "failed",
      latencyMs: dns.latencyMs,
      detail: dns.ok ? "DNS-over-HTTPS query for example.com completed." : `DNS probe failed: ${dns.error}`,
      measuredAt,
      provider: "https://dns.google/resolve",
    },
    {
      key: "jitter",
      label: "Gateway jitter estimate",
      status: gatewayJitter === null ? "unavailable" : "passed",
      value: gatewayJitter === null ? undefined : `${Math.round(gatewayJitter)}ms`,
      samples: gateway.samples,
      detail:
        gatewayJitter === null
          ? "Needs at least two successful gateway timing samples."
          : "Estimated from repeated gateway timing samples, not ICMP.",
      measuredAt,
    },
    {
      key: "packet-loss",
      label: "Probe failure approximation",
      status: gateway.samples.length + gateway.failures === 0 ? "unavailable" : "passed",
      value: `${Math.round((gateway.failures / Math.max(1, gateway.samples.length + gateway.failures)) * 100)}%`,
      detail: "Approximation from failed browser-safe gateway probes; not raw packet loss.",
      measuredAt,
    },
    {
      key: "throughput",
      label: "Throughput",
      status: "not-run",
      detail: "True speed testing requires a provider/server. No fake Mbps value is generated.",
      measuredAt,
    },
  ];
}

export function retainHealthSnapshots(snapshots: NetworkHealthSnapshot[]) {
  return [...snapshots]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, HEALTH_HISTORY_LIMIT);
}

export function selectLatestHealthSnapshot(snapshots: NetworkHealthSnapshot[]) {
  return retainHealthSnapshots(snapshots)[0] ?? null;
}

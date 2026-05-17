/**
 * Single source of truth for Speed Test grading + presentation constants.
 *
 * Both the Speed Test screen (verdict banner + strongest/weakest highlights)
 * and Mission Control (the LAST_RUN summary card) consume these so the
 * cross-surface presentation stays in sync. Adding a new metric, tightening
 * a threshold, or restyling an accent now happens in one place.
 *
 * Pure constants + helpers — no React, no JSX, no runtime imports beyond
 * the result type. Safe to import anywhere.
 */
import type { SpeedTestResult } from "./types"

// ---------------------------------------------------------------------------
// Palette — moved out of speed-test-screen.tsx so Mission Control and any
// future surface share the same neon accents. Add new entries here rather
// than hardcoding hex strings at the call site.
// ---------------------------------------------------------------------------

export const NEO_PALETTE = {
  cyan: "#00f0ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  yellow: "#ff7a00",
  purple: "#b829ff",
  text: "rgba(231,251,255,0.92)",
} as const

// ---------------------------------------------------------------------------
// Tier thresholds — every magic number in the verdict pipeline lives here.
// Lower-is-better metrics (latency, jitter) use `<=` boundaries; higher-is-
// better metrics (download, upload) use `>=` boundaries.
// ---------------------------------------------------------------------------

export const SPEED_TEST_THRESHOLDS = {
  download: { strong: 50, ok: 20 },
  latency: { strong: 35, ok: 80 },
  jitter: { strong: 8, ok: 25 },
  upload: { strong: 10, ok: 3 },
} as const

// Minimum absolute deltas before a chip / arrow indicates a "significant"
// change vs the prior run. Anything inside the noise floor is muted.
export const SPEED_TEST_SIGNIFICANCE = {
  downloadMbps: 0.5,
  latencyMs: 2,
  jitterMs: 2,
  uploadMbps: 0.5,
} as const

// ---------------------------------------------------------------------------
// Tier grading
// ---------------------------------------------------------------------------

export type MetricTier = "strong" | "ok" | "weak"

export function gradeDownload(mbps: number): MetricTier {
  if (mbps >= SPEED_TEST_THRESHOLDS.download.strong) return "strong"
  if (mbps >= SPEED_TEST_THRESHOLDS.download.ok) return "ok"
  return "weak"
}

export function gradeLatency(ms: number): MetricTier {
  if (ms <= SPEED_TEST_THRESHOLDS.latency.strong) return "strong"
  if (ms <= SPEED_TEST_THRESHOLDS.latency.ok) return "ok"
  return "weak"
}

export function gradeJitter(ms: number): MetricTier {
  if (ms <= SPEED_TEST_THRESHOLDS.jitter.strong) return "strong"
  if (ms <= SPEED_TEST_THRESHOLDS.jitter.ok) return "ok"
  return "weak"
}

/**
 * Grade the upload column. `null` means the run did not measure upload
 * (no endpoint configured / fetch failed) — reported as "weak" because
 * "no data" is materially worse than a slow-but-measured number for the
 * purposes of summary surfaces.
 */
export function gradeUpload(mbps: number | null): MetricTier {
  if (mbps === null) return "weak"
  if (mbps >= SPEED_TEST_THRESHOLDS.upload.strong) return "strong"
  if (mbps >= SPEED_TEST_THRESHOLDS.upload.ok) return "ok"
  return "weak"
}

// ---------------------------------------------------------------------------
// Cross-surface accent + verdict colors
// ---------------------------------------------------------------------------

/**
 * Combined verdict tier for a *successful* run. Used by the Speed Test
 * screen's verdict banner and Mission Control's LAST_RUN card so both
 * surfaces always read the same. Considers download AND latency — a fast
 * link with terrible latency reads "USABLE", not "EXCELLENT".
 */
export type VerdictTier = "excellent" | "good" | "usable" | "degraded" | "failed"

export function gradeVerdict(result: SpeedTestResult): VerdictTier {
  if (!result.success) return "failed"
  const dl = gradeDownload(result.downloadMbps)
  const lat = gradeLatency(result.latencyMs)
  if (dl === "strong" && lat === "strong") return "excellent"
  if (dl !== "weak" && lat !== "weak") return "good"
  if (dl !== "weak" || lat !== "weak") return "usable"
  return "degraded"
}

/**
 * Accent color used by Mission Control's LAST_RUN summary card. Pulls from
 * the same verdict tier as the Speed Test screen so the dashboard glance
 * never disagrees with the full result page.
 */
export function verdictAccentColor(result: SpeedTestResult | null): string {
  if (!result) return NEO_PALETTE.purple // "no probe yet" neutral tone
  switch (gradeVerdict(result)) {
    case "excellent":
      return NEO_PALETTE.green
    case "good":
      return NEO_PALETTE.cyan
    case "usable":
      return NEO_PALETTE.yellow
    case "degraded":
    case "failed":
    default:
      return NEO_PALETTE.pink
  }
}

/**
 * Accent color for a delta arrow. `goodDirection` indicates whether
 * higher-is-better; the helper inverts for lower-is-better metrics.
 */
export function deltaAccentColor(
  delta: number | null,
  significance: number,
  higherIsBetter: boolean,
  inactive: string = "rgba(255,255,255,0.55)",
): string {
  if (delta === null || Math.abs(delta) < significance) return inactive
  const positive = delta > 0
  const goodDirection = higherIsBetter ? positive : !positive
  return goodDirection ? NEO_PALETTE.green : NEO_PALETTE.pink
}

/**
 * Convenience: is a download delta significant enough to render?
 */
export function isDownloadDeltaSignificant(delta: number | null): boolean {
  return delta !== null && Math.abs(delta) > SPEED_TEST_SIGNIFICANCE.downloadMbps
}

/**
 * Convenience: is a latency delta significant enough to render?
 */
export function isLatencyDeltaSignificant(delta: number | null): boolean {
  return delta !== null && Math.abs(delta) > SPEED_TEST_SIGNIFICANCE.latencyMs
}
